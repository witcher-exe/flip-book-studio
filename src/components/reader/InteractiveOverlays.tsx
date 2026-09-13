import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Play,
  Pause,
  Volume2,
  Video,
  Users,
  Loader2,
  Sparkles,
  ZoomIn,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  pageInteractions,
  type PersonItem,
} from "@/config/pageInteractions";

// Base circular curved text badge with customizable radius, inset, and positioning
export interface CurvedTextBadgeProps {
  text: string;
  side?: "top" | "bottom";
  textColor?: string;
  className?: string;
  topRadius?: number;
  bottomRadius?: number;
  containerInset?: string;
  fontSize?: string;
  letterSpacing?: string;
}

export function CurvedTextBadge({
  text,
  side = "top",
  textColor = "#1e1b18",
  className = "",
  topRadius = 30.5,
  bottomRadius = 38.5,
  containerInset = "-inset-4 sm:-inset-4.5",
  fontSize,
  letterSpacing = "0.14em",
}: CurvedTextBadgeProps) {
  const id = React.useId().replace(/:/g, "");

  // Clean label string (remove bullet symbols and extra whitespace)
  const cleanText = text.replace(/•/g, "").trim();

  // Top arc (clockwise, baseline at radius R, glyphs point UP away from button)
  const topPath = `M ${50 - topRadius},50 A ${topRadius},${topRadius} 0 0,1 ${50 + topRadius},50`;

  // Bottom arc (counter-clockwise, baseline at radius R, glyphs upright curving under button)
  const bottomPath = `M ${50 - bottomRadius},50 A ${bottomRadius},${bottomRadius} 0 0,0 ${50 + bottomRadius},50`;

  const resolvedFontSize =
    fontSize || (cleanText.length > 7 ? "11px" : "12px");
  const pathId = side === "bottom" ? `bottom-path-${id}` : `top-path-${id}`;
  const pathD = side === "bottom" ? bottomPath : topPath;

  return (
    <div
      className={`absolute ${containerInset} pointer-events-none flex items-center justify-center select-none z-20 ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <path id={pathId} d={pathD} fill="none" />
        </defs>

        {/* Clean solid text with tiny gap from button border, no overlapping */}
        <text
          fill={textColor}
          style={{
            fontSize: resolvedFontSize,
            fontWeight: "900",
            letterSpacing,
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.25))",
          }}
        >
          <textPath
            href={`#${pathId}`}
            startOffset="50%"
            textAnchor="middle"
          >
            {cleanText}
          </textPath>
        </text>
      </svg>
    </div>
  );
}

/**
 * Audio badge - independently configured for audio buttons
 * Has dedicated topRadius and bottomRadius to ensure a neat, tiny gap from button rim
 */
export function AudioCurvedBadge({
  text = "AUDIO",
  side = "top",
  textColor = "#065f46",
  className = "",
  topRadius = 30.5,
  bottomRadius = 38.5,
}: {
  text?: string;
  side?: "top" | "bottom";
  textColor?: string;
  className?: string;
  topRadius?: number;
  bottomRadius?: number;
}) {
  return (
    <CurvedTextBadge
      text={text}
      side={side}
      textColor={textColor}
      className={`audio-curved-badge ${className}`}
      topRadius={topRadius}
      bottomRadius={bottomRadius}
      containerInset="-inset-4 sm:-inset-4.5"
      fontSize="12px"
    />
  );
}

/**
 * Video badge - independently configured for video buttons
 * Tweaking audio will NEVER affect this video badge
 */
export function VideoCurvedBadge({
  text = "VIDEO",
  side = "bottom",
  textColor = "#b91c1c",
  className = "",
  bottomRadius = 38.5,
  topRadius = 30.5,
}: {
  text?: string;
  side?: "top" | "bottom";
  textColor?: string;
  className?: string;
  bottomRadius?: number;
  topRadius?: number;
}) {
  return (
    <CurvedTextBadge
      text={text}
      side={side}
      textColor={textColor}
      className={`video-curved-badge ${className}`}
      topRadius={topRadius}
      bottomRadius={bottomRadius}
      containerInset="-inset-4 sm:-inset-4.5"
      fontSize="11.5px"
    />
  );
}

/**
 * Page 11 Persons badge - independently configured
 */
export function Page11CurvedBadge({
  text = "IMAGES",
  side = "bottom",
  textColor = "#8b2626",
  className = "",
  bottomRadius = 38.5,
}: {
  text?: string;
  side?: "top" | "bottom";
  textColor?: string;
  className?: string;
  bottomRadius?: number;
}) {
  return (
    <CurvedTextBadge
      text={text}
      side={side}
      textColor={textColor}
      className={`page11-curved-badge ${className}`}
      bottomRadius={bottomRadius}
      containerInset="-inset-4 sm:-inset-4.5"
      fontSize="11.5px"
    />
  );
}

// Interactive wrapper that isolates mouse/touch events from page-flip without breaking React clicks
export function PageInteractiveWrapper({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`page-interactive-elem ${className}`}
      style={style}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

function formatEmbedUrl(rawUrl: string): string {
  try {
    const shortMatch = rawUrl.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch) {
      return `https://www.youtube-nocookie.com/embed/${shortMatch[1]}?autoplay=1`;
    }
    const watchMatch = rawUrl.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (watchMatch) {
      return `https://www.youtube-nocookie.com/embed/${watchMatch[1]}?autoplay=1`;
    }
    const vimeoMatch = rawUrl.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
    }
    return rawUrl.includes("?") ? `${rawUrl}&autoplay=1` : `${rawUrl}?autoplay=1`;
  } catch {
    return rawUrl;
  }
}

