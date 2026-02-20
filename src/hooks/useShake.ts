import { useCallback, useEffect, useRef, useState } from "react";

export function useShake(durationMs = 220) {
  const [isShaking, setIsShaking] = useState(false);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const triggerShake = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
    }
    // Force a reflow by toggling off, then on next frame.
    setIsShaking(false);
    rafRef.current = window.requestAnimationFrame(() => {
      setIsShaking(true);
      timerRef.current = window.setTimeout(() => {
        setIsShaking(false);
        timerRef.current = null;
      }, durationMs);
    });
  }, [durationMs]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return { isShaking, triggerShake };
}
