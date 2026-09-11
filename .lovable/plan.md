## Flip-Book Digital Magazine — Full Build Plan

Two stack notes up front: this project uses TanStack Router (the routing is fixed), so the reader route is `src/routes/read.$issueId.tsx` — same URL `/read/:issueId`, different file convention. The backend is Lovable Cloud (built-in database, storage, and server functions), so no external accounts or setup on your side.

### Phase 1 — Foundation & data layer

Enable Lovable Cloud, then create three tables:

- `issues` — id, title, cover_image_url, created_at
- `pages` — id, issue_id, page_number (unique per issue), title, section, content_html, background_image_url, thumbnail_url, created_at
- `page_references` — id, source_page_id, target_page_id, anchor_text, position_in_content

Reading is public, so each table gets public read access and a generated `search_vector` tsvector over `title` + `content_html` with a GIN index for Phase 3 search.

Seed one sample issue with 12 pages spanning Cover / Feature / Interview / Back Page, including two cross-reference links, all in the migration itself.

The reader route loads the issue plus its pages through a public server function and renders a plain vertical list (page number, title, section) so data loading is verifiable before any animation exists. `/` redirects to the sample issue.

### Phase 2 — Flip reader engine

Install `react-pageflip`. Build `FlipBookViewer` wrapping `<HTMLFlipBook>` with `BookPage` children (forwardRef, as the library requires): full-bleed background image, section label, serif headline, sanitized `content_html` body.

Config: `showCover` for rigid first/last pages, `size="stretch"` with min/max bounds holding roughly a 1:1.414 magazine ratio, `flippingTime: 700`, `maxShadowOpacity: 0.5`, `drawShadow: true`, `mobileScrollSupport: true`.

Navigation: native drag/swipe (horizontal-only so vertical scroll survives), bottom-center prev/next buttons at 44px+ targets, left/right arrow keys, and a "Page X of Y" indicator driven by `onFlip`.

Smoothness: `will-change: transform` + `backface-visibility: hidden` on page elements, and background-image preloading for current page ±2.

Design: cream/off-white book surface, ambient drop shadow under the whole book, serif display for headlines, sans for body and chrome, chrome pushed to the edges.

### Phase 3 — Searchable index dropdown

`PageIndexDropdown` — a "Contents" button top-right opening a shadcn `Command` panel on desktop and a full-width bottom sheet on mobile.

Lists every page grouped by section with thumbnail, number, title. The input filters locally on number/title/section instantly, and in parallel runs a debounced full-text query against `search_vector` so body-text matches surface too, with a highlighted snippet showing why it matched. Arrow keys move, Enter jumps, Escape closes. Selecting a result calls `jumpToPage()` from Phase 4 — animated, never an instant cut.

### Phase 4 — Riffle jump + internal hyperlinks

`useRiffleJump(pageFlipRef, totalPages)` exposing `jumpToPage(target)`:

- Distance ≤ 2 → normal `flip()` at standard speed.
- Otherwise a chained sequence: first ~20% ramps 250ms → ~40ms, middle ~60% cruises at 30–50ms, final ~20% ramps ~40ms → 350ms to settle. Total sequence time is capped at ~2.2s via a logarithmic distance scale, so a 400-page jump costs the same wait as a 40-page one.
- Driven by `requestAnimationFrame` with `performance.now()` deltas — never fixed frame assumptions — so pacing is correct on 60/90/120/144Hz displays.
- During cruise, flown-past pages render as thumbnails or solid swatches; full `content_html` returns for current ±2 once settled. Never more than ~8 full pages mounted.
- A GPU-friendly transform-based blur applies during cruise only, dropped the moment deceleration starts.
- `prefers-reduced-motion` skips the riffle and cuts straight to the target.

Internal hyperlinks: `page_references` render inline in content as accent-colored underlined links with a → icon; clicking riffles to the target. A navigation history stack (last 10 positions, in memory) powers a back control that appears briefly after a link jump and riffles you back.

### Phase 5 — Performance hardening

Virtualized mounting (current ±3 full pages, everything else an ultra-light placeholder, window updated on `onFlip`). Storage image transforms so the dropdown requests thumbnail sizes and only mounted pages request full size, plus `loading="lazy"`, blurred low-quality placeholders, and proactive prefetch of ±2 full-size images on every page change. `React.memo` on page components so flipping page 50 doesn't re-render 1–49. A dev-only FPS overlay behind a keyboard shortcut, stripped in production. Verification at 50, 150, and 400-page seed sizes, then revert to the 12-page sample.

### Phase 6 — Polish & accessibility

Chrome fades to low opacity after 3s idle and returns on any interaction. Subtle bottom-corner curl hint on desktop. Light/dark toggle where dark is deep charcoal with warm off-white text, not pure black. Typographic hierarchy across issue title / section / headline / body, with body copy held to a comfortable measure rather than edge-to-edge. Cover page gets full-bleed treatment and is the landing point.

Accessibility: full keyboard operability end-to-end, contrast checked in both modes, `prefers-reduced-motion` extended to the fade transitions, screen-reader labels on every icon-only control. Responsive verification from phone portrait through wide desktop with no clipped content or broken hit zones.

### Technical details

- Routes: `src/routes/read.$issueId.tsx` (reader) and `src/routes/index.tsx` (redirect to sample issue), each with its own SEO metadata.
- Data reads go through public server functions in `src/lib/*.functions.ts` using the publishable key, primed in the loader with `ensureQueryData` and read via `useSuspenseQuery`.
- `content_html` is sanitized before render, and reference anchors are resolved to jump handlers rather than raw `<a href>`.
- Phase 4's sequencer and Phase 5's virtualization window are built as one coordinated mounting model so they don't fight each other.

### Risk

Phase 4 is the highest-risk item. It will be implemented as a working constant-speed chained flip first, confirmed to land exactly on target, then the easing curve and motion blur layered on — so a timing bug never blocks correctness of the jump itself.