/**
 * Audio Button with Play/Pause state, pulsing visualizer, and curved text label
 */
function formatAudioTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function PageAudioButton({
  src,
  title,
  subtitle,
  className = "",
  badgeText = "AUDIO",
  badgeSide = "top",
  ariaLabel = "Play audio",
}: {
  src: string;
  title: string;
  subtitle?: string;
  className?: string;
  badgeText?: string;
  badgeSide?: "top" | "bottom";
  ariaLabel?: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSeekingRef = useRef(false);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audio.src = src;

    const onPlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => {
      setIsLoading(false);
      if (!isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const onLoadedMetadata = () => {
      if (!isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const onDurationChange = () => {
      if (!isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const onTimeUpdate = () => {
      if (!isSeekingRef.current) {
        setCurrentTime(audio.currentTime);
      }
    };
    const onError = () => {
      setIsPlaying(false);
      setIsLoading(false);
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("error", onError);

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("error", onError);
      audioRef.current = null;
    };
  }, [src]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setIsLoading(true);
      document.querySelectorAll("audio").forEach((a) => {
        if (a !== audioRef.current) a.pause();
      });

      audioRef.current.play().catch((err) => {
        console.warn("Audio playback failed or was blocked:", err);
        setIsLoading(false);
        setIsPlaying(false);
      });
    }
  };

  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sliderRef.current;
    if (!el || !isPlaying) return;

    const stopNative = (e: Event) => {
      e.stopPropagation();
    };

    const events = [
      "mousedown",
      "pointerdown",
      "touchstart",
      "mousemove",
    ];

    events.forEach((name) => el.addEventListener(name, stopNative, false));
    return () => {
      events.forEach((name) => el.removeEventListener(name, stopNative, false));
    };
  }, [isPlaying]);

  const handleSeek = (val: number) => {
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      {/* Curved circular label around button - independently tuned for Audio */}
      <AudioCurvedBadge
        text={badgeText}
        side={badgeSide}
        textColor={isPlaying ? "#059669" : "#065f46"}
      />

      <button
        type="button"
        onClick={togglePlay}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        title={isPlaying ? `Pause: ${title}` : `Play: ${title}`}
        aria-label={ariaLabel}
        className={`group relative flex items-center justify-center rounded-full transition-all duration-300 shadow-md page-overlay-btn ${
          isPlaying
            ? "bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-emerald-500/50 scale-105"
            : "bg-[#faf6ee] text-[#1b4332] hover:bg-emerald-600 hover:text-white hover:scale-110 ring-1 ring-[#c8b89e] dark:bg-[#2b251f] dark:text-[#d1fae5] backdrop-blur-sm"
        }`}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-emerald-400 pointer-events-none" />
        ) : isPlaying ? (
          <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current pointer-events-none" />
        ) : (
          <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 pointer-events-none" />
        )}

        {/* Pulsing ring indicator when playing */}
        {isPlaying && (
          <span className="absolute -inset-1 rounded-full animate-ping bg-emerald-400/30 pointer-events-none" />
        )}

        {/* Hover / active audio tooltip ONLY when not playing, preventing weird rectangle behind slider pill */}
        {!isPlaying ? (
          <span className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded-md bg-[#231e17]/95 px-2.5 py-1 text-xs font-serif text-[#fdfbf7] shadow-xl border border-[#524536] group-hover:flex items-center gap-1.5 z-30 transition-opacity">
            <span>Listen: {title}</span>
          </span>
        ) : null}
      </button>

      {/* Scrubber slider bar beside audio button, only visible when playing */}
      {isPlaying && (
        <div
          ref={sliderRef}
          className="page-interactive-elem absolute left-full ml-3 sm:ml-4 flex items-center gap-2 bg-[#1c1917]/92 dark:bg-[#faf7f2]/95 text-white dark:text-[#1c1917] px-3 py-1.5 rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.4)] border border-white/20 dark:border-black/15 backdrop-blur-md z-30 pointer-events-auto animate-in fade-in slide-in-from-left-2 duration-200 select-none"
          onClick={(e) => {
            e.stopPropagation();
            (e.nativeEvent as any)?.stopImmediatePropagation?.();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            (e.nativeEvent as any)?.stopImmediatePropagation?.();
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
            (e.nativeEvent as any)?.stopImmediatePropagation?.();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            (e.nativeEvent as any)?.stopImmediatePropagation?.();
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            (e.nativeEvent as any)?.stopImmediatePropagation?.();
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            (e.nativeEvent as any)?.stopImmediatePropagation?.();
          }}
          onTouchMove={(e) => {
            e.stopPropagation();
            (e.nativeEvent as any)?.stopImmediatePropagation?.();
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            (e.nativeEvent as any)?.stopImmediatePropagation?.();
          }}
        >
          <span className="text-[10px] sm:text-xs font-mono font-medium opacity-90 select-none tabular-nums pointer-events-none">
            {formatAudioTime(currentTime)}
          </span>

          <input
            type="range"
            min={0}
            max={duration > 0 ? duration : 100}
            step={0.1}
            value={currentTime}
            onClick={(e) => {
              e.stopPropagation();
              (e.nativeEvent as any)?.stopImmediatePropagation?.();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              (e.nativeEvent as any)?.stopImmediatePropagation?.();
              isSeekingRef.current = true;
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
              (e.nativeEvent as any)?.stopImmediatePropagation?.();
              isSeekingRef.current = false;
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.nativeEvent as any)?.stopImmediatePropagation?.();
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              (e.nativeEvent as any)?.stopImmediatePropagation?.();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              (e.nativeEvent as any)?.stopImmediatePropagation?.();
              isSeekingRef.current = true;
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              (e.nativeEvent as any)?.stopImmediatePropagation?.();
              isSeekingRef.current = false;
            }}
            onInput={(e) => {
              e.stopPropagation();
              (e.nativeEvent as any)?.stopImmediatePropagation?.();
              const val = parseFloat((e.target as HTMLInputElement).value);
              handleSeek(val);
            }}
            onChange={(e) => {
              e.stopPropagation();
              (e.nativeEvent as any)?.stopImmediatePropagation?.();
              const val = parseFloat(e.target.value);
              handleSeek(val);
            }}
            className="w-16 sm:w-24 md:w-32 h-1.5 bg-white/25 dark:bg-black/20 rounded-full appearance-none cursor-pointer accent-emerald-400 focus:outline-none"
            aria-label="Seek audio"
          />

          <span className="text-[10px] sm:text-xs font-mono font-medium opacity-70 select-none tabular-nums pointer-events-none">
            {formatAudioTime(duration)}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Video Popup Button with curved circular label and cinematic modal
 */
export function PageVideoButton({
  url,
  title,
  description,
  className = "",
  badgeText = "VIDEO",
  badgeSide = "bottom",
  ariaLabel = "Watch video",
}: {
  url: string;
  title: string;
  description?: string;
  className?: string;
  badgeText?: string;
  badgeSide?: "top" | "bottom";
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  const isDirectVideo = /\.(mp4|webm|ogg)$/i.test(url.split("?")[0]);
  const embedSrc = isDirectVideo ? url : formatEmbedUrl(url);

  return (
    <div className={`relative ${className}`}>
      {/* Curved circular label around video button - completely independent from Audio */}
      <VideoCurvedBadge text={badgeText} side={badgeSide} textColor="#b91c1c" />

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        title={`Watch Video: ${title}`}
        aria-label={ariaLabel}
        className="group relative flex items-center justify-center rounded-full transition-all duration-300 shadow-md page-overlay-btn bg-[#faf6ee] text-[#b91c1c] hover:bg-[#b91c1c] hover:text-white hover:scale-110 ring-1 ring-[#c8b89e] dark:bg-[#2b251f] dark:text-[#fca5a5] backdrop-blur-sm"
      >
        <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 pointer-events-none" />

        {/* Hover tooltip */}
        <span className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded-md bg-[#231e17]/95 px-2.5 py-1 text-xs font-serif text-[#fdfbf7] shadow-xl border border-[#524536] group-hover:flex items-center gap-1.5 z-30 transition-opacity">
          <Play className="w-3 h-3 fill-current text-red-400" />
          <span>Watch: {title}</span>
        </span>
      </button>

      {/* Expansive Theater-Size Video Dialog for PC Screens */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[96vw] max-w-6xl xl:max-w-7xl max-h-[95vh] p-3 sm:p-5 md:p-6 bg-slate-950/95 text-white border border-slate-800 shadow-2xl rounded-2xl backdrop-blur-xl">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2.5">
              <Video className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-xs sm:text-sm text-slate-400">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* 16:9 Large Video Container */}
          <div className="relative w-full aspect-video max-h-[82vh] rounded-xl overflow-hidden bg-black shadow-2xl border border-slate-800">
            {open && (
              isDirectVideo ? (
                <video
                  src={embedSrc}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                <iframe
                  src={embedSrc}
                  title={title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Fullscreen Image Viewer with swipe-to-change, serial navigation, and complete background element isolation
 */
function FullscreenImageViewer({
  images,
  currentIndex,
  onClose,
  onChangeIndex,
}: {
  images: PersonItem[];
  currentIndex: number;
  onClose: () => void;
  onChangeIndex: (newIndex: number) => void;
}) {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Lock body scroll and keyboard arrows while active
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onChangeIndex((currentIndex + 1) % images.length);
      if (e.key === "ArrowLeft") onChangeIndex((currentIndex - 1 + images.length) % images.length);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = origOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [currentIndex, images.length, onChangeIndex, onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);
    const dt = Date.now() - touchStartRef.current.time;

    // Detect horizontal swipe to change image serially
    if (Math.abs(dx) > 35 && dy < Math.abs(dx) * 1.2 && dt < 600) {
      if (dx < 0) {
        // Swipe left -> next image
        onChangeIndex((currentIndex + 1) % images.length);
      } else {
        // Swipe right -> previous image
        onChangeIndex((currentIndex - 1 + images.length) % images.length);
      }
    }
    touchStartRef.current = null;
  };

  const currentPerson = images[currentIndex];

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-6 select-none touch-none animate-in fade-in duration-200 pointer-events-auto"
      onClick={onClose}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onTouchStart={handleTouchStart}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Header: Counter & Close Button */}
      <div
        className="absolute top-3 sm:top-5 left-4 right-4 sm:left-6 sm:right-6 z-50 flex items-center justify-between pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-xs sm:text-sm font-serif font-medium text-white/90 bg-black/60 px-3.5 py-1.5 rounded-full border border-white/20 backdrop-blur-sm shadow-lg">
          {currentIndex + 1} / {images.length}
        </span>

        <button
          type="button"
          onClick={onClose}
          className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/25 text-white border border-white/20 transition-all cursor-pointer shadow-2xl hover:scale-110"
          aria-label="Close full view"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* Serial Prev Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onChangeIndex((currentIndex - 1 + images.length) % images.length);
        }}
        className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-50 p-2 sm:p-3 rounded-full bg-black/50 hover:bg-black/80 text-white/80 hover:text-white border border-white/20 transition-all cursor-pointer shadow-2xl hover:scale-110 pointer-events-auto"
        aria-label="Previous image"
      >
        <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
      </button>

      {/* Serial Next Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onChangeIndex((currentIndex + 1) % images.length);
        }}
        className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-50 p-2 sm:p-3 rounded-full bg-black/50 hover:bg-black/80 text-white/80 hover:text-white border border-white/20 transition-all cursor-pointer shadow-2xl hover:scale-110 pointer-events-auto"
        aria-label="Next image"
      >
        <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
      </button>

      {/* Full-Size Uncropped Image (Clicking outside on backdrop exits fullscreen) */}
      <div
        className="relative max-w-[92vw] max-h-[90vh] flex items-center justify-center cursor-default pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          key={currentPerson.imageUrl}
          src={currentPerson.imageUrl}
          alt={`মনীষীদের অভিব্যক্তি ${currentIndex + 1}`}
          className="max-h-[88vh] max-w-[90vw] w-auto h-auto object-contain rounded-xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] animate-in fade-in zoom-in-95 duration-200 select-none"
          draggable={false}
        />
      </div>

      {/* Bottom swipe hint */}
      <div className="absolute bottom-3 sm:bottom-5 z-40 text-[11px] sm:text-xs font-serif text-white/50 pointer-events-none">
        Swipe left / right to change image
      </div>
    </div>,
    document.body
  );
}

/**
 * Page 11 Button opening 8 Personalities Gallery with Book-Themed Styling and Curved Label
 */
export function Page11PersonsButton({
  className = "",
}: {
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedPersonIndex, setSelectedPersonIndex] = useState<number | null>(null);

  const { modalTitle, modalSubtitle, persons } = pageInteractions.page11;

  return (
    <div className={`relative ${className}`}>
      {/* Curved circular label on bottom of the button - completely independent */}
      <Page11CurvedBadge text="IMAGES" side="bottom" textColor="#8b2626" className="page11-badge-curved" />

      {/* Straight badge on the left side beside the button ONLY in mobile dual-page mode */}
      <span className="page11-badge-side hidden absolute right-full mr-2.5 top-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] font-black tracking-widest text-[#8b2626] select-none pointer-events-none drop-shadow-sm uppercase">
        IMAGES
      </span>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        title="হোমিওপ্যাথি নিয়ে মনীষীদের অভিব্যক্তি"
        aria-label="হোমিওপ্যাথি নিয়ে মনীষীদের অভিব্যক্তি"
        className="group relative flex items-center justify-center rounded-full transition-all duration-300 shadow-md page-overlay-btn bg-[#8b2626] text-white hover:bg-[#a63030] hover:scale-110 ring-2 ring-[#e6c89c] backdrop-blur-sm"
      >
        <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 pointer-events-none" />

        {/* Hover tooltip */}
        <span className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded-md bg-[#231e17]/95 px-2.5 py-1 text-xs font-serif text-[#fdfbf7] shadow-xl border border-[#524536] group-hover:flex items-center gap-1.5 z-30 transition-opacity">
          <Sparkles className="w-3 h-3 text-amber-300" />
          <span>মনীষীদের অভিব্যক্তি</span>
        </span>
      </button>

      {/* Book-Themed Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[90vh] overflow-y-auto p-3 sm:p-6 md:p-8 bg-[#fbf7f0] dark:bg-[#1e1b18] text-[#2b261f] dark:text-[#f3eee5] border-2 border-[#d6c7b2] dark:border-[#42392f] shadow-2xl rounded-2xl">
          <DialogHeader className="mb-4 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2.5">
              <span className="p-1.5 rounded-lg bg-[#8b2626] text-white shadow">
                <Users className="w-5 h-5 sm:w-6 sm:h-6" />
              </span>
              <DialogTitle className="text-xl sm:text-2xl md:text-3xl font-serif font-bold tracking-tight text-[#8b2626] dark:text-[#e06c6c]">
                {modalTitle}
              </DialogTitle>
            </div>
            {modalSubtitle && (
              <DialogDescription className="text-sm sm:text-base text-[#6b5e4d] dark:text-[#b0a290] mt-1 font-serif">
                {modalSubtitle}
              </DialogDescription>
            )}
            {/* Vintage decorative border separator */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-[#c4b59f] dark:via-[#524638] to-transparent my-2" />
          </DialogHeader>

          {/* Responsive Gallery Grid of 8 Persons (4 rows and 2 columns on mobile) */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5">
            {persons.map((person, index) => (
              <div
                key={person.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPersonIndex(index);
                }}
                className="group relative flex flex-col items-center bg-white/95 dark:bg-[#27221d] border border-[#ded5c5] dark:border-[#42392e] hover:border-[#8b2626] dark:hover:border-[#e06c6c] rounded-xl p-2 sm:p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer overflow-hidden"
              >
                {/* Image display with proper aspect ratio */}
                <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-[#f5efe4] dark:bg-[#181512] flex items-center justify-center border border-[#ece4d6] dark:border-[#383025]">
                  <img
                    src={person.imageUrl}
                    alt={`ব্যক্তিত্ব ${index + 1}`}
                    className="w-full h-full object-contain p-1 transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  {/* Hover zoom cue */}
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs bg-black/60 px-2 py-1 rounded backdrop-blur-sm">
                      View Full
                    </span>
                  </div>
                </div>

                <div className="w-full text-center mt-2">
                  <p className="font-serif font-bold text-xs sm:text-sm text-[#3b3228] dark:text-[#ede4d8] truncate">
                    {person.name || `ব্যক্তিত্ব ${index + 1}`}
                  </p>
                  {person.role && (
                    <p className="text-[11px] text-[#7a6c5b] dark:text-[#a89985] truncate font-serif">
                      {person.role}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-Screen Uncropped Image Viewer with swipe-to-change and backdrop blur */}
      {selectedPersonIndex !== null && typeof document !== "undefined" && (
        <FullscreenImageViewer
          images={persons}
          currentIndex={selectedPersonIndex}
          onClose={() => setSelectedPersonIndex(null)}
          onChangeIndex={(newIndex) => setSelectedPersonIndex(newIndex)}
        />
      )}
    </div>
  );
}

/**
 * Grouped vertical buttons for Cover page (Audio + Video)
 */
export function CoverPageButtons() {
  const { audio, video } = pageInteractions.cover;
  return (
    <PageInteractiveWrapper
      className="cover-buttons-group absolute flex flex-col gap-3.5 sm:gap-4 z-20"
      style={{
        left: "11%",
        top: "77%",
      }}
    >
      <PageAudioButton
        src={audio.src}
        title={audio.title}
        subtitle={audio.subtitle}
        badgeText="AUDIO"
        badgeSide="top"
        ariaLabel="Play cover audio"
      />
      <PageVideoButton
        url={video.url}
        title={video.title}
        description={video.description}
        badgeText="VIDEO"
        badgeSide="bottom"
        ariaLabel="Watch cover video"
      />
    </PageInteractiveWrapper>
  );
}

/**
 * Page 11 overlay beside red gems clip
 */
export function Page11Overlay() {
  return (
    <PageInteractiveWrapper
      className="absolute z-20"
      style={{
        left: "23%",
        top: "33.2%",
        transform: "translate(-50%, -50%)",
      }}
    >
      <Page11PersonsButton />
    </PageInteractiveWrapper>
  );
}

/**
 * Page 20 bottom-left audio button
 */
export function Page20AudioOverlay() {
  const { audio } = pageInteractions.page20;
  return (
    <PageInteractiveWrapper
      className="absolute z-20"
      style={{
        left: "8%",
        bottom: "6%",
      }}
    >
      <PageAudioButton
        src={audio.src}
        title={audio.title}
        subtitle={audio.subtitle}
        badgeText="AUDIO"
        badgeSide="bottom"
        ariaLabel="Read out Page 20"
      />
    </PageInteractiveWrapper>
  );
}
