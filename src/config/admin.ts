// ============================================================================
// Admin portal configuration (`/admin-r`)
// ============================================================================
//
// This portal is fully serverless. It uses:
//   - Google Identity Services for sign-in (client ID + Gmail allowlist below).
//   - Cloudinary *unsigned* upload presets to upload/replace artwork directly
//     from the browser, and a small JSON "manifest" (also stored on Cloudinary)
//     to record added / deleted pages so the public book picks them up.
//
// ---------------------------------------------------------------------------
// ONE-TIME SETUP
// ---------------------------------------------------------------------------
// 1) Google Cloud Console (https://console.cloud.google.com/):
//    - APIs & Services -> Credentials -> Create Credentials -> OAuth client ID
//      -> Application type: "Web application".
//    - Authorized JavaScript origins: add every origin the admin portal runs on,
//      e.g. http://localhost:5173 and your production domain
//      (e.g. https://flip-book-studio.pages.dev).
//    - Copy the generated Client ID into GOOGLE_CLIENT_ID below.
//    - While the OAuth consent screen is in "Testing", add every beta tester
//      Gmail address as a "Test user", otherwise Google blocks their sign-in.
//
// 2) Cloudinary (https://console.cloudinary.com/ -> Settings -> Upload):
//    - Create an UNSIGNED upload preset named `flipbook-admin-images`:
//         Signing mode: Unsigned
//         "Use filename or externally defined Public ID": enabled
//         "Disallow uploads that overwrite existing assets": DISABLED
//    - Create an UNSIGNED upload preset named `flipbook-admin-raw`
//      (resource type RAW) with the same two options enabled.
//
// ---------------------------------------------------------------------------
// ADMIN ACCESS
// ---------------------------------------------------------------------------
// Access is controlled in one of two ways:
//   - Simple (default): leave ADMIN_ALLOWLIST_EMAILS empty and manage the beta
//     testers in Google Cloud Console -> Google Auth Platform -> Audience ->
//     Test users. Only those accounts can pass Google sign-in, and the portal
//     accepts whoever Google issues a token to.
//   - Strict: once the OAuth app is published, list the admin Gmails in
//     ADMIN_ALLOWLIST_EMAILS so the portal stays closed to everyone else.
// ============================================================================

/** Google OAuth Web Client ID from Google Cloud Console. */
export const GOOGLE_CLIENT_ID =
  "1000032286475-crtci669k5k7e98vnsdtnmknf645ujk5.apps.googleusercontent.com";

/**
 * Optional hard allowlist of Gmail addresses.
 *
 * Leave this EMPTY to let Google Cloud Console decide who may sign in:
 * while the OAuth consent screen is in "Testing", only the accounts listed
 * under Google Auth Platform -> Audience -> Test users can obtain a token,
 * and this portal accepts them automatically.
 *
 * Once you PUBLISH the OAuth app (consent screen -> Publish app), add the
 * admin Gmail addresses here so the portal stays locked to just those people.
 */
export const ADMIN_ALLOWLIST_EMAILS: string[] = [
  // "your.beta.tester@gmail.com",
];

/** Unsigned Cloudinary presets (see setup notes above). */
export const CLOUDINARY_UPLOAD_PRESET_IMAGES = "flipbook-admin-images";
export const CLOUDINARY_UPLOAD_PRESET_RAW = "flipbook-admin-raw";

/** Cloudinary raw public_id (with extension) holding the page-art manifest. */
export const PAGE_ART_MANIFEST_PUBLIC_ID = "page-art-manifest.json";

/** localStorage key for the cached admin session. */
export const ADMIN_SESSION_STORAGE_KEY = "flipbook-admin-session";

/** Total pages in the book (must match the reader's padding in magazine.functions.ts). */
export const TOTAL_PAGES = 64;

/** Pages shown as large tiles above the grid. */
export const COVER_PAGES: number[] = [1, TOTAL_PAGES];

/** Pages shown in the 16x4 grid (everything except the two covers). */
export const GRID_PAGES: number[] = Array.from({ length: TOTAL_PAGES - 2 }, (_, i) => i + 2);

/** True once a real Google client ID has been configured. */
export function isAdminConfigured(): boolean {
  return GOOGLE_CLIENT_ID.trim().length > 0;
}
