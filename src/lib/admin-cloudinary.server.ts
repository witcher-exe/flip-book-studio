// Server-only helpers for the admin portal. This module is imported lazily
// from inside createServerFn handlers so it can never end up in the client
// bundle. It holds the Cloudinary API secret (read from the environment) and
// must never be imported from client code.
import { getRequest } from "@tanstack/react-start/server";

import { GOOGLE_CLIENT_ID, PAGE_ART_MANIFEST_PUBLIC_ID, TOTAL_PAGES } from "@/config/admin";
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_FOLDER, publicIdForPage } from "@/config/cloudinary";
import { isEmailAllowed } from "./admin-session";
import { EMPTY_ART_MANIFEST, normalizeManifest, type ArtManifest } from "./page-art";

const UPLOAD_BASE = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}`;

function folderPrefix(): string {
  return CLOUDINARY_FOLDER ? `${CLOUDINARY_FOLDER}/` : "";
}

function deliveryBase(resourceType: "image" | "raw"): string {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload/${folderPrefix()}`;
}

function shortId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/* ------------------------------------------------------------------ */
/* Environment                                                         */
/* ------------------------------------------------------------------ */

function cloudflareEnv(): Record<string, unknown> | undefined {
  try {
    const request = getRequest() as unknown as {
      runtime?: { cloudflare?: { env?: Record<string, unknown> } };
    };
    const env = request.runtime?.cloudflare?.env;
    if (env) return env;
  } catch {
    /* not running inside a server function */
  }
  const globalEnv = (globalThis as { __env__?: Record<string, unknown> }).__env__;
  return globalEnv;
}

function readEnv(name: string): string | undefined {
  const cf = cloudflareEnv();
  const fromCf = cf?.[name];
  if (typeof fromCf === "string" && fromCf.length > 0) return fromCf;

  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const fromProc = proc?.env?.[name];
  if (fromProc) return fromProc;

  const fromImport = (import.meta as unknown as { env?: Record<string, unknown> }).env?.[name];
  if (typeof fromImport === "string" && fromImport.length > 0) return fromImport;

  return undefined;
}

function credentials(): { apiKey: string; apiSecret: string } {
  const apiKey = readEnv("CLOUDINARY_API_KEY");
  const apiSecret = readEnv("CLOUDINARY_API_SECRET");
  if (!apiKey || !apiSecret) {
    throw new Error(
      "Admin uploads are not configured. Set the CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET environment variables.",
    );
  }
  return { apiKey, apiSecret };
}

/* ------------------------------------------------------------------ */
/* Google credential verification                                      */
/* ------------------------------------------------------------------ */

interface VerifiedAdmin {
  email: string;
}

const tokenCache = new Map<string, { email: string; expiresAt: number }>();

/** Verifies a Google ID token server-side using Google's tokeninfo endpoint. */
export async function verifyAdmin(idToken: string): Promise<VerifiedAdmin> {
  if (typeof idToken !== "string" || idToken.length === 0) {
    throw new Error("Missing sign-in credential. Please sign in again.");
  }

  const cached = tokenCache.get(idToken);
  if (cached && cached.expiresAt > Date.now() + 5_000) return { email: cached.email };

  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    throw new Error("Your Google sign-in could not be verified. Please sign in again.");
  }

  const payload = (await res.json()) as {
    aud?: string;
    iss?: string;
    exp?: string;
    email?: string;
    email_verified?: string;
  };

  if (payload.aud !== GOOGLE_CLIENT_ID) {
    throw new Error("This sign-in was issued for a different application.");
  }
  if (!payload.iss || !/^https:\/\/accounts\.google\.com$/.test(payload.iss)) {
    throw new Error("Unexpected sign-in issuer.");
  }
  const expSeconds = Number(payload.exp);
  if (!Number.isFinite(expSeconds) || expSeconds * 1000 < Date.now()) {
    throw new Error("Your sign-in expired. Please sign in again.");
  }
  if (payload.email_verified === "false") {
    throw new Error("Please verify your Google email address first.");
  }
  const email = payload.email ?? "";
  if (!isEmailAllowed(email)) {
    throw new Error("This Google account is not on the admin allowlist.");
  }

  tokenCache.set(idToken, { email, expiresAt: expSeconds * 1000 });
  return { email };
}

/* ------------------------------------------------------------------ */
/* Cloudinary request signing                                          */
/* ------------------------------------------------------------------ */

async function sha1Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function signParams(params: Record<string, string>, apiSecret: string): Promise<string> {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return sha1Hex(toSign + apiSecret);
}

function cloudinaryError(body: string, fallback: string): Error {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    if (parsed.error?.message) return new Error(parsed.error.message);
  } catch {
    /* fall through */
  }
  return new Error(fallback);
}

function assertSafePublicId(publicId: string): void {
  if (
    !publicId ||
    publicId.length > 220 ||
    publicId.includes("..") ||
    publicId.includes("\\") ||
    publicId.startsWith("/")
  ) {
    throw new Error("Invalid image reference.");
  }
}

/* ------------------------------------------------------------------ */
/* Public id helpers                                                   */
/* ------------------------------------------------------------------ */

