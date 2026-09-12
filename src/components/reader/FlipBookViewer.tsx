import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { ChevronLeft, ChevronRight, Moon, RotateCw, Sun, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useIsMobile } from "@/hooks/use-mobile";
import { BookPage } from "./BookPage";
import { FpsMeter } from "./FpsMeter";
import { PageIndexDropdown } from "./PageIndexDropdown";
import { useRiffleJump, type PageFlipLike } from "./useRiffleJump";
import type { IssueWithPagesDTO } from "@/lib/magazine.types";
import flipSoundUrl from "@/assets/pageflip.mp3";

// react-pageflip touches the DOM on construction — keep it out of the SSR graph.
const HTMLFlipBook = lazy(async () => {
  const mod = await import("react-pageflip");
  return { default: mod.default as unknown as ComponentType<Record<string, unknown>> };
});

const MOUNT_RADIUS = 3;
const PRELOAD_RADIUS = 2;

export function FlipBookViewer({ issue, pages }: IssueWithPagesDTO) {
  const bookRef = useRef<{ pageFlip: () => PageFlipLike } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dark, setDark] = useState(false);
  const [idle, setIdle] = useState(false);
  const [history, setHistory] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [fitWidth, setFitWidth] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const [singlePage, setSinglePage] = useState(false);
  const [isRotated, setIsRotated] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingPan, setIsDraggingPan] = useState(false);

  const soundTriggeredForFlipRef = useRef(false);
  const arrowClickTimerRef = useRef<{
    prev?: ReturnType<typeof setTimeout> | undefined;
    next?: ReturnType<typeof setTimeout> | undefined;
  }>({});
  const panDragRef = useRef<{
    startX: number;
    startY: number;
    initialPanX: number;
    initialPanY: number;
    moved: boolean;
  } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const lastPointerDownRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const lastToggleTimeRef = useRef<number>(0);
  // Refs to expose current state to capture-phase native event handlers
  const singlePageRef = useRef(singlePage);
  singlePageRef.current = singlePage;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const totalPages = pages.length;

  useEffect(() => {
    setMounted(true);
    audioRef.current = new Audio(flipSoundUrl);
    return () => {
      if (arrowClickTimerRef.current.prev) clearTimeout(arrowClickTimerRef.current.prev);
      if (arrowClickTimerRef.current.next) clearTimeout(arrowClickTimerRef.current.next);
    };
  }, []);

  // react-pageflip's "stretch" mode derives height from width only, so cap the
  // width to whatever the stage can actually show without clipping the spread.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const PAGE_RATIO = 777 / 550;
    const measure = () => {
      const { width, height } = stage.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      const spread = isMobile ? (singlePage ? 1 : 2) : 2;
      // In mobile double-page mode, reserve a little margin (24px) so both left and right edges are never cropped
      const horizontalPadding = isMobile && !singlePage ? 24 : 0;
      const safeWidth = Math.max(100, width - horizontalPadding);
      setFitWidth(Math.floor(Math.min(safeWidth, (height / PAGE_RATIO) * spread)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [mounted, isMobile, singlePage]);

  const getFlip = useCallback(() => bookRef.current?.pageFlip() ?? null, []);

  const flipPrevSafe = useCallback(() => {
    const flip = getFlip();
    if (!flip) return;
    try {
      const fc = (flip as any).getFlipController?.() ?? (flip as any).flipController;
      const render = (flip as any).getRender?.() ?? (flip as any).render;
      const rect = render?.getRect?.();
      if (fc && rect) {
        fc.flip({
          x: rect.left + 15,
          y: rect.top + 10,
        });
        return;
      }
    } catch {}
    try {
      flip.flipPrev();
    } catch {
      (flip as any).turnToPrevPage?.();
    }
  }, [getFlip]);

  const flipNextSafe = useCallback(() => {
    const flip = getFlip();
    if (!flip) return;
    try {
      const fc = (flip as any).getFlipController?.() ?? (flip as any).flipController;
      const render = (flip as any).getRender?.() ?? (flip as any).render;
      const rect = render?.getRect?.();
      if (fc && rect) {
        fc.flip({
          x: rect.left + rect.width - 15,
          y: rect.top + 10,
        });
        return;
      }
    } catch {}
    try {
      flip.flipNext();
    } catch {
      (flip as any).turnToNextPage?.();
    }
  }, [getFlip]);

  const playFlipSound = useCallback(() => {
    if (!audioRef.current) return;
    try {
      const sound = audioRef.current.cloneNode() as HTMLAudioElement;
      sound.currentTime = 0.4;
      sound.volume = 0.7;
      sound.play().catch(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0.4;
          audioRef.current.play().catch(() => {});
        }
      });
    } catch {
      audioRef.current.currentTime = 0.4;
      audioRef.current.play().catch(() => {});
    }
  }, []);

  const { jumpToPage, phase, isRiffling } = useRiffleJump(getFlip, totalPages, (n) => {
    setCurrentPage(n);
  });

  const jumpWithHistory = useCallback(
    (target: number) => {
      const from = (getFlip()?.getCurrentPageIndex() ?? currentPage - 1) + 1;
      if (from !== target) setHistory((h) => [...h.slice(-9), from]);
      jumpToPage(target);
    },
    [currentPage, getFlip, jumpToPage],
  );

  const goBack = useCallback(() => {
    setHistory((h) => {
      const last = h[h.length - 1];
      if (last !== undefined) jumpToPage(last);
      return h.slice(0, -1);
    });
  }, [jumpToPage]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (e.key === "ArrowRight") flipNextSafe();
      if (e.key === "ArrowLeft") flipPrevSafe();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipNextSafe, flipPrevSafe]);

  // Chrome fades after 3s of stillness, returns on any interaction.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const wake = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), 3000);
    };
    wake();
    const events: (keyof WindowEventMap)[] = ["pointermove", "pointerdown", "keydown", "wheel"];
    events.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, wake));
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Proactively warm neighbouring imagery so a flip never reveals a loading state.
  useEffect(() => {
    if (typeof window === "undefined") return;
    for (let d = -PRELOAD_RADIUS; d <= PRELOAD_RADIUS; d += 1) {
      const page = pages[currentPage - 1 + d];
      if (page?.backgroundImageUrl) {
        const img = new Image();
        img.src = page.backgroundImageUrl;
      }
    }
  }, [currentPage, pages]);

  const children = useMemo(
    () =>
      pages.map((page, index) => (
        <BookPage
          key={page.id}
          page={page}
          totalPages={totalPages}
          issueTitle={issue.title}
          isCover={index === 0 || index === totalPages - 1}
          detail={
            !isRiffling && Math.abs(index - (currentPage - 1)) <= MOUNT_RADIUS ? "full" : "light"
          }
          onJump={jumpWithHistory}
        />
      )),
    [currentPage, isRiffling, issue.title, jumpWithHistory, pages, totalPages],
  );

  const chrome = `reader-chrome${idle ? " reader-chrome--idle" : ""}`;

  // Toggle zoom at point (desktop double-click only — mobile handled by capture listeners)
  const toggleZoomAtPoint = useCallback(
    (clientX: number, clientY: number) => {
      if (isMobile) return; // mobile path handled by capture-phase listener below
      const now = Date.now();
      if (now - lastToggleTimeRef.current < 800) {
        return;
      }
      lastToggleTimeRef.current = now;

      if (zoom > 1) {
        setZoom(1);
        setPan({ x: 0, y: 0 });
        return;
      }
      const rect = stageRef.current?.getBoundingClientRect();
      const targetZoom = 2.5;
      if (rect) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const offsetX = clientX - centerX;
        const offsetY = clientY - centerY;

        const maxPanX = Math.max(100, (rect.width * (targetZoom - 1)) / 2);
        const maxPanY = Math.max(100, (rect.height * (targetZoom - 1)) / 2);

        const targetX = Math.max(-maxPanX, Math.min(maxPanX, -offsetX * 1.1));
        const targetY = Math.max(-maxPanY, Math.min(maxPanY, -offsetY * 1.1));

        setPan({ x: targetX, y: targetY });
      }
      setZoom(targetZoom);
    },
    [isMobile, zoom],
  );

  const rotateScale = useMemo(() => {
    if (!isRotated || !stageRef.current || !fitWidth) return 1;
    const rect = stageRef.current.getBoundingClientRect();
    const PAGE_RATIO = 777 / 550;
    const bookHeight = (fitWidth / 2) * PAGE_RATIO;
    // When rotated 90deg, book width maps to stage height and book height maps to stage width
    const scaleH = (rect.height - 24) / fitWidth;
    const scaleW = (rect.width - 24) / bookHeight;
    const s = Math.min(scaleH, scaleW);
    return Math.max(1, Math.min(s, 2.5));
  }, [isRotated, fitWidth]);

  const onStageDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // On mobile devices, double-tap is handled by capture-phase native listeners.
    if (isMobile || Date.now() - lastToggleTimeRef.current < 800) {
      return;
    }
    toggleZoomAtPoint(e.clientX, e.clientY);
  };

  // Capture-phase native listeners: intercept the second tap of a double-tap
  // BEFORE page-flip's own touch handlers see it.  React synthetic handlers
  // fire in the bubble phase (parent-last), so by then page-flip has already
  // processed the touch and its internal state interferes with our toggle.
  // Capture phase fires parent-first, letting us block the event entirely.
  //
  // State setters (setSinglePage, setZoom, etc.) are stable across renders.
  // Current values are read from refs (singlePageRef, zoomRef) so there are
  // no stale closures, no debounce conflicts, and no indirect callbacks.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let blockNextTouchEnd = false;
    let toggleScheduled = false;

    const onTouchStartCapture = (e: TouchEvent) => {
      if ((e.target as HTMLElement)?.closest?.('button, .page-interactive-elem, [role="dialog"]')) {
        return;
      }
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      if (!touch) return;
      const now = Date.now();
      const last = lastTapRef.current;

      if (
        last &&
        now - last.time < 380 &&
        Math.hypot(touch.clientX - last.x, touch.clientY - last.y) < 45
      ) {
        // Double-tap detected — block this touch from reaching page-flip
        e.stopPropagation();
        e.preventDefault();
        blockNextTouchEnd = true;
        lastTapRef.current = null;
        lastPointerDownRef.current = null;

        if (!toggleScheduled) {
          toggleScheduled = true;
          setTimeout(() => {
            toggleScheduled = false;
            if (zoomRef.current > 1) {
              // Zoomed in: just reset zoom
              setZoom(1);
              setPan({ x: 0, y: 0 });
            } else {
              // Toggle single/double page mode
              setIsRotated(false);
              setSinglePage(!singlePageRef.current);
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }
          }, 60);
        }
      } else {
        lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY };
      }
    };

    const onTouchEndCapture = (e: TouchEvent) => {
      if (blockNextTouchEnd) {
        blockNextTouchEnd = false;
        e.stopPropagation();
        e.preventDefault();
      }
    };

    stage.addEventListener('touchstart', onTouchStartCapture, { capture: true });
    stage.addEventListener('touchend', onTouchEndCapture, { capture: true });
    return () => {
      stage.removeEventListener('touchstart', onTouchStartCapture, { capture: true });
      stage.removeEventListener('touchend', onTouchEndCapture, { capture: true });
    };
  }, [mounted]);

  // Pointer panning handlers when zoom > 1
  const onStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const now = Date.now();
    const last = lastPointerDownRef.current;
    const isSecondPointer =
      last && now - last.time < 380 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 45;
    lastPointerDownRef.current = { time: now, x: e.clientX, y: e.clientY };

    if (isSecondPointer) {
      // Suppress 2nd click from propagating into the flipbook element so it never flips
      e.stopPropagation();
      return;
    }

    if (zoom > 1) {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      panDragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialPanX: pan.x,
        initialPanY: pan.y,
        moved: false,
      };
      setIsDraggingPan(true);
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}
      e.stopPropagation();
    }
  };

  const onStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!panDragRef.current || zoom <= 1) return;
    const dx = e.clientX - panDragRef.current.startX;
    const dy = e.clientY - panDragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      panDragRef.current.moved = true;
    }
    const rect = stageRef.current?.getBoundingClientRect();
    const maxPanX = Math.max(100, ((rect?.width ?? 800) * (zoom - 1)) / 1.5 + 80);
    const maxPanY = Math.max(100, ((rect?.height ?? 600) * (zoom - 1)) / 1.5 + 80);

    setPan({
      x: Math.max(-maxPanX, Math.min(maxPanX, panDragRef.current.initialPanX + dx)),
      y: Math.max(-maxPanY, Math.min(maxPanY, panDragRef.current.initialPanY + dy)),
    });
  };

  const onStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (panDragRef.current) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      panDragRef.current = null;
      setIsDraggingPan(false);
    }
  };

  // Large side navigation arrows: speedy multi-click page flipping, exactly like bottom bar buttons,
  // while stopping propagation on click/double-click/pointerdown so double-click NEVER triggers zoom on the stage.
  const handlePrevArrowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    flipPrevSafe();
  };

  const handleNextArrowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    flipNextSafe();
  };

  const handleArrowDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <div className="reader-shell" ref={containerRef}>
      <header className={`reader-topbar ${chrome}`}>
        <div className="min-w-0">
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Now reading
          </p>
          <h1 className="truncate font-display text-base text-foreground">{issue.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {history.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              aria-label="Go back to previous page"
              className="gap-1 font-sans"
            >
              <Undo2 className="size-4" aria-hidden="true" />
              Back
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsRotated((r) => !r)}
            disabled={singlePage}
            aria-label={isRotated ? "Reset rotation" : "Rotate book 90 degrees"}
            title={singlePage ? "Rotation disabled in single-page mode" : (isRotated ? "Reset rotation" : "Rotate 90°")}
            className={`transition-colors ${isRotated ? "text-primary bg-primary/10" : ""} disabled:opacity-30 disabled:pointer-events-none`}
          >
            <RotateCw className={`size-4 transition-transform duration-500 ${isRotated ? "rotate-90 text-primary" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDark((d) => !d)}
            aria-label={dark ? "Switch to light reading mode" : "Switch to dark reading mode"}
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <PageIndexDropdown
            issueId={issue.id}
            pages={pages}
            currentPage={currentPage}
            onSelect={jumpWithHistory}
          />
        </div>
      </header>

      <div
        ref={stageRef}
        className={`reader-stage relative overflow-hidden${phase === "cruise" ? " reader-stage--cruise" : ""}${isMobile && singlePage ? " reader-stage--single-mobile" : ""}${isMobile && !singlePage ? " reader-stage--double-mobile" : ""}`}
        style={{
          cursor: zoom > 1 ? (isDraggingPan ? "grabbing" : "grab") : undefined,
          touchAction: zoom > 1 ? "none" : undefined,
        }}
        onDoubleClick={onStageDoubleClick}
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerUp}
        onPointerCancel={onStagePointerUp}
      >
        {!isMobile ? (
          <>
            <button
              className={`hidden md:block absolute left-4 lg:left-12 top-1/2 -translate-y-1/2 z-50 p-2 sm:p-4 rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur-md transition-opacity duration-300 cursor-pointer ${idle ? "opacity-0" : "opacity-100"}`}
              onClick={handlePrevArrowClick}
              onDoubleClick={handleArrowDoubleClick}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-8 sm:size-12 text-foreground/70" />
            </button>

            <button
              className={`hidden md:block absolute right-4 lg:right-12 top-1/2 -translate-y-1/2 z-50 p-2 sm:p-4 rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur-md transition-opacity duration-300 cursor-pointer ${idle ? "opacity-0" : "opacity-100"}`}
              onClick={handleNextArrowClick}
              onDoubleClick={handleArrowDoubleClick}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              aria-label="Next page"
            >
              <ChevronRight className="size-8 sm:size-12 text-foreground/70" />
            </button>
          </>
        ) : null}

        <div
          className="reader-stage__fit"
          style={{
            width: fitWidth ? `${fitWidth}px` : "100%",
            transform: isRotated
              ? (zoom > 1
                  ? `translate3d(${pan.x}px, ${pan.y}px, 0) rotate(90deg) scale(${rotateScale * zoom})`
                  : `rotate(90deg) scale(${rotateScale})`)
              : (zoom > 1
                  ? `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`
                  : undefined),
            transformOrigin: "center center",
            transition: isDraggingPan ? "none" : "transform 500ms cubic-bezier(0.2, 0.8, 0.2, 1)",
            pointerEvents: zoom > 1 ? "none" : undefined,
            userSelect: zoom > 1 ? "none" : undefined,
          }}
        >
          {mounted ? (
            <Suspense fallback={<div className="reader-fallback" aria-hidden="true" />}>
              <HTMLFlipBook
                key={isMobile && singlePage ? "portrait" : "spread"}
                ref={bookRef as never}
                className={`flipbook${isMobile && singlePage ? " flipbook--no-shadow" : ""}`}
                width={550}
                height={777}
                size="stretch"
                minWidth={
                  isMobile && singlePage
                    ? fitWidth
                      ? Math.floor(fitWidth / 2) + 10
                      : 315
                    : isMobile
                      ? 100
                      : 240
                }
                maxWidth={760}
                minHeight={isMobile ? 140 : 340}
                maxHeight={1080}
                maxShadowOpacity={isMobile && singlePage ? 0 : 0.5}
                drawShadow={!(isMobile && singlePage)}
                showCover
                flippingTime={700}
                mobileScrollSupport
                useMouseEvents
                disableFlipByClick
                swipeDistance={30}
                startPage={currentPage - 1}
                usePortrait={isMobile && singlePage}
                onFlip={(e: { data: number }) => {
                  setCurrentPage(e.data + 1);
                  if (!soundTriggeredForFlipRef.current) {
                    playFlipSound();
                  }
                  soundTriggeredForFlipRef.current = false;
                  if (zoom > 1) {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }
                }}
                onChangeState={(e: { data: string }) => {
                  if (e.data === "flipping") {
                    soundTriggeredForFlipRef.current = true;
                    playFlipSound();
                  } else if (e.data === "read") {
                    soundTriggeredForFlipRef.current = false;
                  }
                }}
                style={{}}
              >
                {children}
              </HTMLFlipBook>
            </Suspense>
          ) : (
            <div className="reader-fallback" aria-hidden="true" />
          )}
        </div>
      </div>

      <footer className={`reader-bottombar ${chrome}`}>
        <Button
          variant="outline"
          size="icon"
          className="size-9 sm:size-11 rounded-full shrink-0"
          aria-label="Previous page"
          onClick={flipPrevSafe}
        >
          <ChevronLeft className="size-4 sm:size-5" />
        </Button>
        <span className="font-sans text-xs tabular-nums tracking-wide text-muted-foreground whitespace-nowrap shrink-0">
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex items-center gap-1.5 sm:gap-2 w-24 sm:w-32">
          <Slider
            min={1}
            max={4}
            step={0.1}
            value={[zoom]}
            onValueChange={(v) => {
              const z = v[0] ?? 1;
              setZoom(z);
              if (z <= 1) setPan({ x: 0, y: 0 });
            }}
            aria-label="Zoom level"
          />
          <span className="font-sans text-[10px] tabular-nums text-muted-foreground whitespace-nowrap">
            {Math.round(zoom * 100)}%
          </span>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="size-9 sm:size-11 rounded-full shrink-0"
          aria-label="Next page"
          onClick={flipNextSafe}
        >
          <ChevronRight className="size-4 sm:size-5" />
        </Button>
      </footer>

      {import.meta.env.DEV ? <FpsMeter /> : null}
    </div>
  );
}

