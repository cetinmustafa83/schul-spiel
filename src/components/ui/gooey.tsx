"use client";

import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * Gooey filter system — reusable SVG gooey/blob effects.
 *
 * The classic feGaussianBlur + feColorMatrix technique creates a "liquid metal"
 * merging effect where separate blobs blend together organically.
 *
 * Usage:
 *   <GooeyContainer id="my-gooey">
 *     <GooeyBlob />
 *     <GooeyBlob />
 *   </GooeyContainer>
 *
 * The filter is defined once globally (GooeyFilterDefs) and referenced by
 * `filter: url(#gooey-{id})` on any container.
 */

// ============================================================================
// Global SVG filter definitions — rendered once, referenced everywhere
// ============================================================================

let filterCounter = 0;

export function GooeyFilterDefs() {
  return (
    <svg className="absolute h-0 w-0" aria-hidden="true">
      <defs>
        {/* Standard gooey filter — moderate blur + alpha matrix */}
        <filter id="gooey-standard">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
            result="gooey"
          />
          <feBlend in="SourceGraphic" in2="gooey" />
        </filter>
        {/* Soft gooey — lighter blur for subtle effects */}
        <filter id="gooey-soft">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 15 -6"
            result="gooey"
          />
          <feBlend in="SourceGraphic" in2="gooey" />
        </filter>
        {/* Strong gooey — heavy blur for dramatic merges */}
        <filter id="gooey-strong">
          <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"
            result="gooey"
          />
          <feBlend in="SourceGraphic" in2="gooey" />
        </filter>
      </defs>
    </svg>
  );
}

// ============================================================================
// GooeyContainer — wraps children with the gooey filter applied
// ============================================================================

interface GooeyContainerProps {
  children: ReactNode;
  variant?: "standard" | "soft" | "strong";
  className?: string;
  style?: CSSProperties;
}

