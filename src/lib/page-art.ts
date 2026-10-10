import { BACK_COVER_ART, PAGE_ART_MAP, cloudinaryImage } from "@/config/cloudinary";

/**
 * Overrides layered on top of the static Cloudinary page map.
 *
 * Each page entry keeps the artwork that is currently visible plus an ordered
 * list of archived versions (newest first). The public ids in `history` point
 * at assets that were moved into the `past-images/` folder in Cloudinary, so
 * nothing is ever destroyed — only hidden from the book.
 *
 *   entries["42"] = { current: "42-page-abc", history: ["past-images/42/42-page-old"] }
 *   entries["7"]  = { current: null, history: ["past-images/7/07-article"] } // hidden
 *
 * Pages absent from `entries` use the static map as normal.
 */
export interface PageArtEntry {
  /** Public id shown in the book, or null when the page falls back to text. */
  current: string | null;
  /** Archived public ids (newest first) that can be restored. */
  history: string[];
}

export interface ArtManifest {
  version: number;
  entries: Record<string, PageArtEntry>;
}

export const ART_MANIFEST_VERSION = 2;
export const MAX_HISTORY_PER_PAGE = 30;
export const EMPTY_ART_MANIFEST: ArtManifest = { version: ART_MANIFEST_VERSION, entries: {} };

function normalizeEntry(value: unknown): PageArtEntry | null {
  // Legacy v1 shape: a bare public id string.
  if (typeof value === "string") return value ? { current: value, history: [] } : null;
  // Legacy v1 shape: null means "hidden".
  if (value === null) return { current: null, history: [] };
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const raw = value as { current?: unknown; history?: unknown };
  const current =
    raw.current === null
      ? null
      : typeof raw.current === "string" && raw.current.length > 0
        ? raw.current
        : null;
  const history = Array.isArray(raw.history)
    ? raw.history
        .filter((item): item is string => typeof item === "string" && item.length > 0)
        .slice(0, MAX_HISTORY_PER_PAGE)
    : [];
  return { current, history };
}

/** Defensive normaliser for data fetched from Cloudinary (handles v1 and v2). */
export function normalizeManifest(value: unknown): ArtManifest {
  if (!value || typeof value !== "object") return EMPTY_ART_MANIFEST;
  const raw = value as { entries?: unknown };
  const entries: Record<string, PageArtEntry> = {};
  if (raw.entries && typeof raw.entries === "object") {
    for (const [key, entry] of Object.entries(raw.entries as Record<string, unknown>)) {
      const normalized = normalizeEntry(entry);
      if (normalized) entries[key] = normalized;
    }
  }
  return { version: ART_MANIFEST_VERSION, entries };
}

/** The manifest entry for a page, if the admin has touched it. */
export function getEntry(
  manifest: ArtManifest | null | undefined,
  pageNumber: number,
): PageArtEntry | undefined {
  return manifest?.entries?.[String(pageNumber)];
}

/** The public id currently shown for a page (undefined when untouched or hidden). */
export function manifestPublicId(
  manifest: ArtManifest | null | undefined,
  pageNumber: number,
): string | undefined {
  const entry = getEntry(manifest, pageNumber);
  return typeof entry?.current === "string" ? entry.current : undefined;
}

/** Archived versions for a page (newest first). */
export function getHistory(manifest: ArtManifest | null | undefined, pageNumber: number): string[] {
  return getEntry(manifest, pageNumber)?.history ?? [];
}

/** True when the admin has explicitly removed the artwork for this page. */
export function isPageDeleted(
  manifest: ArtManifest | null | undefined,
  pageNumber: number,
): boolean {
  const entry = getEntry(manifest, pageNumber);
  return entry !== undefined && entry.current === null;
}

/** Returns a copy of the manifest with one page entry set (or removed when undefined). */
export function setPageEntry(
  manifest: ArtManifest,
  pageNumber: number,
  entry: PageArtEntry | undefined,
): ArtManifest {
  const entries = { ...manifest.entries };
  const key = String(pageNumber);
  if (entry === undefined) delete entries[key];
  else entries[key] = entry;
  return { version: ART_MANIFEST_VERSION, entries };
}

/** Builds a page entry, capping the history length. */
export function makeEntry(current: string | null, history: string[] = []): PageArtEntry {
  const deduped = history.filter((id, index) => history.indexOf(id) === index);
  return { current, history: deduped.slice(0, MAX_HISTORY_PER_PAGE) };
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
  if (entry) {
    if (entry.current === null) return undefined;
    return cloudinaryImage(entry.current, version);
  }
  if (pageNumber === totalPages) return BACK_COVER_ART;
  return PAGE_ART_MAP[pageNumber];
}
