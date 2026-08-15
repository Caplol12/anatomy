"use client";

import { useEffect, useState } from "react";
import { AtelierHeartPulse } from "./AtelierIcons";

type Props = {
  brandTitle: string;
  tagline: string;
  onLoaded?: () => void;
};

export function AtelierSplashLoader({ brandTitle, tagline, onLoaded }: Props) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Check if reduced motion is requested
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const fadeDelay = prefersReducedMotion ? 200 : 750;
    const hideDelay = fadeDelay + 400;

    const fadeTimer = window.setTimeout(() => {
      setFading(true);
    }, fadeDelay);

    const hideTimer = window.setTimeout(() => {
      setVisible(false);
      onLoaded?.();
    }, hideDelay);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [onLoaded]);

  if (!visible) return null;

  return (
    <div
      className={`atelier-splash-screen ${fading ? "is-fading" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Loading Digi Anatomy"
    >
      <div className="splash-ambient-glow" />
      <div className="splash-card">
        <div className="splash-icon-holder">
          <AtelierHeartPulse size={54} />
          <div className="splash-pulse-halo" />
        </div>
        <h1 className="splash-brand-title">
          {brandTitle}
          <sup>✦</sup>
        </h1>
        <p className="splash-tagline">{tagline}</p>
        <div className="splash-progress-track">
          <div className="splash-progress-bar" />
        </div>
      </div>
    </div>
  );
}