export function GooeyContainer({ children, variant = "standard", className, style }: GooeyContainerProps) {
  return (
    <div
      className={cn("relative", className)}
      style={{
        filter: `url(#gooey-${variant})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ============================================================================
// GooeyBlob — a single animated blob (use inside GooeyContainer)
// ============================================================================

interface GooeyBlobProps {
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
  animated?: boolean;
}

export function GooeyBlob({ size = 40, color = "#6a7a9a", className, style, animated = true }: GooeyBlobProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animated || !ref.current) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const el = ref.current;
    const animate = () => {
      const x = (Math.random() - 0.5) * 20;
      const y = (Math.random() - 0.5) * 20;
      const scale = 0.9 + Math.random() * 0.2;
      el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      el.style.transition = `transform ${2 + Math.random() * 2}s ease-in-out`;
    };
    animate();
    const interval = setInterval(animate, 2500 + Math.random() * 1500);
    return () => clearInterval(interval);
  }, [animated]);

  return (
    <div
      ref={ref}
      className={cn("pointer-events-none absolute rounded-full", className)}
      style={{
        width: size,
        height: size,
        background: color,
        ...style,
      }}
    />
  );
}

// ============================================================================
// GooeyButton — button with liquid blob hover effect
// ============================================================================

interface GooeyButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: "standard" | "soft" | "strong";
  blobColor?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  size?: "sm" | "md" | "lg";
}

export function GooeyButton({
  children,
  onClick,
  className,
  variant = "standard",
  blobColor = "rgba(106, 122, 154, 0.5)",
  disabled = false,
  type = "button",
  size = "md",
}: GooeyButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const blob1Ref = useRef<HTMLDivElement>(null);
  const blob2Ref = useRef<HTMLDivElement>(null);
  const blob3Ref = useRef<HTMLDivElement>(null);

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-bg1/60 font-display font-semibold text-ink backdrop-blur transition-colors",
        "hover:border-ink-dim/30 hover:bg-bg1/80",
        "disabled:cursor-not-allowed disabled:opacity-50",
        sizes[size],
        className,
      )}
    >
      {/* Gooey blobs — visible on hover */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          filter: hovered ? `url(#gooey-${variant})` : "none",
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.3s",
        }}
      >
        <div
          ref={blob1Ref}
          className="absolute h-12 w-12 rounded-full"
          style={{
            background: blobColor,
            left: "10%",
            top: "50%",
            transform: hovered ? "translateY(-50%) scale(1)" : "translateY(-50%) scale(0)",
            transition: `transform ${pressed ? "0.2s" : "0.5s"} cubic-bezier(0.34, 1.56, 0.64, 1)`,
          }}
        />
        <div
          ref={blob2Ref}
          className="absolute h-10 w-10 rounded-full"
          style={{
            background: blobColor,
            right: "15%",
            top: "30%",
            transform: hovered ? "scale(1)" : "scale(0)",
            transition: `transform ${pressed ? "0.2s" : "0.6s"} cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s`,
          }}
        />
        <div
          ref={blob3Ref}
          className="absolute h-8 w-8 rounded-full"
          style={{
            background: blobColor,
            left: "50%",
            bottom: "20%",
            transform: hovered ? "translateX(-50%) scale(1)" : "translateX(-50%) scale(0)",
            transition: `transform ${pressed ? "0.2s" : "0.55s"} cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s`,
          }}
        />
      </div>

      {/* Button content — sits above the gooey layer */}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

// ============================================================================
// GooeyTransition — blob morph in/out for screen transitions
// ============================================================================

interface GooeyTransitionProps {
  children: ReactNode;
  trigger: unknown; // when this changes, play the transition
  className?: string;
}

export function GooeyTransition({ children, trigger, className }: GooeyTransitionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const el = ref.current;
    const blobs = el.querySelectorAll<HTMLElement>("[data-transition-blob]");

    // Play morph-in animation
    blobs.forEach((blob, i) => {
      blob.style.transition = "none";
      blob.style.transform = "scale(0)";
      blob.style.opacity = "0";
      // Force reflow
      void blob.offsetHeight;
      blob.style.transition = `transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.05}s, opacity 0.3s ${i * 0.05}s`;
      blob.style.transform = "scale(1)";
      blob.style.opacity = "1";
    });

    // Fade in content after blobs merge
    const content = el.querySelector("[data-transition-content]") as HTMLElement;
    if (content) {
      content.style.opacity = "0";
      content.style.transition = "opacity 0.4s 0.3s";
      void content.offsetHeight;
      content.style.opacity = "1";
    }
  }, [trigger]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {/* Gooey blob layer */}
      <div
        className="pointer-events-none absolute inset-0 z-20"
        style={{ filter: "url(#gooey-standard)" }}
        aria-hidden="true"
      >
        <div
          data-transition-blob
          className="absolute left-1/4 top-1/3 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bg1"
        />
        <div
          data-transition-blob
          className="absolute right-1/4 bottom-1/3 h-20 w-20 translate-x-1/2 translate-y-1/2 rounded-full bg-bg1"
        />
        <div
          data-transition-blob
          className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bg1"
        />
      </div>
      {/* Content */}
      <div data-transition-content className="relative z-10">
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// MetaBlobs — ambient floating meta blobs for background atmosphere
// ============================================================================

interface MetaBlobsProps {
  className?: string;
  count?: number;
  colors?: string[];
  maxSize?: number;
  reducedMotion?: boolean;
}

export function MetaBlobs({
  className,
  count = 5,
  colors = ["rgba(106, 122, 154, 0.15)", "rgba(139, 108, 255, 0.08)", "rgba(92, 200, 255, 0.06)"],
  maxSize = 200,
  reducedMotion = false,
}: MetaBlobsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const blobsRef = useRef<Array<{ el: HTMLDivElement; x: number; y: number; vx: number; vy: number }>>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (reducedMotion || !containerRef.current) return;
    const container = containerRef.current;
    const blobs = blobsRef.current;

    const animate = () => {
      for (const blob of blobs) {
        blob.x += blob.vx;
        blob.y += blob.vy;
        // Bounce off edges
        const rect = container.getBoundingClientRect();
        if (blob.x < 0 || blob.x > rect.width) blob.vx *= -1;
        if (blob.y < 0 || blob.y > rect.height) blob.vy *= -1;
        blob.el.style.transform = `translate(${blob.x}px, ${blob.y}px)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => cancelAnimationFrame(rafRef.current);
  }, [reducedMotion]);

  const blobs = Array.from({ length: count }, (_, i) => {
    const size = 80 + Math.random() * (maxSize - 80);
    const color = colors[i % colors.length];
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    return { size, color, x, y, index: i };
  });

  return (
    <div
      ref={containerRef}
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden="true"
      style={{ filter: "url(#gooey-soft)" }}
    >
      {blobs.map((blob) => (
        <div
          key={blob.index}
          ref={(el) => {
            if (el && !reducedMotion) {
              const rect = containerRef.current?.getBoundingClientRect();
              const w = rect?.width ?? 800;
              const h = rect?.height ?? 600;
              blobsRef.current[blob.index] = {
                el,
                x: (blob.x / 100) * w,
                y: (blob.y / 100) * h,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
              };
            }
          }}
          className="absolute rounded-full"
          style={{
            width: blob.size,
            height: blob.size,
            background: blob.color,
            left: 0,
            top: 0,
          }}
        />
      ))}
    </div>
  );
}
