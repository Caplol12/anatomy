"use client";

import { useEffect, useState, useCallback } from "react";

type Props = {
  text: string;
  speedMs?: number;
  className?: string;
  onComplete?: () => void;
};

export function TypewriterText({
  text,
  speedMs = 12,
  className = "",
  onComplete,
}: Props) {
  const [displayedLength, setDisplayedLength] = useState<number>(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return text.length;
    }
    return 0;
  });
  const [isSkipped, setIsSkipped] = useState<boolean>(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return true;
    }
    return false;
  });

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      return;
    }

    let current = 0;
    const interval = window.setInterval(() => {
      current += 2; // Fast & smooth 2 characters at a time
      if (current >= text.length) {
        setDisplayedLength(text.length);
        setIsSkipped(true);
        window.clearInterval(interval);
        onComplete?.();
      } else {
        setDisplayedLength(current);
      }
    }, speedMs);

    return () => window.clearInterval(interval);
  }, [text, speedMs, onComplete]);

  const handleSkip = useCallback(() => {
    setDisplayedLength(text.length);
    setIsSkipped(true);
    onComplete?.();
  }, [text.length, onComplete]);

  const isTyping = !isSkipped && displayedLength < text.length;

  return (
    <span
      className={`typewriter-container ${className} ${isTyping ? "is-typing" : ""}`}
      onClick={handleSkip}
      title={isTyping ? "Click to reveal all" : undefined}
      style={{ cursor: isTyping ? "pointer" : "inherit" }}
    >
      {text.slice(0, displayedLength)}
      {isTyping && <span className="typewriter-cursor" aria-hidden="true">▍</span>}
    </span>
  );
}
