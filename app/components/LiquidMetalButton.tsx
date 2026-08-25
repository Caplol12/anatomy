"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { LiquidMetalButton as ThreeUiLiquidMetalButton } from "@designcodeio/threeui";

export type LiquidMetalVariant =
  | "teal"
  | "cyan"
  | "purple"
  | "gold"
  | "ruby"
  | "silver"
  | "dark-chrome";

export type LiquidMetalSize =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "pill"
  | "icon"
  | "icon-sm"
  | "icon-lg"
  | "block";

export interface LiquidMetalButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: LiquidMetalVariant;
  size?: LiquidMetalSize;
  glow?: boolean;
  active?: boolean;
  icon?: React.ReactNode;
  iconTrailing?: React.ReactNode;
  badge?: React.ReactNode;
  asAnchor?: boolean;
  href?: string;
  target?: string;
  rel?: string;
  useThreeUiIframe?: boolean;
  threeUiVariant?: "pill" | "circle" | "play";
  threeUiDiameter?: number;
  threeUiStrokeWidth?: number;
  threeUiRendering?: "colored" | "monotone";
}

/**
 * LiquidMetalButton - A high-performance, prismatic liquid-metal interactive button.
 * Incorporates dynamic pointer-following specular bloom, chromatic flow sheen,
 * and glowing liquid mercury borders inspired by @designcodeio/threeui.
 */
export const LiquidMetalButton = React.forwardRef<
  HTMLButtonElement,
  LiquidMetalButtonProps
>(function LiquidMetalButton(
  {
    variant = "teal",
    size = "md",
    glow = true,
    active = false,
    disabled = false,
    icon,
    iconTrailing,
    badge,
    children,
    className = "",
    style = {},
    onClick,
    asAnchor = false,
    href,
    target,
    rel,
    useThreeUiIframe = false,
    threeUiVariant = "pill",
    threeUiDiameter = 88,
    threeUiStrokeWidth = 3,
    threeUiRendering = "colored",
    ...restProps
  },
  forwardedRef
) {
  const innerRef = useRef<HTMLButtonElement>(null);
  const buttonRef = (forwardedRef as React.RefObject<HTMLButtonElement>) || innerRef;
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [coords, setCoords] = useState({ x: 50, y: 50, angle: 45 });
  const rafId = useRef<number | null>(null);

  // Smooth pointer tracking for liquid chrome specular sheen
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement | HTMLAnchorElement>) => {
      if (disabled) return;
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      const xPercent = Math.min(100, Math.max(0, (clientX / rect.width) * 100));
      const yPercent = Math.min(100, Math.max(0, (clientY / rect.height) * 100));

      const deltaX = clientX - rect.width / 2;
      const deltaY = clientY - rect.height / 2;
      const rad = Math.atan2(deltaY, deltaX);
      const deg = (rad * (180 / Math.PI) + 360) % 360;

      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        setCoords({
          x: Math.round(xPercent * 10) / 10,
          y: Math.round(yPercent * 10) / 10,
          angle: Math.round(deg),
        });
      });
    },
    [disabled]
  );

  const handlePointerEnter = useCallback(
    (e: React.PointerEvent<HTMLButtonElement | HTMLAnchorElement>) => {
      if (disabled) return;
      setIsHovered(true);
      handlePointerMove(e);
    },
    [disabled, handlePointerMove]
  );

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false);
    setIsPressed(false);
    if (rafId.current !== null) cancelAnimationFrame(rafId.current);
  }, []);

  const handlePointerDown = useCallback(() => {
    if (!disabled) setIsPressed(true);
  }, [disabled]);

  const handlePointerUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  useEffect(() => {
    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, []);

  // Direct ThreeUI WebGL Iframe Renderer Mode
  if (useThreeUiIframe) {
    const textContent =
      typeof children === "string"
        ? children
        : restProps["aria-label"] || "Button";

    return (
      <div
        className={`threeui-metal-wrapper variant-${variant} ${className}`}
        style={
          {
            width: threeUiDiameter ? `${threeUiDiameter}px` : "auto",
            height: threeUiDiameter ? `${threeUiDiameter}px` : "auto",
            ...style,
          } as React.CSSProperties
        }
      >
        <ThreeUiLiquidMetalButton
          variant={threeUiVariant}
          diameter={threeUiDiameter}
          strokeWidth={threeUiStrokeWidth}
          rendering={threeUiRendering}
          text={textContent}
          onClick={onClick as any}
        />
      </div>
    );
  }

  const customStyle: React.CSSProperties = {
    ...style,
    "--liquid-mouse-x": `${coords.x}%`,
    "--liquid-mouse-y": `${coords.y}%`,
    "--liquid-mouse-angle": `${coords.angle}deg`,
  } as React.CSSProperties;

  const buttonClasses = [
    "liquid-metal-btn",
    `lmb-variant-${variant}`,
    `lmb-size-${size}`,
    glow ? "lmb-glow" : "",
    active ? "lmb-active" : "",
    isHovered ? "lmb-hovered" : "",
    isPressed ? "lmb-pressed" : "",
    disabled ? "lmb-disabled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const innerContent = (
    <>
      {/* 1. Deep Ambient Metal Glow */}
      <span className="lmb-aura" aria-hidden="true" />

      {/* 2. Prismatic Liquid Border Ring */}
      <span className="lmb-border" aria-hidden="true" />

      {/* 3. Liquid Metal Chrome Plate & Specular Highlight */}
      <span className="lmb-plate" aria-hidden="true">
        <span className="lmb-specular" />
        <span className="lmb-stream" />
        <span className="lmb-iridescence" />
      </span>

      {/* 4. Foreground Content */}
      <span className="lmb-content">
        {icon && <span className="lmb-icon lmb-icon-lead">{icon}</span>}
        {children && <span className="lmb-label">{children}</span>}
        {iconTrailing && (
          <span className="lmb-icon lmb-icon-trail">{iconTrailing}</span>
        )}
        {badge && <span className="lmb-badge">{badge}</span>}
      </span>

      {/* 5. Ripple Pulse Wave */}
      <span className="lmb-ripple" aria-hidden="true" />
    </>
  );

  if (asAnchor && href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        className={buttonClasses}
        style={customStyle}
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        aria-disabled={disabled}
        {...(restProps as any)}
      >
        {innerContent}
      </a>
    );
  }

  return (
    <button
      ref={buttonRef}
      disabled={disabled}
      className={buttonClasses}
      style={customStyle}
      onClick={onClick}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      {...restProps}
    >
      {innerContent}
    </button>
  );
});

LiquidMetalButton.displayName = "LiquidMetalButton";

export default LiquidMetalButton;
