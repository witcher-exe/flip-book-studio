import { useCallback, useEffect, useRef, useState } from "react";

export type RifflePhase = "idle" | "accelerate" | "cruise" | "decelerate";

export interface PageFlipLike {
  turnToPage: (index: number) => void;
  flip: (index: number) => void;
  flipNext: () => void;
  flipPrev: () => void;
  getCurrentPageIndex: () => number;
}

const MAX_STEPS = 40;
/** Sequence budget; the animated settle flip runs after this. */
const MAX_SEQUENCE_MS = 1600;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function phaseFor(t: number): RifflePhase {
  if (t < 0.2) return "accelerate";
  if (t < 0.8) return "cruise";
  return "decelerate";
}

function durationFor(t: number): number {
  if (t < 0.2) return 250 + (40 - 250) * (t / 0.2);
  if (t < 0.8) return 35;
  return 40 + (350 - 40) * ((t - 0.8) / 0.2);
}

export function useRiffleJump(
  getFlip: () => PageFlipLike | null,
  totalPages: number,
  onSettle?: (pageNumber: number) => void,
) {
  const [phase, setPhase] = useState<RifflePhase>("idle");
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    runningRef.current = false;
    setPhase("idle");
  }, []);

  useEffect(() => () => stop(), [stop]);

  const jumpToPage = useCallback(
    (targetPageNumber: number) => {
      const flip = getFlip();
      if (!flip) return;

      const to = Math.max(0, Math.min(totalPages - 1, targetPageNumber - 1));
      const from = flip.getCurrentPageIndex();
      const distance = Math.abs(to - from);
      if (distance === 0) return;

      stop();

      if (distance <= 2 || prefersReducedMotion()) {
        if (prefersReducedMotion()) {
          flip.turnToPage(to);
          onSettle?.(to + 1);
        } else {
          flip.flip(to);
        }
        return;
      }

      const steps = Math.min(distance, MAX_STEPS);
      const dir = to > from ? 1 : -1;

      const indices: number[] = [];
      const durations: number[] = [];
      for (let i = 1; i <= steps; i += 1) {
        const travelled = Math.round((i * distance) / steps);
        indices.push(i === steps ? to : from + travelled * dir);
        durations.push(durationFor((i - 1) / (steps - 1)));
      }

      const rawTotal = durations.reduce((a, b) => a + b, 0);
      // Logarithmic budget: distance buys cruise time, never wall-clock pain.
      const budget = Math.min(MAX_SEQUENCE_MS, 350 + 260 * Math.log2(1 + distance));
      const scale = rawTotal > budget ? budget / rawTotal : 1;

      runningRef.current = true;
      let step = 0;
      let last = performance.now();
      let acc = 0;
      setPhase("accelerate");

      const tick = (now: number) => {
        if (!runningRef.current) return;
        // Delta-time driven: correct on 60 / 90 / 120 / 144Hz displays alike.
        acc += now - last;
        last = now;

        let guard = 0;
        while (step < indices.length && acc >= durations[step]! * scale && guard < 8) {
          acc -= durations[step]! * scale;
          guard += 1;
          const isLast = step === indices.length - 1;
          const target = indices[step]!;
          const current = getFlip();
          if (!current) {
            stop();
            return;
          }
          if (isLast) {
            current.flip(target);
            onSettle?.(target + 1);
            stop();
            return;
          }
          current.turnToPage(target);
          setPhase(phaseFor(step / (indices.length - 1)));
          step += 1;
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    },
    [getFlip, onSettle, stop, totalPages],
  );

  return { jumpToPage, phase, isRiffling: phase !== "idle", cancelRiffle: stop };
}
