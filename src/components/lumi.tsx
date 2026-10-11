"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";

interface LumiProps {
  pose?: "idle" | "thinking" | "cheer" | "sympathy" | "surprised" | "sleeping";
  size?: number;
  className?: string;
  animated?: boolean;
}

/**
 * Animated Lumi — the Wissensgipfel mascot.
 * Continuous idle motion: breathing (scale), head tilt, eye blink.
 * Pose-based expressions that transition smoothly via GSAP.
 */
export function Lumi({ pose = "idle", size = 96, className, animated = true }: LumiProps) {
  const bodyRef = useRef<SVGGElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const leftEyeRef = useRef<SVGCircleElement>(null);
  const rightEyeRef = useRef<SVGCircleElement>(null);
  const leftBrowRef = useRef<SVGRectElement>(null);
  const rightBrowRef = useRef<SVGRectElement>(null);
  const leftCheekRef = useRef<SVGCircleElement>(null);
  const rightCheekRef = useRef<SVGCircleElement>(null);
  const beakRef = useRef<SVGPathElement>(null);

  // Idle breathing + head sway
  useEffect(() => {
    if (!animated || !bodyRef.current) return;
    const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const tl = gsap.timeline({ repeat: -1, yoyo: true });
    tl.to(bodyRef.current, {
      scale: 1.025,
      transformOrigin: "center bottom",
      duration: 2.2,
      ease: "sine.inOut",
    });

    const headTl = gsap.timeline({ repeat: -1, yoyo: true });
    headTl.to(headRef.current, {
      rotation: 3,
      transformOrigin: "center center",
      duration: 3.5,
      ease: "sine.inOut",
    }).to(headRef.current, {
      rotation: -3,
      duration: 3.5,
      ease: "sine.inOut",
    });

    return () => {
      tl.kill();
      headTl.kill();
    };
  }, [animated]);

  // Blinking — every 3-5 seconds, quick double-blink
  useEffect(() => {
    if (!animated || !leftEyeRef.current || !rightEyeRef.current) return;
    const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    let blinkTl: gsap.core.Timeline | null = null;
    const blink = () => {
      blinkTl = gsap.timeline();
      blinkTl
        .to([leftEyeRef.current, rightEyeRef.current], { scaleY: 0.1, duration: 0.08, transformOrigin: "center", ease: "power2.in" })
        .to([leftEyeRef.current, rightEyeRef.current], { scaleY: 1, duration: 0.1, ease: "power2.out" })
        .to([leftEyeRef.current, rightEyeRef.current], { scaleY: 0.1, duration: 0.08, transformOrigin: "center" }, "+=0.05")
        .to([leftEyeRef.current, rightEyeRef.current], { scaleY: 1, duration: 0.1, ease: "power2.out" });
    };
    const interval = setInterval(blink, 3000 + Math.random() * 2000);
    return () => {
      clearInterval(interval);
      blinkTl?.kill();
    };
  }, [animated]);

  // Pose-based expression
  useEffect(() => {
    if (!animated) return;
    const brows = [leftBrowRef.current, rightBrowRef.current].filter(Boolean) as SVGRectElement[];
    const cheeks = [leftCheekRef.current, rightCheekRef.current].filter(Boolean) as SVGCircleElement[];

    switch (pose) {
      case "surprised":
        gsap.to(brows, { y: -4, rotation: -15, duration: 0.4, stagger: 0.05, ease: "back.out(2)" });
        gsap.to(cheeks, { attr: { opacity: 0.85 }, duration: 0.3 });
        gsap.to(beakRef.current, { scaleY: 0.7, transformOrigin: "center", duration: 0.2 });
        break;
      case "cheer":
        gsap.to(brows, { y: -3, rotation: 0, duration: 0.4, ease: "back.out(2)" });
        gsap.to(cheeks, { attr: { opacity: 0.85 }, duration: 0.3 });
        gsap.to(beakRef.current, { scaleY: 1, transformOrigin: "center", duration: 0.2 });
        // Little hop
        gsap.fromTo(bodyRef.current, { y: 0 }, { y: -6, duration: 0.2, yoyo: true, repeat: 1, ease: "power2.out" });
        break;
      case "sympathy":
        gsap.to(brows, { y: 2, rotation: 8, duration: 0.4, stagger: 0.05 });
        gsap.to(cheeks, { attr: { opacity: 0.6 }, duration: 0.3 });
        gsap.to(beakRef.current, { scaleY: 0.85, transformOrigin: "center", duration: 0.2 });
        break;
      case "thinking":
        gsap.to(leftBrowRef.current, { y: -2, rotation: -5, duration: 0.4 });
        gsap.to(rightBrowRef.current, { y: 1, rotation: 5, duration: 0.4 });
        gsap.to(cheeks, { attr: { opacity: 0 }, duration: 0.3 });
        gsap.to(beakRef.current, { scaleY: 1, transformOrigin: "center", duration: 0.2 });
        break;
      case "sleeping":
        gsap.to(brows, { y: 3, rotation: 0, duration: 0.4 });
        gsap.to(cheeks, { attr: { opacity: 0 }, duration: 0.3 });
        break;
      default: // idle
        gsap.to(brows, { y: 0, rotation: 0, duration: 0.4 });
        gsap.to(cheeks, { attr: { opacity: 0 }, duration: 0.3 });
        gsap.to(beakRef.current, { scaleY: 1, transformOrigin: "center", duration: 0.2 });
    }
  }, [pose, animated]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label="Lumi, die Eule"
      className={cn("select-none drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]", className)}
    >
      <defs>
        <radialGradient id="lumi-body" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#9F8CFF" />
          <stop offset="100%" stopColor="#5A4BCA" />
        </radialGradient>
        <radialGradient id="lumi-belly" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F5F3FF" />
          <stop offset="100%" stopColor="#C9C0FF" />
        </radialGradient>
        <filter id="lumi-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g ref={bodyRef}>
        {/* Body (rounded owl silhouette) */}
        <ellipse cx="60" cy="68" rx="44" ry="42" fill="url(#lumi-body)" />
        {/* Belly */}
        <ellipse cx="60" cy="76" rx="28" ry="26" fill="url(#lumi-belly)" opacity="0.95" />

        {/* Ear tufts */}
        <path d="M 22 30 L 30 18 L 36 32 Z" fill="#5A4BCA" />
        <path d="M 98 30 L 90 18 L 84 32 Z" fill="#5A4BCA" />

        {/* Head group (for tilt) */}
        <g ref={headRef}>
          {/* Eye discs (large circles) */}
          <circle cx="44" cy="56" r="16" fill="#F5F3FF" filter="url(#lumi-glow)" />
          <circle cx="76" cy="56" r="16" fill="#F5F3FF" filter="url(#lumi-glow)" />
          {/* Pupils */}
          <g>
            <circle ref={leftEyeRef} cx="46" cy="58" r="7" fill="#1A1238" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
            <circle ref={rightEyeRef} cx="78" cy="58" r="7" fill="#1A1238" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
          </g>
          {/* Sparkle */}
          <circle cx="44" cy="55" r="2" fill="#F5F3FF" />
          <circle cx="76" cy="55" r="2" fill="#F5F3FF" />
          {/* Eyebrows */}
          <rect ref={leftBrowRef} x="36" y="40" width="16" height="2.5" rx="1.25" fill="#3D2F8F" opacity="0.7" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
          <rect ref={rightBrowRef} x="68" y="40" width="16" height="2.5" rx="1.25" fill="#3D2F8F" opacity="0.7" style={{ transformBox: "fill-box", transformOrigin: "center" }} />

          {/* Beak */}
          <path ref={beakRef} d="M 60 66 L 54 72 Q 60 78 66 72 Z" fill="#FFC83D" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
          <path d="M 54 72 L 60 76 L 66 72 Z" fill="#E59A00" />

          {/* Cheeks */}
          <circle ref={leftCheekRef} cx="34" cy="72" r="5" fill="#FF6B7A" opacity="0" />
          <circle ref={rightCheekRef} cx="86" cy="72" r="5" fill="#FF6B7A" opacity="0" />
        </g>

        {/* Feet */}
        <ellipse cx="48" cy="108" rx="6" ry="3" fill="#FFC83D" />
        <ellipse cx="72" cy="108" rx="6" ry="3" fill="#FFC83D" />
      </g>
    </svg>
  );
}
