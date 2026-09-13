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

### 1. Cover Page & Audio Buttons
- **Layout Orientation**: MUST ALWAYS be **vertically stacked** (`flex-direction: column`, with Audio on top and Video directly below).
- **Single Exception**: ONLY in **mobile dual-page mode** (`isMobile && !singlePage` and screen width `<= 767px`), they are placed horizontally side-by-side (`flex-direction: row`).
- **Labels**: Bold, clean circular curved SVG text badges without stroke or dots, hugging the circular button rim closely (radius 28). Audio has badge on top ("AUDIO"), Video has badge on bottom ("VIDEO").
- **Page 20 Audio Button**: Badge MUST be on the **bottom** ("AUDIO") to avoid overlapping page footer text.
- **Audio Slider Scrubber**: Appears beside the audio button only while playing. Must NEVER display any black rectangle/tooltip behind it when hovering. Clicks/drags anywhere on the slider pill MUST NOT flip pages (`page-interactive-elem` with event isolation).

### 2. Page 11 Button (8 Personalities)
- **Label Orientation**: Curved "IMAGES" label MUST be on the **bottom** of the button circle by default (desktop, fullscreen, mobile single-page).
- **Single Exception**: ONLY in **mobile dual-page mode** (`isMobile && !singlePage` and screen width `<= 767px`), the curved label is replaced by a straight label on the **left side beside the button**.

### 3. Fullscreen Mode Behavior
- **Screen Coverage**: The book MUST occupy the **total top-to-bottom height of the screen** (`100vh` / `window.innerHeight`), with zero top or bottom gaps or black bars cutting into the book height.
- **Chrome Removal & Floating Controls**:
  - Top header bar (`.reader-topbar`) and bottom navigation bar (`.reader-bottombar`) MUST be completely removed / hidden (`display: none !important`) in fullscreen mode.
  - **Exit Button on PC**: Positioned at the **top-left corner** (`top-3.5 left-3.5`, `opacity-45`, fading when idle).
  - **Exit Button on Mobile**: Positioned at top-right, clearly visible (`opacity-95`, high contrast dark background).
  - **Contents / Index Button**: MUST remain accessible in fullscreen mode via the floating control at top-right (`top-3.5 right-3.5`).
  - **Zero Sound on Transition**: Entering or exiting fullscreen MUST be silent (flip sounds suppressed during fullscreen transitions).
  - **Layout Synchronization**: Must call `flip.update()` across the resize lifecycle to ensure `PageFlip` re-centers and scales pages properly without cropping or mispositioning.

### 4. Mobile Navigation & Drawers
- **Contents Drawer (Mobile)**: The page list inside the mobile Contents Drawer must have `data-vaul-no-drag` and `touch-action: pan-y` so users can swipe up and down smoothly to scroll through all pages without `vaul` hijacking the gesture to dismiss the drawer.
- **Swipe-to-Previous on Single Page Mobile**: Must use `(flip as any).turnToPrevPage?.()` instead of relying on `react-pageflip`'s internal portrait swipe calculation to prevent getting stuck.
- **Mode Toggle**: Mobile users can toggle between single-page and double-page mode via the dedicated button on the bottom bar OR via double-tap gesture.


