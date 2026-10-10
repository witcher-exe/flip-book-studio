import {
  ADMIN_ALLOWLIST_EMAILS,
  ADMIN_SESSION_STORAGE_KEY,
  GOOGLE_CLIENT_ID,
} from "@/config/admin";

export interface GoogleIdPayload {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  sub?: string;
  aud?: string;
  iss?: string;
  exp?: number;
  iat?: number;
  hd?: string;
}

export interface AdminSession {
  email: string;
  name: string;
  picture: string | null;
  sub: string | null;
  credential: string;
  signedInAt: number;
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Decodes the payload segment of a Google ID token (JWT). */
export function decodeGoogleCredential(credential: string): GoogleIdPayload | null {
  try {
    const payloadSegment = credential.split(".")[1];
    if (!payloadSegment) return null;
    return JSON.parse(base64UrlDecode(payloadSegment)) as GoogleIdPayload;
  } catch {
    return null;
  }
}

/** True when a hard allowlist is configured (otherwise Google Console gates access). */
export function isAllowlistEnforced(): boolean {
  return ADMIN_ALLOWLIST_EMAILS.some((email) => email.trim().length > 0);
}

export function isEmailAllowed(email: string | undefined): boolean {
  if (!email) return false;
  if (!isAllowlistEnforced()) return true;
  const normalized = email.trim().toLowerCase();
  return ADMIN_ALLOWLIST_EMAILS.some((allowed) => allowed.trim().toLowerCase() === normalized);
}

/**
 * Validates a Google ID token: audience, issuer, expiry and the beta-tester
 * Gmail allowlist. This is the same audience/issuer check Google recommends;
 * the token itself is issued and signed by Google Identity Services.
 */
export function validateCredential(
  credential: string,
): { ok: true; session: AdminSession } | { ok: false; reason: string } {
  const payload = decodeGoogleCredential(credential);
  if (!payload) return { ok: false, reason: "Could not read the Google credential." };

  if (payload.aud !== GOOGLE_CLIENT_ID) {
    return { ok: false, reason: "This Google credential was issued for a different app." };
  }
  if (!payload.iss || !/^https:\/\/accounts\.google\.com$/.test(payload.iss)) {
    return { ok: false, reason: "Unexpected credential issuer." };
  }
  if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
    return { ok: false, reason: "Your sign-in expired. Please sign in again." };
  }
  if (payload.email_verified === false) {
    return { ok: false, reason: "Please verify your Google email address first." };
  }
  if (!isEmailAllowed(payload.email)) {
    return {
      ok: false,
      reason: "This Google account is not on the admin allowlist. Ask an owner to add your email.",
    };
  }

  return {
    ok: true,
    session: {
      email: payload.email ?? "",
      name: payload.name ?? payload.email ?? "Admin",
      picture: payload.picture ?? null,
      sub: payload.sub ?? null,
      credential,
      signedInAt: Date.now(),
    },
  };
}

export function readAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminSession;
    if (!parsed?.credential || !isEmailAllowed(parsed.email)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeAdminSession(session: AdminSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
}
