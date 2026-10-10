// ============================================================================
// Admin portal configuration (`/admin-r`)
// ============================================================================
//
// The portal uses:
//   - Google Identity Services for sign-in (client ID + Gmail allowlist below).
//   - Cloudinary *signed* uploads. The Cloudinary API secret is never sent to
//     the browser: a tiny server function (running on Cloudflare Pages) verifies
//     the Google credential, then signs the upload / rename / manifest-write.
//   - A small JSON "manifest" (stored on Cloudinary as a raw asset) that records
//     each page's current artwork plus its archived versions. Replaced/deleted
//     images are MOVED to the `past-images/` folder (never deleted), so they can
//     be restored from the admin portal.
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
// 2) Cloudinary (https://console.cloudinary.com/ -> Settings -> API Keys):
//    - Copy the API key and API secret. Add them as Cloudflare Pages environment
//      variables (Settings -> Environment variables) named CLOUDINARY_API_KEY and
//      CLOUDINARY_API_SECRET. For local dev, put the same two values in a `.env`
//      file (never commit it).
//    - No upload presets are required. The `past-images/` archive folder is
//      created automatically the first time an image is archived.
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
//     IMPORTANT: keep the app in "Testing" or fill this list, otherwise any
//     Google account could request signed uploads.
// ============================================================================

/** Google OAuth Web Client ID from Google Cloud Console. */
export const GOOGLE_CLIENT_ID =
  "1000032286475-crtci669k5k7e98vnsdtnmknf645ujk5.apps.googleusercontent.com";

/**
 * Hard allowlist of Gmail addresses allowed into the admin portal.
 *
 * The server refuses any Google ID token whose email is not listed here, so
 * this is the final gate even if the OAuth consent screen is ever published
 * (or Google's "Testing" restriction changes). Keep this in sync with the
 * "Test users" list in Google Cloud Console while the app is in Testing mode.
 *
 * NOTE: Google still blocks token issuance while the consent screen is in
 * "Testing" unless the account is also listed as a Test user — both must agree.
 */
export const ADMIN_ALLOWLIST_EMAILS: string[] = [
  "contact.homeobd@gmail.com",
  "tawhidit3@gmail.com",
];

/** Cloudinary folder that archived (replaced/deleted) artwork is moved into. */
export const ADMIN_ARCHIVE_FOLDER = "past-images";

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
