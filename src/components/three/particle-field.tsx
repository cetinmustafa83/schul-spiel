"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  twinkle: number;
  twinkleSpeed: number;
  life: number;
  maxLife: number;
}

interface ParticleFieldProps {
  className?: string;
  count?: number;
  colors?: string[];
  speed?: number;
  /** Whether to render (false = no particles, for reduced motion) */
  active?: boolean;
  /** Particle type affects movement pattern */
  type?: "embers" | "dust" | "fireflies" | "snow";
}

const DEFAULT_COLORS = ["#FFC83D", "#8B6CFF", "#5CC8FF", "#3DDBA4"];

/**
 * Ambient particle field — floating embers/dust/fireflies.
 * Canvas-based for 60fps performance with up to 80 particles.
 */
export function ParticleField({
  className,
  count = 50,
  colors = DEFAULT_COLORS,
  speed = 1,
  active = true,
  type = "embers",
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    // Init particles
    const rect = canvas.parentElement?.getBoundingClientRect();
    const W = rect?.width ?? 800;
    const H = rect?.height ?? 600;
    particlesRef.current = Array.from({ length: count }, () => createParticle(W, H, colors, type));

    const animate = () => {
      ctx.clearRect(0, 0, W, H);
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        updateParticle(p, W, H, speed, type);
        drawParticle(ctx, p, type);
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [active, count, colors, speed, type]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className={cn("pointer-events-none absolute inset-0", className)}
      aria-hidden="true"
    />
  );
}

function createParticle(W: number, H: number, colors: string[], type: ParticleFieldProps["type"]): Particle {
  const color = colors[Math.floor(Math.random() * colors.length)];
  const maxLife = 300 + Math.random() * 400;
  return {
    x: Math.random() * W,
    y: type === "embers" ? H + Math.random() * 50 : Math.random() * H,
    vx: type === "fireflies" ? (Math.random() - 0.5) * 0.5 : (Math.random() - 0.5) * 0.2,
    vy: type === "embers" ? -0.3 - Math.random() * 0.5 : type === "snow" ? 0.3 + Math.random() * 0.5 : type === "fireflies" ? (Math.random() - 0.5) * 0.3 : -0.05 - Math.random() * 0.1,
    size: type === "dust" ? 1 + Math.random() * 2 : 2 + Math.random() * 3,
    opacity: 0.3 + Math.random() * 0.5,
    color,
    twinkle: Math.random() * Math.PI * 2,
    twinkleSpeed: 0.02 + Math.random() * 0.04,
    life: Math.random() * maxLife,
    maxLife,
  };
}

function updateParticle(p: Particle, W: number, H: number, speed: number, type: ParticleFieldProps["type"]) {
  p.x += p.vx * speed;
  p.y += p.vy * speed;
  p.twinkle += p.twinkleSpeed;
  p.life += 1;

  // Fireflies wander with sine motion
  if (type === "fireflies") {
    p.vx += (Math.random() - 0.5) * 0.05;
    p.vy += (Math.random() - 0.5) * 0.05;
    p.vx = Math.max(-1, Math.min(1, p.vx));
    p.vy = Math.max(-1, Math.min(1, p.vy));
  }

  // Embers drift upward with slight horizontal sway
  if (type === "embers") {
    p.vx += Math.sin(p.life * 0.02) * 0.02;
  }

  // Wrap or respawn
  if (p.y < -20 || p.y > H + 20 || p.x < -20 || p.x > W + 20 || p.life > p.maxLife) {
    const np = createParticle(W, H, [p.color], type);
    Object.assign(p, np);
  }
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle, type: ParticleFieldProps["type"]) {
  const flicker = 0.5 + Math.sin(p.twinkle) * 0.5;
  const alpha = p.opacity * flicker;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (type === "fireflies" || type === "embers") {
    // Glow
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
    gradient.addColorStop(0, p.color);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
