import React from "react";

type IconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

export { AtelierLogoIcon } from "./AtelierLogoIcon";

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
