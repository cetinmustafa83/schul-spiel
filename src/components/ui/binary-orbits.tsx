"use client";

import { useEffect, useRef } from "react";

/**
 * BinaryOrbits — "A tilted spiral galaxy of stars streaming through its arms"
 *
 * A canvas-based ambient background inspired by the React Bits Pro
 * "Binary Orbits" component. Renders a tilted spiral galaxy: a bright
 * core with two logarithmic-spiral arms made of drifting stars, plus a
 * faint background starfield. The whole galaxy is tilted in 3D (via
 * a Y-axis squash + perspective skew) so it reads as a disc seen at an
 * angle rather than face-on.
 *
 * The stars stream along their arms (orbital motion), and the entire
 * galaxy slowly rotates. Respects `prefers-reduced-motion` and the
 * in-app `reducedMotion` toggle.
 */

interface Star {
  // Orbital radius (distance from galactic center, in px).
  r: number;
  // Base angle on the spiral (radians).
  theta: number;
  // Which arm (0 or 1) — offsets the angle by π for the second arm.
  arm: number;
  // Star size in px.
  size: number;
  // Base brightness 0..1.
  alpha: number;
  // Twinkle phase.
  twinkle: number;
}

export function BinaryOrbits({
  reducedMotion = false,
  className = "",
}: {
  reducedMotion?: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let stars: Star[] = [];
    let bgStars: Star[] = [];
    let rafId: number | null = null;
    let lastFrame = 0;

    // Galaxy parameters — recomputed on resize.
    let cx = 0;
    let cy = 0;
    let galaxyR = 0; // max orbital radius
    const ARMS = 2;
    const ARM_TIGHTNESS = 0.42; // spiral pitch (higher = looser)
    const TILT_Y = 0.42; // vertical squash for 3D tilt (0=flat disc, 1=face-on)
    const TILT_SKEW = 0.18; // horizontal perspective skew

    function seed() {
      stars = [];
      bgStars = [];
      if (width <= 0 || height <= 0) return;

      // Galaxy stars — distributed with bias toward the core.
      const galaxyCount = Math.min(1400, Math.floor((width * height) / 1400));
      for (let i = 0; i < galaxyCount; i++) {
        // r is biased small via a power curve so the core is denser.
        const u = Math.pow(Math.random(), 0.62);
        const r = u * galaxyR;
        const arm = i % ARMS;
        // Logarithmic spiral: theta = ln(r) / b, plus arm offset + jitter.
        const baseTheta = Math.log(Math.max(8, r)) / ARM_TIGHTNESS;
        const jitter = (Math.random() - 0.5) * 0.55;
        stars.push({
          r,
          theta: baseTheta + (arm * Math.PI) / ARMS + jitter,
          arm,
          size: 0.5 + Math.random() * 1.4 + (1 - u) * 0.9,
          alpha: 0.25 + (1 - u) * 0.6 + Math.random() * 0.15,
          twinkle: Math.random() * Math.PI * 2,
        });
      }

      // Background starfield — sparse, twinkling, far outside the galaxy.
      const bgCount = Math.min(220, Math.floor((width * height) / 9000));
      for (let i = 0; i < bgCount; i++) {
        bgStars.push({
          r: 0,
          theta: Math.random() * Math.PI * 2,
          arm: 0,
          size: 0.4 + Math.random() * 1.1,
          alpha: 0.15 + Math.random() * 0.5,
          twinkle: Math.random() * Math.PI * 2,
        });
      }
    }

    function resize() {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = width / 2;
      cy = height * 0.5;
      // Galaxy radius scales with the smaller viewport dimension, capped.
      galaxyR = Math.min(width, height) * 0.46;
      seed();
    }

    /** Project a galaxy point (r, theta) into screen space with 3D tilt. */
    function project(r: number, theta: number): { x: number; y: number; depth: number } {
      // Local disc coordinates (face-on).
      const lx = Math.cos(theta) * r;
      const ly = Math.sin(theta) * r;
      // Apply tilt: squash Y (foreshortening) + slight horizontal skew.
      const sx = cx + lx + ly * TILT_SKEW;
      const sy = cy + ly * TILT_Y;
      // Depth proxy for brightness/size: front of disc (ly > 0) is closer.
      const depth = 0.5 + 0.5 * (ly / (galaxyR || 1));
      return { x: sx, y: sy, depth };
    }

    function draw(t: number) {
      ctx.clearRect(0, 0, width, height);

      // Deep space gradient background.
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, "#070518");
      grad.addColorStop(0.5, "#0E0A28");
      grad.addColorStop(1, "#15103A");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const time = t / 1000;

      // ---- Background starfield ----
      for (const s of bgStars) {
        // Slow twinkle.
        const tw = 0.5 + 0.5 * Math.sin(time * 1.4 + s.twinkle);
        const a = s.alpha * (0.4 + 0.6 * tw);
        ctx.fillStyle = `rgba(220, 220, 255, ${a})`;
        ctx.beginPath();
        // Place background stars at random screen positions (stored via theta).
        const bx = (Math.sin(s.twinkle * 97.3) * 0.5 + 0.5) * width;
        const by = (Math.cos(s.twinkle * 71.1) * 0.5 + 0.5) * height;
        ctx.arc(bx, by, s.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // ---- Galactic core glow ----
      const coreR = galaxyR * 0.22;
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      coreGrad.addColorStop(0, "rgba(255, 235, 200, 0.55)");
      coreGrad.addColorStop(0.35, "rgba(255, 190, 120, 0.28)");
      coreGrad.addColorStop(0.7, "rgba(180, 140, 220, 0.12)");
      coreGrad.addColorStop(1, "rgba(120, 100, 200, 0)");
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, coreR, coreR * TILT_Y, 0, 0, Math.PI * 2);
      ctx.fill();

      // ---- Spiral arm dust haze ----
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let arm = 0; arm < ARMS; arm++) {
        ctx.beginPath();
        for (let r = 8; r <= galaxyR; r += 4) {
          const theta = Math.log(r) / ARM_TIGHTNESS + (arm * Math.PI) / ARMS;
          const p = project(r, theta);
          if (r === 8) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = "rgba(120, 110, 200, 0.06)";
        ctx.lineWidth = 18;
        ctx.stroke();
      }
      ctx.restore();

      // ---- Galaxy stars (streaming along arms) ----
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const s of stars) {
        // Orbital streaming: inner stars orbit faster (Keplerian-ish).
        const omega = 0.5 / Math.max(0.15, s.r / galaxyR);
        const theta = s.theta + time * omega * (reducedMotion ? 0 : 1);
        const p = project(s.r, theta);

        // Twinkle.
        const tw = 0.6 + 0.4 * Math.sin(time * 2.2 + s.twinkle);
        // Color: core stars warm (cream/gold), arm stars cooler (violet/blue).
        const warm = 1 - s.r / galaxyR;
        const r = Math.round(180 + warm * 75);
        const g = Math.round(165 + warm * 55);
        const b = Math.round(255 - warm * 60);
        const a = s.alpha * (0.5 + 0.5 * tw) * (0.6 + 0.4 * p.depth);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, s.size * (0.85 + 0.35 * p.depth), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // ---- Bright core point ----
      const corePulse = 0.85 + 0.15 * Math.sin(time * 1.2);
      const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
      centerGrad.addColorStop(0, `rgba(255, 245, 220, ${0.9 * corePulse})`);
      centerGrad.addColorStop(1, "rgba(255, 220, 180, 0)");
      ctx.fillStyle = centerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    function frame(ts: number) {
      // Cap to ~40fps for efficiency.
      if (ts - lastFrame < 24) {
        rafId = requestAnimationFrame(frame);
        return;
      }
      lastFrame = ts;
      draw(ts);
      rafId = requestAnimationFrame(frame);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Always run the rAF loop. When reduced motion is on, the per-star
    // orbital advance is zeroed (see omega calc above) so the galaxy
    // renders as a static frame, but we avoid a blank canvas.
    rafId = requestAnimationFrame(frame);

    return () => {
      ro.disconnect();
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [reducedMotion]);

  return (
    <div
      aria-hidden="true"
      className={`binary-orbits ${className}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}
