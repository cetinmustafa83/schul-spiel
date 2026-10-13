"use client";

import * as THREE from "three";
import { useEffect, useRef, useLayoutEffect } from "react";
import { gsap } from "gsap";
import type { RefObject } from "react";

/**
 * Wissensgipfel — Game-feel animation system (professional grade).
 *
 * Implements the techniques from the threejs-game-skills game-feel reference:
 *   - Trauma-based screenshake (trauma² scaling, deterministic noise)
 *   - Hitstop (scale gameplay delta, keep render alive)
 *   - Squash-and-stretch (volume-preserving with easeOutBack)
 *   - FOV punch / camera kick (additive with exponential decay)
 *   - Impact flash (emissive pulse + full-screen white flash)
 *   - Pickup pop (scale + rise + fade)
 *
 * All effects honour `prefers-reduced-motion` + in-app toggle.
 */

function prefersReducedMotion(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("reduce-motion")
    || (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

// ============================================================================
// Easing curves
// ============================================================================

export const easeInQuad = (t: number) => t * t;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const easeOutElastic = (t: number) => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

// ============================================================================
// ShakeRig — trauma-based screenshake (applied to DOM elements)
// ============================================================================

class ShakeRig {
  private trauma = 0;
  private time = 0;
  private readonly maxOffset = 8; // px
  private readonly maxRoll = 0.015; // radians
  private readonly decay = 1.4; // trauma per second
  private target: HTMLElement | null = null;
  private rafId = 0;

  setTarget(el: HTMLElement | null) {
    this.target = el;
    if (el && !this.rafId) this.tick();
  }

  addTrauma(amount: number) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  private pseudoNoise(t: number, seed: number): number {
    const x = Math.sin(t * 12.9898 + seed * 78.233) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
  }

  private tick = () => {
    if (!this.target) return;
    const now = performance.now() / 1000;
    const delta = 1 / 60; // approx
    this.time += delta;
    this.trauma = Math.max(0, this.trauma - this.decay * delta);

    if (this.trauma <= 0) {
      this.target.style.transform = "";
      this.rafId = requestAnimationFrame(this.tick);
      return;
    }

    const shake = this.trauma * this.trauma;
    const freq = this.time * 32;
    const ox = this.maxOffset * shake * this.pseudoNoise(freq, 1);
    const oy = this.maxOffset * shake * this.pseudoNoise(freq, 2);
    const rot = this.maxRoll * shake * this.pseudoNoise(freq, 3);
    this.target.style.transform = `translate(${ox}px, ${oy}px) rotate(${rot}rad)`;
    this.rafId = requestAnimationFrame(this.tick);
  };

  dispose() {
    cancelAnimationFrame(this.rafId);
  }
}

const shakeRig = new ShakeRig();

/** Attach the shake rig to a DOM element (typically the main game container). */
export function useShakeTarget<T extends HTMLElement>(): RefObject<T> {
  const ref = useRef<T>(null);
  useEffect(() => {
    shakeRig.setTarget(ref.current);
    return () => shakeRig.setTarget(null);
  }, []);
  return ref;
}

/** Add trauma to the global shake rig. Recommended: pickup 0.15, hit 0.4, explosion 0.7. */
export function addTrauma(amount: number) {
  if (prefersReducedMotion()) return;
  shakeRig.addTrauma(amount);
}

// ============================================================================
// Hitstop — brief freeze on heavy contact
// ============================================================================

class HitstopManager {
  private timeScale = 1;
  private remaining = 0;
  private callbacks: Array<() => void> = [];

  hitstop(durationMs: number, scale = 0.05) {
    if (prefersReducedMotion()) return;
    this.remaining = Math.max(this.remaining, durationMs / 1000);
    this.timeScale = scale;
  }

  update(delta: number) {
    if (this.remaining > 0) {
      this.remaining -= delta;
      if (this.remaining <= 0) {
        this.timeScale = 1;
        this.callbacks.forEach((cb) => cb());
        this.callbacks = [];
      }
    }
    return this.timeScale;
  }

  get isFrozen() { return this.timeScale < 1; }
  get currentScale() { return this.timeScale; }

  onThaw(cb: () => void) {
    this.callbacks.push(cb);
  }
}

const hitstop = new HitstopManager();

export function triggerHitstop(durationMs: number, scale = 0.05) {
  hitstop.hitstop(durationMs, scale);
}

// ============================================================================
// Squash-and-Stretch — volume-preserving deformation
// ============================================================================

export function squashAndStretch(
  el: HTMLElement,
  squashY = 0.85,
  durationSec = 0.18,
  onComplete?: () => void
) {
  if (prefersReducedMotion()) { onComplete?.(); return; }
  const startXZ = 1 / Math.sqrt(squashY);
  const obj = { t: 0 };
  gsap.to(obj, {
    t: 1,
    duration: durationSec,
    ease: "back.out(1.7)",
    onUpdate: () => {
      const t = obj.t;
      const y = squashY + (1 - squashY) * t;
      const xz = startXZ + (1 - startXZ) * t;
      el.style.transform = `scale(${xz}, ${y})`;
    },
    onComplete,
  });
}

// ============================================================================
// FOV Punch — additive FOV bump with exponential decay (for 3D camera)
// ============================================================================

export class FovPuncher {
  private baseFov = 50;
  private fovPunch = 0;
  private camera: THREE.PerspectiveCamera | null = null;

  setCamera(cam: THREE.PerspectiveCamera) {
    this.camera = cam;
    this.baseFov = cam.fov;
  }

  punch(degrees: number) {
    if (prefersReducedMotion() || !this.camera) return;
    this.fovPunch = Math.min(10, this.fovPunch + degrees);
  }

  update(delta: number) {
    if (!this.camera || this.fovPunch <= 0.001) return;
    this.fovPunch *= Math.exp(-delta / 0.2);
    if (this.fovPunch < 0.001) this.fovPunch = 0;
    this.camera.fov = this.baseFov + this.fovPunch;
    this.camera.updateProjectionMatrix();
  }
}

// ============================================================================
// Impact Flash — full-screen white flash via DOM
// ============================================================================

export function impactFlash(color = "#ffffff", peakOpacity = 0.5, durationMs = 120) {
  if (prefersReducedMotion()) return;
  const flash = document.createElement("div");
  flash.style.cssText = `position:fixed;inset:0;background:${color};opacity:0;pointer-events:none;z-index:99999;`;
  document.body.appendChild(flash);
  const obj = { opacity: 0 };
  gsap.timeline({ onComplete: () => flash.remove() })
    .to(obj, { opacity: peakOpacity, duration: durationMs / 1000 / 2, ease: "power2.out", onUpdate: () => { flash.style.opacity = String(obj.opacity); } })
    .to(obj, { opacity: 0, duration: durationMs / 1000 / 2, ease: "power2.in", onUpdate: () => { flash.style.opacity = String(obj.opacity); } });
}

// ============================================================================
// Reveal animations — correct / wrong
// ============================================================================

export function playCorrectReveal(plateEl: HTMLElement, onComplete?: () => void) {
  if (prefersReducedMotion()) { onComplete?.(); return; }
  const tl = gsap.timeline({ onComplete });

  // Squash-stretch bounce
  squashAndStretch(plateEl, 1.15, 0.25);

  // Add shake trauma (subtle — it's a positive event)
  addTrauma(0.1);

  // Sparkle burst — 16 particles in radial pattern
  const rect = plateEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const colors = ["#3DDBA4", "#FFC83D", "#5CC8FF"];
  const sparkles: HTMLElement[] = [];
  for (let i = 0; i < 16; i++) {
    const s = document.createElement("div");
    const c = colors[i % colors.length];
    s.style.cssText = `position:fixed;width:6px;height:6px;background:${c};border-radius:50%;pointer-events:none;z-index:9999;left:${cx}px;top:${cy}px;box-shadow:0 0 10px ${c};`;
    document.body.appendChild(s);
    sparkles.push(s);
  }
  sparkles.forEach((s, i) => {
    const angle = (i / sparkles.length) * Math.PI * 2;
    const dist = 80 + Math.random() * 100;
    tl.to(s, {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist - 40,
      opacity: 0,
      scale: 0.2,
      duration: 0.9,
      ease: "power2.out",
    }, 0.1);
    tl.add(() => s.remove(), 1.1);
  });

  // Brief impact flash (green tint)
  impactFlash("#3DDBA4", 0.15, 200);
}

export function playWrongReveal(plateEl: HTMLElement, correctPlateEl?: HTMLElement | null, onComplete?: () => void) {
  if (prefersReducedMotion()) { onComplete?.(); return; }
  const tl = gsap.timeline({ onComplete });

  // Stronger shake (negative event)
  addTrauma(0.35);

  // Hitstop — brief freeze for weight
  triggerHitstop(80, 0.1);

  // Shake the plate
  tl.to(plateEl, { x: -10, duration: 0.05, ease: "power2.in" })
    .to(plateEl, { x: 10, duration: 0.05 })
    .to(plateEl, { x: -6, duration: 0.05 })
    .to(plateEl, { x: 6, duration: 0.05 })
    .to(plateEl, { x: -3, duration: 0.05 })
    .to(plateEl, { x: 0, duration: 0.05 });

  // Red impact flash
  impactFlash("#FF6B7A", 0.3, 250);

  // Correct plate glow
  if (correctPlateEl) {
    tl.fromTo(correctPlateEl,
      { scale: 1 },
      { scale: 1.1, duration: 0.4, ease: "back.out(2.5)" },
      0.3
    ).to(correctPlateEl, { scale: 1, duration: 0.3 });
  }
}

// ============================================================================
// 50:50 — dissolve with stardust
// ============================================================================

export function playFiftyFifty(eliminatedPlates: HTMLElement[], onComplete?: () => void) {
  if (prefersReducedMotion()) {
    eliminatedPlates.forEach((el) => { el.style.opacity = "0.3"; });
    onComplete?.();
    return;
  }
  const tl = gsap.timeline({ onComplete });

  eliminatedPlates.forEach((el, i) => {
    const rect = el.getBoundingClientRect();
    const dust: HTMLElement[] = [];
    for (let j = 0; j < 10; j++) {
      const d = document.createElement("div");
      d.style.cssText = `position:fixed;width:4px;height:4px;background:#BDB8E6;border-radius:50%;pointer-events:none;z-index:9999;left:${rect.left + Math.random() * rect.width}px;top:${rect.top + Math.random() * rect.height}px;box-shadow:0 0 6px #8B6CFF;`;
      document.body.appendChild(d);
      dust.push(d);
    }

    tl.to(el, {
      opacity: 0.1,
      scale: 0.85,
      filter: "blur(6px)",
      y: 10,
      duration: 0.5,
      ease: "power2.in",
    }, i * 0.1);

    dust.forEach((d, j) => {
      tl.to(d, {
        y: -40 - Math.random() * 50,
        x: (Math.random() - 0.5) * 80,
        opacity: 0,
        scale: 0.2,
        duration: 0.7,
        ease: "power2.out",
      }, i * 0.1 + j * 0.02);
      tl.add(() => d.remove(), i * 0.1 + 0.9);
    });
  });
}

// ============================================================================
// Audience poll — elastic bars
// ============================================================================

export function playAudiencePoll(bars: HTMLElement[], values: number[], onComplete?: () => void) {
  if (prefersReducedMotion()) {
    bars.forEach((bar, i) => { gsap.set(bar, { height: `${values[i]}%` }); });
    onComplete?.();
    return;
  }
  const tl = gsap.timeline({ onComplete });
  bars.forEach((bar, i) => {
    tl.fromTo(bar,
      { height: "0%" },
      {
        height: `${values[i]}%`,
        duration: 1.2,
        ease: "elastic.out(1, 0.6)",
      },
      i * 0.08
    );
  });
}

// ============================================================================
// Safe station — camp-fire glow + fireworks
// ============================================================================

export function playSafeStation(el: HTMLElement, onComplete?: () => void) {
  if (prefersReducedMotion()) { onComplete?.(); return; }
  const tl = gsap.timeline({ onComplete });
  addTrauma(0.15);
  tl.fromTo(el,
    { scale: 1, filter: "brightness(1)" },
    { scale: 1.15, filter: "brightness(1.8)", duration: 0.4, ease: "power2.out" }
  ).to(el, { scale: 1, filter: "brightness(1)", duration: 0.5, ease: "elastic.out(1, 0.4)" });

  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < 20; i++) {
    const p = document.createElement("div");
    const colors = ["#FFC83D", "#3DDBA4", "#5CC8FF"];
    p.style.cssText = `position:fixed;width:6px;height:6px;background:${colors[i % 3]};border-radius:50%;pointer-events:none;z-index:9999;left:${cx}px;top:${cy}px;box-shadow:0 0 8px ${colors[i % 3]};`;
    document.body.appendChild(p);
    const angle = (i / 20) * Math.PI * 2;
    const dist = 100 + Math.random() * 80;
    tl.to(p, {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      opacity: 0,
      scale: 0.2,
      duration: 1.1,
      ease: "power2.out",
    }, 0.2);
    tl.add(() => p.remove(), 1.4);
  }
  impactFlash("#FFC83D", 0.2, 300);
}

// ============================================================================
// Summit — full confetti explosion
// ============================================================================

export function playSummitConfetti(container: HTMLElement, onComplete?: () => void) {
  if (prefersReducedMotion()) { onComplete?.(); return; }
  addTrauma(0.7);
  impactFlash("#FFC83D", 0.6, 400);
  triggerHitstop(150, 0.1);

  const colors = ["#FFC83D", "#3DDBA4", "#5CC8FF", "#8B6CFF", "#FF6B7A", "#F2A93B"];
  const pieces: HTMLElement[] = [];
  for (let i = 0; i < 150; i++) {
    const piece = document.createElement("div");
    const color = colors[i % colors.length];
    const size = 8 + Math.random() * 10;
    piece.style.cssText = `position:fixed;width:${size}px;height:${size * 1.4}px;background:${color};border-radius:2px;pointer-events:none;left:50%;top:20%;opacity:0;z-index:9999;transform:translateX(-50%);box-shadow:0 0 6px ${color};`;
    document.body.appendChild(piece);
    pieces.push(piece);
  }
  const tl = gsap.timeline({ onComplete: () => { pieces.forEach((p) => p.remove()); onComplete?.(); } });
  pieces.forEach((piece, i) => {
    const angle = (i / pieces.length) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 250 + Math.random() * 450;
    tl.to(piece, {
      opacity: 1,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist + 350,
      rotation: Math.random() * 1080,
      duration: 2.5 + Math.random() * 1.5,
      ease: "power2.out",
    }, Math.random() * 0.5);
    tl.to(piece, { opacity: 0, duration: 0.6 }, 2.5 + Math.random() * 0.8);
  });
}

// ============================================================================
// Taler counter — odometer with bounce
// ============================================================================

export function playTalerCounter(el: HTMLElement, from: number, to: number, duration = 1.0) {
  if (prefersReducedMotion()) {
    el.textContent = new Intl.NumberFormat("de-DE").format(to);
    return;
  }
  const obj = { val: from };
  gsap.to(obj, {
    val: to,
    duration,
    ease: "power3.out",
    onUpdate: () => {
      el.textContent = new Intl.NumberFormat("de-DE").format(Math.round(obj.val));
    },
  });
  gsap.fromTo(el, { scale: 1 }, { scale: 1.15, duration: 0.2, yoyo: true, repeat: 1, ease: "power2.out" });
}

// ============================================================================
// Screen transition — 3D fade + slide + scale
// ============================================================================

export function useScreenTransition<T extends HTMLElement>(): RefObject<T> {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: 0 });
      gsap.to(el, { opacity: 1, duration: 0.2 });
      return;
    }
    const tl = gsap.timeline();
    tl.set(el, { opacity: 0, y: 30, scale: 0.96, rotateX: 8, transformPerspective: 1000 })
      .to(el, { opacity: 1, y: 0, scale: 1, rotateX: 0, duration: 0.5, ease: "back.out(1.4)" })
      .to(el, { clearProps: "transform,opacity", duration: 0.1 });
  }, []);
  return ref;
}

