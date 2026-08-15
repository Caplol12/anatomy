import React from "react";

type IconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

/**
 * Custom line-art atelier emblem:
 * Blends a subtle anatomical heart contour with a celestial atelier star & compass lines.
 * Styled with strokeWidth=1.7 to match lucide-react aesthetics seamlessly.
 */
export function AtelierLogoIcon({
  size = 22,
  className = "",
  strokeWidth = 1.7,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`atelier-logo-icon ${className}`}
      aria-hidden="true"
    >
      {/* Outer subtle anatomical chamber arc */}
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" opacity="0.45" strokeDasharray="2 2" />
      {/* Inner compass / atelier crosshairs */}
      <circle cx="12" cy="10" r="4.5" />
      <path d="M12 2.5v3M12 14.5v4" />
      <path d="M4.5 10h3M16.5 10h3" />
      {/* Center 4-point star accent */}
      <path d="M12 8.5l.6 1 1 .5-1 .5-.6 1-.5-1-1-.5 1-.5.5-1z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Custom linear line-art heart pulse for the splash/loading screen
 */
export function AtelierHeartPulse({
  size = 48,
  className = "",
  strokeWidth = 1.6,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`atelier-heart-pulse ${className}`}
      aria-hidden="true"
    >
      {/* Anatomical Heart Path with drawing trace */}
      <path
        className="pulse-path"
        d="M24 41.5 C16 35 6 28 6 18 C6 11 11.5 6 18.5 6 C22.5 6 25 8.5 24 10 C23 8.5 25.5 6 29.5 6 C36.5 6 42 11 42 18 C42 28 32 35 24 41.5 Z"
      />
      {/* Inner ECG pulse trace */}
      <path
        className="pulse-ecg"
        d="M10 20 h6 l3 -5 l5 11 l4 -8 l3 4 h7"
      />
    </svg>
  );
}

/**
 * Custom archival seal icon for curiosity cards and specimen badges
 */
export function AtelierArchivalSeal({
  size = 18,
  className = "",
  strokeWidth = 1.7,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`atelier-archival-seal ${className}`}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      <path d="M8 8l8 8M16 8l-8 8" strokeDasharray="1.5 2.5" opacity="0.6" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}
