"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";
import { ParticleField } from "./particle-field";

interface AnimatedBackgroundProps {
  className?: string;
  reducedMotion?: boolean;
  /** Whether to show floating particles */
  particles?: boolean;
  particleType?: "embers" | "dust" | "fireflies" | "snow";
  particleCount?: number;
}

/**
 * "Twilight Summit" animated background.
 * Layers (back to front):
 *   1. Animated gradient mesh (slowly shifting colors)
 *   2. Star field (parallax with mouse)
 *   3. Distant mountain ridge (silhouette, slow drift)
 *   4. Near mountain ridge (silhouette, medium drift)
 *   5. Drifting fog (two layers, gentle horizontal motion)
 *   6. Floating particles (embers/dust/fireflies)
 *
 * The whole thing reacts to mouse movement with parallax depth.
 */
export function AnimatedBackground({
  className,
  reducedMotion = false,
  particles = true,
  particleType = "embers",
  particleCount = 40,
}: AnimatedBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);
  const farRidgeRef = useRef<SVGSVGElement>(null);
  const nearRidgeRef = useRef<SVGSVGElement>(null);
  const fog1Ref = useRef<HTMLDivElement>(null);
  const fog2Ref = useRef<HTMLDivElement>(null);

  // Parallax on mouse move
  useEffect(() => {
    if (reducedMotion) return;
    const container = containerRef.current;
    if (!container) return;

    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    let rafId = 0;

    const handleMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      targetX = (e.clientX - rect.left) / rect.width - 0.5;
      targetY = (e.clientY - rect.top) / rect.height - 0.5;
    };

    const tick = () => {
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;
      if (starsRef.current) {
        starsRef.current.style.transform = `translate(${mouseX * 20}px, ${mouseY * 10}px)`;
      }
      if (farRidgeRef.current) {
        farRidgeRef.current.style.transform = `translateX(${mouseX * 15}px)`;
      }
      if (nearRidgeRef.current) {
        nearRidgeRef.current.style.transform = `translateX(${mouseX * 30}px)`;
      }
      if (fog1Ref.current) {
        fog1Ref.current.style.transform = `translateX(${mouseX * 40}px)`;
      }
      if (fog2Ref.current) {
        fog2Ref.current.style.transform = `translateX(${mouseX * 60}px)`;
      }
      rafId = requestAnimationFrame(tick);
    };
    tick();

    container.addEventListener("mousemove", handleMove);
    return () => {
      container.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(rafId);
    };
  }, [reducedMotion]);

  // Fog drift animation
  useEffect(() => {
    if (reducedMotion) return;
    if (fog1Ref.current) {
      gsap.to(fog1Ref.current, {
        x: "+=50",
        duration: 12,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }
    if (fog2Ref.current) {
      gsap.to(fog2Ref.current, {
        x: "-=40",
        duration: 18,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }
  }, [reducedMotion]);

  return (
    <div ref={containerRef} className={cn("pointer-events-none fixed inset-0 z-0 overflow-hidden", className)} aria-hidden="true">
      {/* Layer 1: Animated gradient mesh */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 20% 0%, rgba(139, 108, 255, 0.25), transparent 60%),
            radial-gradient(ellipse 60% 80% at 80% 100%, rgba(92, 200, 255, 0.15), transparent 60%),
            radial-gradient(ellipse 100% 50% at 50% 50%, rgba(255, 200, 61, 0.08), transparent 70%),
            #12102B
          `,
        }}
      />
      {!reducedMotion && (
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background: `
              radial-gradient(circle at 30% 20%, rgba(139, 108, 255, 0.3), transparent 40%),
              radial-gradient(circle at 70% 60%, rgba(255, 200, 61, 0.15), transparent 40%)
            `,
            animation: "meshShift 20s ease-in-out infinite alternate",
          }}
        />
      )}
      <style>{`
        @keyframes meshShift {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(3%, -2%) scale(1.05); }
          100% { transform: translate(-3%, 2%) scale(1); }
        }
      `}</style>

      {/* Layer 2: Star field (parallax) */}
      <div ref={starsRef} className="absolute inset-0">
        {Array.from({ length: 60 }).map((_, i) => {
          const x = Math.random() * 100;
          const y = Math.random() * 70;
          const size = Math.random() * 2 + 0.5;
          const delay = Math.random() * 3;
          const duration = 2 + Math.random() * 3;
          return (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: `${size}px`,
                height: `${size}px`,
                opacity: 0.3 + Math.random() * 0.6,
                animation: reducedMotion ? "none" : `twinkle ${duration}s ease-in-out ${delay}s infinite alternate`,
              }}
            />
          );
        })}
        <style>{`
          @keyframes twinkle {
            0% { opacity: 0.2; transform: scale(0.8); }
            100% { opacity: 1; transform: scale(1.2); }
          }
        `}</style>
      </div>

      {/* Layer 3: Far mountain ridge */}
      <svg ref={farRidgeRef} className="absolute bottom-0 left-0 w-[120%] h-[35vh]" viewBox="0 0 1200 300" preserveAspectRatio="none">
        <path
          d="M0,300 L0,180 L80,120 L180,200 L280,100 L400,180 L520,80 L640,160 L760,60 L880,140 L1000,100 L1100,180 L1200,120 L1200,300 Z"
          fill="#1C1A44"
          opacity="0.6"
        />
      </svg>

      {/* Layer 4: Near mountain ridge */}
      <svg ref={nearRidgeRef} className="absolute bottom-0 left-0 w-[120%] h-[28vh]" viewBox="0 0 1200 300" preserveAspectRatio="none">
        <path
          d="M0,300 L0,220 L60,160 L160,240 L260,180 L380,260 L500,200 L640,280 L760,220 L880,280 L1000,240 L1100,280 L1200,220 L1200,300 Z"
          fill="#12102B"
          opacity="0.95"
        />
      </svg>

      {/* Layer 5: Drifting fog */}
      <div
        ref={fog1Ref}
        className="absolute bottom-[15vh] left-0 h-[20vh] w-[150%]"
        style={{
          background: "linear-gradient(to right, transparent, rgba(189, 184, 230, 0.08), transparent)",
          filter: "blur(20px)",
        }}
      />
      <div
        ref={fog2Ref}
        className="absolute bottom-[5vh] left-0 h-[15vh] w-[150%]"
        style={{
          background: "linear-gradient(to right, transparent, rgba(139, 108, 255, 0.06), transparent)",
          filter: "blur(30px)",
        }}
      />

      {/* Layer 6: Floating particles */}
      {particles && !reducedMotion && (
        <ParticleField count={particleCount} type={particleType} speed={1} active={!reducedMotion} />
      )}
    </div>
  );
}
