"use client";

import { createContext, useCallback, useContext, useState } from "react";
import ReactConfetti from "react-confetti";

// The brand blue and oranges, plus the pending yellow, in shades that show on
// both themes. The canvas needs plain colors, so the CSS tokens can't be used.
const COLORS = ["#6f75ff", "#ff5600", "#ff7a33", "#f2c14e"];

const CelebrateContext = createContext<() => void>(() => {});

// Lives above the pages, so the confetti keeps falling after the form that
// started it closes or remounts
export function ConfettiProvider({ children }: { children: React.ReactNode }) {
  // A new id on every burst restarts the animation, even mid-fall
  const [burst, setBurst] = useState<{ id: number; width: number; height: number }>();

  const celebrate = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setBurst({ id: Date.now(), width: window.innerWidth, height: window.innerHeight });
  }, []);

  return (
    <CelebrateContext value={celebrate}>
      {children}
      {burst && (
        <ReactConfetti
          key={burst.id}
          data-testid="confetti"
          aria-hidden
          width={burst.width}
          height={burst.height}
          colors={COLORS}
          numberOfPieces={300}
          // All pieces come out within a second, so it reads as a burst
          // rather than the default slow trickle
          tweenDuration={1000}
          gravity={0.2}
          recycle={false}
          onConfettiComplete={() => setBurst(undefined)}
          // Fixed, so it covers the screen however far the page is scrolled
          style={{ position: "fixed", zIndex: 50 }}
        />
      )}
    </CelebrateContext>
  );
}

export function useCelebrate() {
  return useContext(CelebrateContext);
}
