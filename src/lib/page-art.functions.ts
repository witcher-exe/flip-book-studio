import { createServerFn } from "@tanstack/react-start";

import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_FOLDER } from "@/config/cloudinary";
import { PAGE_ART_MANIFEST_PUBLIC_ID } from "@/config/admin";
import { EMPTY_ART_MANIFEST, normalizeManifest, type ArtManifest } from "./page-art";

/**
 * Reads the page-art manifest from Cloudinary's raw storage.
 *
 * Runs as a GET server function so the browser never has to deal with CORS or
 * Cloudinary caching: the worker fetches fresh JSON on every call (falling back
 * to an empty manifest when nothing has been published yet).
 */
export const getPageArtManifest = createServerFn({ method: "GET" }).handler(
  async (): Promise<ArtManifest> => {
    const folder = CLOUDINARY_FOLDER ? `${CLOUDINARY_FOLDER}/` : "";
    const url = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/raw/upload/${folder}${PAGE_ART_MANIFEST_PUBLIC_ID}?t=${Date.now()}`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return EMPTY_ART_MANIFEST;
      const data: unknown = await res.json();
      return normalizeManifest(data);
    } catch {
      return EMPTY_ART_MANIFEST;
    }
  },
);