// ============================================================================
// Question reveal — overshoot + blur-to-clear + elastic stagger
// ============================================================================

export function useQuestionReveal<T extends HTMLElement>(deps: unknown[]): RefObject<T> {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const plates = el.querySelectorAll<HTMLElement>("[data-answer-plate]");
    const question = el.querySelector<HTMLElement>("[data-question-text]");
    const header = el.querySelector<HTMLElement>("[data-question-header]");

    if (prefersReducedMotion()) {
      gsap.set([el, question, ...plates], { opacity: 0 });
      gsap.to([el, question, ...plates], { opacity: 1, duration: 0.15 });
      return;
    }

    const tl = gsap.timeline();
    tl.fromTo(el,
      { opacity: 0, y: 40, scale: 0.92 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.5)" }
    );
    if (header) {
      tl.fromTo(header, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.3 }, "-=0.3");
    }
    if (question) {
      tl.fromTo(question,
        { opacity: 0, y: 15, filter: "blur(8px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.4 },
        "-=0.2"
      );
    }
    if (plates.length > 0) {
      tl.fromTo(plates,
        { opacity: 0, y: 30, scale: 0.85, rotateX: -15 },
        {
          opacity: 1, y: 0, scale: 1, rotateX: 0,
          duration: 0.5,
          stagger: { each: 0.1, from: "start" },
          ease: "back.out(1.8)",
        },
        "-=0.15"
      );
    }
    return () => { tl.kill(); };
  }, deps);
  return ref;
}

