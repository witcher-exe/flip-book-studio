import { useEffect, useRef, useState } from "react";

/** Dev-only frame-rate overlay. Toggle with Shift+F. */
export function FpsMeter() {
  const [visible, setVisible] = useState(false);
  const [fps, setFps] = useState(0);
  const frames = useRef(0);
  const since = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "F" || e.key === "f")) setVisible((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!visible) return;
    let raf = 0;
    since.current = performance.now();
    frames.current = 0;
    const tick = (now: number) => {
      frames.current += 1;
      const elapsed = now - since.current;
      if (elapsed >= 500) {
        setFps(Math.round((frames.current * 1000) / elapsed));
        frames.current = 0;
        since.current = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="fixed bottom-3 left-3 z-50 rounded-md bg-foreground/85 px-2 py-1 font-mono text-xs text-background">
      {fps} fps
    </div>
  );
}