/** Fresh public id for a page's currently-visible artwork. */
export function currentUploadPublicId(pageNumber: number): string {
  return `${publicIdForPage(pageNumber, TOTAL_PAGES)}-${shortId()}`;
}

function sanitizeSegment(publicId: string): string {
  const last = publicId.split("/").pop() ?? publicId;
  return (
    last
      .replace(/[^a-z0-9-]/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .replace(/-[a-z0-9]{4,}$/i, "")
      .slice(0, 80) || "image"
  );
}

/** Destination public id inside the `past-images/<page>/` archive folder. */
function archivePublicId(pageNumber: number, sourceId: string): string {
  return `${folderPrefix()}past-images/${pageNumber}/${sanitizeSegment(sourceId)}-${shortId()}`;
}

/* ------------------------------------------------------------------ */
/* Cloudinary operations                                               */
/* ------------------------------------------------------------------ */

/** Returns the signature the browser needs to upload an image directly. */
export async function signImageUpload(publicId: string): Promise<{
  publicId: string;
  timestamp: number;
  apiKey: string;
  signature: string;
  cloudName: string;
}> {
  const { apiKey, apiSecret } = credentials();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await signParams(
    { public_id: publicId, timestamp: String(timestamp) },
    apiSecret,
  );
  return { publicId, timestamp, apiKey, signature, cloudName: CLOUDINARY_CLOUD_NAME };
}

async function renameAsset(fromPublicId: string, toPublicId: string): Promise<void> {
  assertSafePublicId(fromPublicId);
  assertSafePublicId(toPublicId);
  const { apiKey, apiSecret } = credentials();
  const timestamp = Math.floor(Date.now() / 1000);
  const params: Record<string, string> = {
    from_public_id: fromPublicId,
    to_public_id: toPublicId,
    timestamp: String(timestamp),
  };
  const signature = await signParams(params, apiSecret);

  const form = new FormData();
  for (const [key, value] of Object.entries(params)) form.append(key, value);
  form.append("api_key", apiKey);
  form.append("signature", signature);

  const res = await fetch(`${UPLOAD_BASE}/image/rename`, { method: "POST", body: form });
  if (!res.ok) {
    throw cloudinaryError(await res.text(), "Could not archive the previous image.");
  }
}

/** Reads the current manifest straight from Cloudinary (fresh copy). */
export async function readManifest(): Promise<ArtManifest> {
  const url = `${deliveryBase("raw")}${PAGE_ART_MANIFEST_PUBLIC_ID}?t=${Date.now()}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return EMPTY_ART_MANIFEST;
    return normalizeManifest((await res.json()) as unknown);
  } catch {
    return EMPTY_ART_MANIFEST;
  }
}

/** Overwrites the manifest raw asset (signed, so overwrite is allowed). */
export async function writeManifest(manifest: ArtManifest): Promise<void> {
  const { apiKey, apiSecret } = credentials();
  const normalized = normalizeManifest(manifest);
  const timestamp = Math.floor(Date.now() / 1000);
  const params: Record<string, string> = {
    public_id: PAGE_ART_MANIFEST_PUBLIC_ID,
    timestamp: String(timestamp),
    overwrite: "true",
    invalidate: "true",
  };
  const signature = await signParams(params, apiSecret);

  const blob = new Blob([JSON.stringify(normalized)], { type: "application/json" });
  const form = new FormData();
  form.append("file", blob, PAGE_ART_MANIFEST_PUBLIC_ID);
  for (const [key, value] of Object.entries(params)) form.append(key, value);
  form.append("api_key", apiKey);
  form.append("signature", signature);

  const res = await fetch(`${UPLOAD_BASE}/raw/upload`, { method: "POST", body: form });
  if (!res.ok) {
    throw cloudinaryError(await res.text(), "Could not save the artwork changes.");
  }
}

/**
 * Moves a page's current artwork into `past-images/<page>/`, returning the new
 * (archived) public id. Only an id that the manifest currently tracks for this
 * page may be archived, so callers cannot move arbitrary account assets.
 */
export async function archiveCurrentArtwork(pageNumber: number, publicId: string): Promise<string> {
  assertSafePublicId(publicId);
  const manifest = await readManifest();
  const entry = manifest.entries[String(pageNumber)];
  const staticId = publicIdForPage(pageNumber, TOTAL_PAGES);
  const tracked =
    publicId === staticId ||
    (entry && (entry.current === publicId || entry.history.includes(publicId)));
  if (!tracked) {
    throw new Error("That image is no longer the current artwork for this page.");
  }
  const destination = archivePublicId(pageNumber, publicId);
  await renameAsset(publicId, destination);
  return destination;
}

/**
 * Promotes an archived image back to the live book by copying it to a fresh
 * public id outside the archive folder. Returns the new current public id.
 */
export async function restoreArtwork(pageNumber: number, archivedId: string): Promise<string> {
  assertSafePublicId(archivedId);
  const manifest = await readManifest();
  const entry = manifest.entries[String(pageNumber)];
  if (!entry || !entry.history.includes(archivedId)) {
    throw new Error("That past image is no longer available to restore.");
  }
  const destination = currentUploadPublicId(pageNumber);
  await renameAsset(archivedId, destination);
  return destination;
}
