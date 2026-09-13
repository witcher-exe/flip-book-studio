<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Permanent Project Rules & Design Conventions

### 1. Cover Page Interactive Buttons (Audio & Video)
- **Layout Orientation**: MUST ALWAYS be **vertically stacked** (`flex-direction: column`, with Audio on top and Video directly below).
- **Single Exception**: ONLY in **mobile dual-page mode** (`isMobile && !singlePage` and screen width `<= 767px`), they are placed horizontally side-by-side (`flex-direction: row`).
- **Do NOT** make them horizontal on desktop, tablet, fullscreen, or in mobile single-page mode.
- **Labels**: Bold, clean circular curved SVG text badges without stroke or dots. Audio has badge on top ("AUDIO"), Video has badge on bottom ("VIDEO").
- **Cover Audio Source**: `src/assets/coverpage.mp4` with timestamp 2:15 to 2:28 automatically skipped.
- **Audio Slider**: A progress slider appears beside the audio button only while playing to allow scrubbing.

### 2. Fullscreen Mode Behavior
- **Screen Coverage**: The book MUST occupy the **total top-to-bottom height of the screen** (`100vh` / `window.innerHeight`), with zero top or bottom gaps or black bars cutting into the book height.
- **Chrome Removal / Floating Controls**:
  - Top header bar (`.reader-topbar`) and bottom navigation bar (`.reader-bottombar`) MUST be completely removed / hidden (`display: none !important`) in fullscreen mode.
  - **Contents / Index Button**: MUST remain accessible in fullscreen mode via the floating control group at the top-right next to the exit button.
  - **Exit Button on Mobile**: Must be clearly visible (`opacity-95`, high contrast dark background) so mobile touch users never struggle to find or tap it. On desktop, it is transparent and unobtrusive (`opacity-35` to `opacity-45`, fading out when idle).
  - **Layout Synchronization on Exit/Enter**: Must call `flip.update()` across the resize lifecycle to ensure `PageFlip` re-centers and scales pages properly without cropping or mispositioning.

### 3. Mobile Navigation & Drawers
- **Contents Drawer (Mobile)**: The page list inside the mobile Contents Drawer must have `data-vaul-no-drag` and `touch-action: pan-y` so users can swipe up and down smoothly to scroll through all pages without `vaul` hijacking the gesture to dismiss the drawer.
- **Swipe-to-Previous on Single Page Mobile**: Must use `(flip as any).turnToPrevPage?.()` instead of relying on `react-pageflip`'s internal portrait swipe calculation to prevent getting stuck.
- **Mode Toggle**: Mobile users can toggle between single-page and double-page mode via the dedicated button on the bottom bar OR via double-tap gesture.


