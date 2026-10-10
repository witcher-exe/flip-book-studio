import { BACK_COVER_ART, PAGE_ART_MAP, cloudinaryImage } from "@/config/cloudinary";

/**
 * Overrides layered on top of the static Cloudinary page map.
 *
 *   entries["42"] = "42-page"  -> page 42 uses this public_id
 *   entries["7"]  = null       -> page 7 artwork is hidden (falls back to text)
 *
 * Pages absent from `entries` use the static map as normal.
 */
export interface ArtManifest {
  version: number;
  entries: Record<string, string | null>;
}

export const EMPTY_ART_MANIFEST: ArtManifest = { version: 1, entries: {} };

/** Defensive normaliser for data fetched from Cloudinary. */
export function normalizeManifest(value: unknown): ArtManifest {
  if (!value || typeof value !== "object") return EMPTY_ART_MANIFEST;
  const raw = value as { version?: unknown; entries?: unknown };
  const entries: Record<string, string | null> = {};
  if (raw.entries && typeof raw.entries === "object") {
    for (const [key, entry] of Object.entries(raw.entries as Record<string, unknown>)) {
      if (entry === null) entries[key] = null;
      else if (typeof entry === "string" && entry.length > 0) entries[key] = entry;
    }
  }
  return { version: typeof raw.version === "number" ? raw.version : 1, entries };
}

/** Returns a copy of the manifest with a single page entry set (or removed when undefined). */
export function withManifestEntry(
  manifest: ArtManifest,
  pageNumber: number,
  value: string | null | undefined,
): ArtManifest {
  const entries = { ...manifest.entries };
  const key = String(pageNumber);
  if (value === undefined) delete entries[key];
  else entries[key] = value;
  return { ...manifest, entries };
}

/** True when the admin has explicitly removed the artwork for this page. */
export function isPageDeleted(
  manifest: ArtManifest | null | undefined,
  pageNumber: number,
): boolean {
  return manifest?.entries?.[String(pageNumber)] === null;
}

/** The overridden public_id for a page, or undefined when the page is deleted. */
export function manifestPublicId(
  manifest: ArtManifest | null | undefined,
  pageNumber: number,
): string | undefined {
  const entry = manifest?.entries?.[String(pageNumber)];
  return typeof entry === "string" ? entry : undefined;
}

/**
 * Resolves the artwork URL the reader should display for a page, honouring
 * admin overrides (adds/deletes) before the static map.
 */
export function resolvePageArt(
  pageNumber: number,
  totalPages: number,
  manifest?: ArtManifest | null,
  version?: number,
): string | undefined {
  const entry = manifest?.entries?.[String(pageNumber)];
  if (entry === null) return undefined;
  if (typeof entry === "string") return cloudinaryImage(entry, version);
  if (pageNumber === totalPages) return BACK_COVER_ART;
  return PAGE_ART_MAP[pageNumber];
}
