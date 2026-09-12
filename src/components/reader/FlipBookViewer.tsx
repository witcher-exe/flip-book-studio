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
import { ChevronLeft, ChevronRight, Moon, Sun, Undo2 } from "lucide-react";

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
      setFitWidth(Math.floor(Math.min(width, (height / PAGE_RATIO) * spread)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [mounted, isMobile, singlePage]);

  const getFlip = useCallback(() => bookRef.current?.pageFlip() ?? null, []);

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
      if (e.key === "ArrowRight") getFlip()?.flipNext();
      if (e.key === "ArrowLeft") getFlip()?.flipPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentPage, getFlip, totalPages]);

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

  // Toggle zoom at point (desktop double-click and mobile double-tap)
  const toggleZoomAtPoint = useCallback(
    (clientX: number, clientY: number) => {
      const now = Date.now();
      if (now - lastToggleTimeRef.current < 450) {
        return;
      }
      lastToggleTimeRef.current = now;

      if (isMobile) {
        if (zoom > 1) {
          setZoom(1);
          setPan({ x: 0, y: 0 });
          return;
        }
        setSinglePage((s) => !s);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        return;
      }
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

  const onStageDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    toggleZoomAtPoint(e.clientX, e.clientY);
  };

  const onStageTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (e.touches.length === 1 && touch) {
      const now = Date.now();
      const last = lastTapRef.current;
      if (
        last &&
        now - last.time < 380 &&
        Math.hypot(touch.clientX - last.x, touch.clientY - last.y) < 45
      ) {
        lastTapRef.current = null;
        toggleZoomAtPoint(touch.clientX, touch.clientY);
        return;
      }
      lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY };
    }
  };

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

  // Prevent double-clicking on large side navigation arrows from changing pages
  const handlePrevArrowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (arrowClickTimerRef.current.prev) {
      clearTimeout(arrowClickTimerRef.current.prev);
      arrowClickTimerRef.current.prev = undefined;
      return; // Double click prevented: do not change page!
    }
    arrowClickTimerRef.current.prev = setTimeout(() => {
      arrowClickTimerRef.current.prev = undefined;
      getFlip()?.flipPrev();
    }, 220);
  };

  const handleNextArrowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (arrowClickTimerRef.current.next) {
      clearTimeout(arrowClickTimerRef.current.next);
      arrowClickTimerRef.current.next = undefined;
      return; // Double click prevented: do not change page!
    }
    arrowClickTimerRef.current.next = setTimeout(() => {
      arrowClickTimerRef.current.next = undefined;
      getFlip()?.flipNext();
    }, 220);
  };

  const handleArrowDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (arrowClickTimerRef.current.prev) {
      clearTimeout(arrowClickTimerRef.current.prev);
      arrowClickTimerRef.current.prev = undefined;
    }
    if (arrowClickTimerRef.current.next) {
      clearTimeout(arrowClickTimerRef.current.next);
      arrowClickTimerRef.current.next = undefined;
    }
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
        className={`reader-stage relative overflow-hidden${phase === "cruise" ? " reader-stage--cruise" : ""}`}
        style={{
          cursor: zoom > 1 ? (isDraggingPan ? "grabbing" : "grab") : undefined,
          touchAction: zoom > 1 ? "none" : undefined,
        }}
        onDoubleClick={onStageDoubleClick}
        onTouchStart={onStageTouchStart}
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerUp}
        onPointerCancel={onStagePointerUp}
      >
        {!isMobile ? (
          <>
            <button
              className={`hidden md:block absolute left-4 lg:left-12 top-1/2 -translate-y-1/2 z-50 p-2 sm:p-4 rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur-md transition-opacity duration-300 ${idle ? "opacity-0" : "opacity-100"}`}
              onClick={handlePrevArrowClick}
              onDoubleClick={handleArrowDoubleClick}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-8 sm:size-12 text-foreground/70" />
            </button>

            <button
              className={`hidden md:block absolute right-4 lg:right-12 top-1/2 -translate-y-1/2 z-50 p-2 sm:p-4 rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur-md transition-opacity duration-300 ${idle ? "opacity-0" : "opacity-100"}`}
              onClick={handleNextArrowClick}
              onDoubleClick={handleArrowDoubleClick}
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
            transform:
              zoom > 1
                ? `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`
                : undefined,
            transformOrigin: "center center",
            transition: isDraggingPan ? "none" : "transform 400ms cubic-bezier(0.2, 0.8, 0.2, 1)",
            pointerEvents: zoom > 1 ? "none" : undefined,
            userSelect: zoom > 1 ? "none" : undefined,
          }}
        >
          {mounted ? (
            <Suspense fallback={<div className="reader-fallback" aria-hidden="true" />}>
              <HTMLFlipBook
                key={isMobile && singlePage ? "portrait" : "spread"}
                ref={bookRef as never}
                className="flipbook"
                width={550}
                height={777}
                size="stretch"
                minWidth={240}
                maxWidth={760}
                minHeight={340}
                maxHeight={1080}
                maxShadowOpacity={0.5}
                drawShadow
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
          onClick={() => getFlip()?.flipPrev()}
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
          onClick={() => getFlip()?.flipNext()}
        >
          <ChevronRight className="size-4 sm:size-5" />
        </Button>
      </footer>

      {import.meta.env.DEV ? <FpsMeter /> : null}
    </div>
  );
}

