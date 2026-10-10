// Cloudinary image delivery configuration.
//
// All flip-book imagery lives in Cloudinary (NOT in this repo / GitHub).
// The matching source files are kept in the `cloudinary-upload/` folder at the
// project root so they can be drag-and-dropped into the Cloudinary Media Library.
//
// Upload rules:
//   - Drop the files so their public_id (filename without extension) matches the
//     names below, e.g. `01-cover.webp` -> public_id `01-cover`.
//   - If you upload them inside a Cloudinary folder, set CLOUDINARY_FOLDER to
//     that folder name (e.g. "flipbook") so the URLs stay correct.
//
// The `src/config/cloudinary.ts` public-id map below is also used by the admin
// portal (`/admin-r`) so that replacing/deleting artwork targets the exact same
// Cloudinary asset the reader displays.

export const CLOUDINARY_CLOUD_NAME = "yvhu86jh";

/** Optional Cloudinary folder prefix. Leave "" when files sit at the media root. */
export const CLOUDINARY_FOLDER = "";

export const CLOUDINARY_IMAGE_BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/**
 * Builds a Cloudinary delivery URL for an image public_id.
 * `transform` is an optional delivery transformation prefix (e.g. "w_240,h_340,c_fill,q_auto").
 * `version` is the asset version returned by the upload API, used to fetch a
 * freshly replaced asset without waiting on CDN propagation.
 */
export function cloudinaryImageWith(transform: string, publicId: string, version?: number): string {
  const folder = CLOUDINARY_FOLDER ? `${CLOUDINARY_FOLDER}/` : "";
  const t = transform ? `${transform}/` : "";
  const v = version ? `v${version}/` : "";
  return `${CLOUDINARY_IMAGE_BASE}/${t}${v}${folder}${publicId}.webp`;
}

/** Full-size artwork URL for a public_id. */
export function cloudinaryImage(publicId: string, version?: number): string {
  return cloudinaryImageWith("", publicId, version);
}

/** Small grid thumbnail URL for a public_id. */
export function cloudinaryThumbnail(publicId: string, version?: number): string {
  return cloudinaryImageWith("w_240,h_340,c_fill,q_auto", publicId, version);
}

/** Front cover artwork public_id (page 1). */
export const FRONT_COVER_PUBLIC_ID = "01-cover";

/** Back cover artwork public_id (final page of the flip-book). */
export const BACK_COVER_PUBLIC_ID = "64-back-cover";

/** Page number -> Cloudinary public_id for the pages that ship with the magazine. */
export const PAGE_PUBLIC_IDS: Record<number, string> = {
  1: FRONT_COVER_PUBLIC_ID,
  2: "02-dr-samuel-hahnemann-materia-medica",
  3: "03-editorial-overview",
  4: "04-preface",
  5: "05-president-ziaur-rahman-message",
  6: "06-government-health-policy-homeopathy",
  7: "07-organon-magazine",
  8: "08-clinical-research-practice",
  9: "09-kids-health-part-1",
  10: "10-kids-health-part-2",
  11: "11-eight-personalities",
  12: "12-womens-health-part-1",
  13: "13-womens-health-part-2",
  14: "14-technology-and-homeopathy",
  15: "15-exercise-physical-wellness",
  16: "16-homeo-software-coming-soon",
  17: "17-article-part-2",
  18: "18-article-part-3",
  19: "19-article-part-4",
  20: "20-clinical-insights-audio-lecture",
  21: "21-history-of-homeopathy-part-1",
  22: "22-history-of-homeopathy-part-2",
  23: "23-professional-soft-skills-part-1",
  24: "24-professional-soft-skills-part-2",
  25: "25-patient-testimonials-part-1",
  26: "26-patient-testimonials-part-2",
  27: "27-world-homeopathy-day",
  28: "28-distinguished-doctors-feature-1",
  29: "29-distinguished-doctors-feature-2",
  30: "30-community-practice-highlights",
  31: "31-special-discount-clinical-offers",
  32: "32-clinical-case-series-part-1",
  33: "33-clinical-case-series-part-2",
  34: "34-clinical-case-series-part-3",
  35: "35-clinic-promotion-healthcare-services",
  36: "36-clinic-promotion-ultrasound-diagnostics",
  37: "37-clinic-promotion-consultation-services",
  38: "38-clinic-promotion-specialized-treatment",
  39: "39-clinic-promotion-family-wellness",
  40: "40-clinic-promotion-holistic-health-support",
  41: "41-clinic-promotion-appointments-contacts",
};

/** Page number -> Cloudinary artwork URL. */
export const PAGE_ART_MAP: Record<number, string> = Object.fromEntries(
  Object.entries(PAGE_PUBLIC_IDS).map(([pageNumber, publicId]) => [
    Number(pageNumber),
    cloudinaryImage(publicId),
  ]),
) as Record<number, string>;

/** Back cover artwork (final page of the flip-book). */
export const BACK_COVER_ART = cloudinaryImage(BACK_COVER_PUBLIC_ID);

/**
 * Default public_id used when admin uploads brand-new artwork to a page that
 * currently has none (e.g. pages 42-63). Keeps a predictable convention:
 * page 42 -> `42-page`.
 */
export function conventionalPublicId(pageNumber: number): string {
  return `${String(pageNumber).padStart(2, "0")}-page`;
}

/** The public_id the reader/admin should target for a given page number. */
export function publicIdForPage(pageNumber: number, totalPages: number): string {
  if (pageNumber === totalPages) return BACK_COVER_PUBLIC_ID;
  return PAGE_PUBLIC_IDS[pageNumber] ?? conventionalPublicId(pageNumber);
}

/** Reader shell background (light / dark). Also referenced from src/styles.css. */
export const MAGAZINE_BG = cloudinaryImage("magazine-bg");
export const MAGAZINE_BG_DARK = cloudinaryImage("magazine-bg-dark");

/** Page 11 "8 Personalities" gallery portraits. */
export const PERSON_IMAGES: string[] = [
  cloudinaryImage("11-personality-1"),
  cloudinaryImage("11-personality-2"),
  cloudinaryImage("11-personality-3"),
  cloudinaryImage("11-personality-4"),
  cloudinaryImage("11-personality-5"),
  cloudinaryImage("11-personality-6"),
  cloudinaryImage("11-personality-7"),
  cloudinaryImage("11-personality-8"),
];