// ============================================================================
// Button press — elastic bounce
// ============================================================================

export function playButtonPress(el: HTMLElement) {
  if (prefersReducedMotion()) return;
  gsap.timeline()
    .to(el, { scale: 0.94, duration: 0.08, ease: "power2.in" })
    .to(el, { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.4)" });
}

// ============================================================================
// Ladder climb — bounce marker
// ============================================================================

export function playLadderClimb(marker: HTMLElement, fromY: number, toY: number, onComplete?: () => void) {
  if (prefersReducedMotion()) {
    gsap.set(marker, { y: toY });
    onComplete?.();
    return;
  }
  gsap.fromTo(marker,
    { y: fromY, scale: 1 },
    {
      y: toY, scale: 1.3, duration: 0.6, ease: "power2.out",
      onComplete: () => {
        gsap.to(marker, { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.4)", onComplete });
      },
    }
  );
}

// ============================================================================
// Lumi entrance — slide + bounce + rotation
// ============================================================================

export function playLumiEntrance(lumiEl: HTMLElement, bubbleEl?: HTMLElement | null, onComplete?: () => void) {
  if (prefersReducedMotion()) {
    if (bubbleEl) gsap.set(bubbleEl, { opacity: 1 });
    onComplete?.();
    return;
  }
  const tl = gsap.timeline({ onComplete });
  tl.fromTo(lumiEl,
    { x: -60, opacity: 0, scale: 0.7, rotation: -10 },
    { x: 0, opacity: 1, scale: 1, rotation: 0, duration: 0.6, ease: "back.out(1.7)" }
  );
  if (bubbleEl) {
    tl.fromTo(bubbleEl,
      { opacity: 0, y: 15, scale: 0.8 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.5)" },
      "-=0.1"
    );
  }
}

// ============================================================================
// XP bar fill — glow trail
// ============================================================================

export function playXpBarFill(bar: HTMLElement, fromPct: number, toPct: number, onComplete?: () => void) {
  if (prefersReducedMotion()) {
    gsap.set(bar, { width: `${toPct}%` });
    onComplete?.();
    return;
  }
  const tl = gsap.timeline({ onComplete });
  tl.fromTo(bar,
    { width: `${fromPct}%`, boxShadow: "0 0 0px rgba(255, 200, 61, 0)" },
    {
      width: `${toPct}%`,
      boxShadow: "0 0 20px rgba(255, 200, 61, 0.8)",
      duration: 1.2,
      ease: "power3.out",
    }
  ).to(bar, { boxShadow: "0 0 0px rgba(255, 200, 61, 0)", duration: 0.5 });
}

// ============================================================================
// Badge unlock — pop + ray burst
// ============================================================================

export function playBadgeUnlock(el: HTMLElement, onComplete?: () => void) {
  if (prefersReducedMotion()) { onComplete?.(); return; }
  const tl = gsap.timeline({ onComplete });
  tl.fromTo(el,
    { scale: 0, rotation: -180, opacity: 0 },
    { scale: 1.2, rotation: 0, opacity: 1, duration: 0.6, ease: "back.out(2)" }
  ).to(el, { scale: 1, duration: 0.3, ease: "elastic.out(1, 0.4)" });

  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < 8; i++) {
    const ray = document.createElement("div");
    ray.style.cssText = `position:fixed;width:3px;height:40px;background:#FFC83D;pointer-events:none;z-index:9999;left:${cx}px;top:${cy}px;transform-origin:center bottom;transform:rotate(${i * 45}deg);opacity:0;box-shadow:0 0 8px #FFC83D;`;
    document.body.appendChild(ray);
    tl.to(ray, { opacity: 0.8, duration: 0.2 }, 0.3)
      .to(ray, { height: 80, opacity: 0, duration: 0.4, ease: "power2.out" }, 0.5);
    tl.add(() => ray.remove(), 1.0);
  }
}

// ============================================================================
// Lock pulse — continuous glow for "Final?" state
// ============================================================================

export function startLockPulse(el: HTMLElement): gsap.core.Tween {
  if (prefersReducedMotion()) {
    return gsap.to(el, { opacity: 0.7, duration: 0.3, yoyo: true, repeat: -1 });
  }
  return gsap.to(el, {
    scale: 1.03,
    boxShadow: "0 0 32px rgba(255, 200, 61, 0.6)",
    duration: 0.5,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1,
  });
}

export function stopAnimation(tween: gsap.core.Tween | null) {
  if (tween) tween.kill();
}
