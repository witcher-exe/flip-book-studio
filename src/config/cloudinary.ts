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

export const CLOUDINARY_CLOUD_NAME = "yvhu86jh";

/** Optional Cloudinary folder prefix. Leave "" when files sit at the media root. */
export const CLOUDINARY_FOLDER = "";

function cloudinaryImage(publicId: string): string {
  const folder = CLOUDINARY_FOLDER ? `${CLOUDINARY_FOLDER}/` : "";
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${folder}${publicId}.webp`;
}

/** Page number -> Cloudinary artwork URL. */
export const PAGE_ART_MAP: Record<number, string> = {
  1: cloudinaryImage("01-cover"),
  2: cloudinaryImage("02-dr-samuel-hahnemann-materia-medica"),
  3: cloudinaryImage("03-editorial-overview"),
  4: cloudinaryImage("04-preface"),
  5: cloudinaryImage("05-president-ziaur-rahman-message"),
  6: cloudinaryImage("06-government-health-policy-homeopathy"),
  7: cloudinaryImage("07-organon-magazine"),
  8: cloudinaryImage("08-clinical-research-practice"),
  9: cloudinaryImage("09-kids-health-part-1"),
  10: cloudinaryImage("10-kids-health-part-2"),
  11: cloudinaryImage("11-eight-personalities"),
  12: cloudinaryImage("12-womens-health-part-1"),
  13: cloudinaryImage("13-womens-health-part-2"),
  14: cloudinaryImage("14-technology-and-homeopathy"),
  15: cloudinaryImage("15-exercise-physical-wellness"),
  16: cloudinaryImage("16-homeo-software-coming-soon"),
  17: cloudinaryImage("17-article-part-2"),
  18: cloudinaryImage("18-article-part-3"),
  19: cloudinaryImage("19-article-part-4"),
  20: cloudinaryImage("20-clinical-insights-audio-lecture"),
  21: cloudinaryImage("21-history-of-homeopathy-part-1"),
  22: cloudinaryImage("22-history-of-homeopathy-part-2"),
  23: cloudinaryImage("23-professional-soft-skills-part-1"),
  24: cloudinaryImage("24-professional-soft-skills-part-2"),
  25: cloudinaryImage("25-patient-testimonials-part-1"),
  26: cloudinaryImage("26-patient-testimonials-part-2"),
  27: cloudinaryImage("27-world-homeopathy-day"),
  28: cloudinaryImage("28-distinguished-doctors-feature-1"),
  29: cloudinaryImage("29-distinguished-doctors-feature-2"),
  30: cloudinaryImage("30-community-practice-highlights"),
  31: cloudinaryImage("31-special-discount-clinical-offers"),
  32: cloudinaryImage("32-clinical-case-series-part-1"),
  33: cloudinaryImage("33-clinical-case-series-part-2"),
  34: cloudinaryImage("34-clinical-case-series-part-3"),
  35: cloudinaryImage("35-clinic-promotion-healthcare-services"),
  36: cloudinaryImage("36-clinic-promotion-ultrasound-diagnostics"),
  37: cloudinaryImage("37-clinic-promotion-consultation-services"),
  38: cloudinaryImage("38-clinic-promotion-specialized-treatment"),
  39: cloudinaryImage("39-clinic-promotion-family-wellness"),
  40: cloudinaryImage("40-clinic-promotion-holistic-health-support"),
  41: cloudinaryImage("41-clinic-promotion-appointments-contacts"),
};

/** Back cover artwork (final page of the flip-book). */
export const BACK_COVER_ART = cloudinaryImage("64-back-cover");

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
