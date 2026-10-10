# Admin Portal — Security Model & Setup

This document explains how `/admin-r` stays locked down and how to run it,
including the **future plan of record** for moving the Google sign-in to a
dedicated, throwaway Google Cloud account.

---

## Current state (as of this commit)

- **Hosting:** Cloudflare Pages (no separate backend server). All security-
  critical code runs as serverless functions in `dist/_worker.js` at the edge.
- **Sign-in:** Google Identity Services (one-tap/button) → ID token.
  - Client-side decode is only cosmetic.
  - Every mutating server function re-verifies the token on the worker via
    `https://oauth2.googleapis.com/tokeninfo?id_token=...`, checking
    `aud`, `iss`, `exp`, `email_verified`, then the hard allowlist below.
- **Allowlist (`src/config/admin.ts` → `ADMIN_ALLOWLIST_EMAILS`):**
  - `contact.homeobd@gmail.com`
  - `tawhidit3@gmail.com`
  - `muhitranahomeo@gmail.com`
  - The server rejects any token not in this list — the final gate even if
    Google's "Testing" mode ever changes.
- **Cloudinary:** signed uploads only. The API secret lives in
  `CLOUDINARY_API_SECRET` (Cloudflare Pages env var / local `.env`), is read
  server-side only, and never ships to the browser or into git (`.env` is
  untracked + gitignored).
- **Nothing is ever deleted in Cloudinary.** Replace/delete moves artwork into
  `past-images/<page>/`; the manifest (`page-art-manifest.json`, raw asset)
  records `{ current, history }` per page and powers the read-archive list in
  the lightbox. Upload public ids are generated server-side (clients cannot
  choose what to overwrite), and archive/restore only touch assets the
  manifest tracks for that page.

### Env vars required

| Variable                | Where                               | Purpose              |
| ----------------------- | ----------------------------------- | -------------------- |
| `CLOUDINARY_API_KEY`    | Cloudflare Pages env + local `.env` | Sign uploads         |
| `CLOUDINARY_API_SECRET` | Cloudflare Pages env + local `.env` | Sign uploads/renames |

The Google Client ID and the admin allowlist are compiled into
`src/config/admin.ts` (no runtime env needed).

---

## Two-layer access control (how a stranger is kept out)

1. **Google "Testing" mode (layer 1, at Google):** while the OAuth consent
   screen is in Testing, only accounts listed under
   _Google Cloud Console → Google Auth Platform → Audience → Test users_ can
   obtain a token at all. Everyone else is blocked at Google before any of
   our code runs.
2. **App allowlist (layer 2, in our code):** even with a valid token, the
   worker verifies the email is in `ADMIN_ALLOWLIST_EMAILS`.

Both layers must agree: a beta tester needs BOTH to be a Google Test user AND
to be in the app allowlist. If one layer is ever loosened (e.g. app
published), the other still holds.

---

## Setup / maintenance checklist

- Add/remove a beta tester in **both** places:
  1. Google Cloud Console → OAuth consent screen → **Test users**.
  2. `src/config/admin.ts` → `ADMIN_ALLOWLIST_EMAILS`.
- Test users are capped at **100 per OAuth app** by Google.
- Keep the consent screen in **Testing** forever — no sensitive scopes are
  used, so there is no need to publish or verify.
- Redploy after config changes (`npm run deploy` or push → Pages auto-rebuild).

---

## Future plan of record (do when convenient)

Goal: isolate the auth app from the day-to-day Google account and remove all
dependence on "Testing mode lasts forever".

**Phase 1 — define (at Google, manual):**

1. Create a dedicated Google account for this app (2FA + recovery set up).
2. _Google Cloud Console → New Project_ in that account.
3. _APIs & Services → OAuth consent screen_: type **External**, scopes
   `email` + `profile`, **Testing** mode, add the admin Gmails as
   **Test users**.
4. _Credentials → Create Credentials → OAuth client ID → Web application_.
   Authorized JavaScript origins:
   - `http://localhost:5173`
   - `https://flip-book-studio.pages.dev` (exact production domain)
5. Copy the new **Client ID**.

**Phase 2 — apply (code):** 6. Replace `GOOGLE_CLIENT_ID` in `src/config/admin.ts` with the new ID
(old ID → `aud` mismatch → sign-ins rejected, which is the safe failure). 7. Keep `ADMIN_ALLOWLIST_EMAILS` as-is (same Gmails). 8. prettier → `tsc --noEmit` → eslint → `npm run build` → commit & push.

**Phase 3 — optional hardening (later):** 9. Add a lightweight per-account rate limiter on `signAdminUpload`,
`archiveAdminAsset`, `restoreAdminAsset` (current workers have no quota
protection beyond Cloudinary consent). 10. Re-verify token staleness on each mutation (already server-side per
request via `tokeninfo`, cached per token until expiry).

---

## Known residual risks (accepted, tracked)

- **Token theft via XSS:** the ID token is cached in `localStorage`; an XSS
  on an admin's browser could replay it until expiry (~1 h). No sensitive
  scopes are granted, mitigating impact.
- **Test-user account compromise:** a compromised beta-tester Gmail = admin
  access; rotate test users on suspicion.
- **Third-party trust:** Google (token issuance), Cloudinary (asset store),
  Cloudflare (worker runtime) are all trust boundaries.
