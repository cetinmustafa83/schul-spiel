"use client";

import { useEffect, useRef, useLayoutEffect } from "react";
import { gsap } from "gsap";
import type { RefObject } from "react";

/**
 * Wissensgipfel — Game-feel animation system (PRD §12.1, enhanced).
 *
 * All animations honour `prefers-reduced-motion` + the in-app toggle
 * (via the `reduce-motion` class on <html>). When reduced motion is
 * requested, animations degrade to instant/simple fades.
 */

function prefersReducedMotion(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("reduce-motion")
    || (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

/** Screen transition: 3D fade + slide + subtle scale. 400ms with elastic ease. */
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

/**
 * Question reveal: card slides up with overshoot, text chars fade in word-by-word,
 * answers stagger A→D with elastic bounce.
 * 600ms + 100ms stagger.
 */
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
    // Card entrance with overshoot
    tl.fromTo(el,
      { opacity: 0, y: 40, scale: 0.92 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.5)" }
    );
    // Header (subject + level) slides in
    if (header) {
      tl.fromTo(header, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.3 }, "-=0.3");
    }
    // Question text with blur-to-clear
    if (question) {
      tl.fromTo(question,
        { opacity: 0, y: 15, filter: "blur(8px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.4 },
        "-=0.2"
      );
    }
    // Answer plates stagger in with elastic bounce from below
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

/**
 * Reveal correct: scale pulse + sparkle burst + confetti shower.
 * 1200ms.
 */
export function playCorrectReveal(plateEl: HTMLElement, onComplete?: () => void) {
  if (prefersReducedMotion()) {
    gsap.to(plateEl, { opacity: 1, duration: 0.15, onComplete });
    return;
  }
  const tl = gsap.timeline({ onComplete });
  // Pop scale
  tl.to(plateEl, { scale: 1.08, duration: 0.2, ease: "back.out(3)" })
    .to(plateEl, { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.4)" });

  // Sparkle burst — create 12 particles
  const rect = plateEl.getBoundingClientRect();
  const sparkles: HTMLElement[] = [];
  for (let i = 0; i < 12; i++) {
    const s = document.createElement("div");
    s.style.cssText = `position:fixed;width:8px;height:8px;background:#3DDBA4;border-radius:50%;pointer-events:none;z-index:9999;left:${rect.left + rect.width / 2}px;top:${rect.top + rect.height / 2}px;box-shadow:0 0 8px #3DDBA4;`;
    document.body.appendChild(s);
    sparkles.push(s);
  }
  sparkles.forEach((s, i) => {
    const angle = (i / sparkles.length) * Math.PI * 2;
    const dist = 60 + Math.random() * 80;
    tl.to(s, {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist - 30,
      opacity: 0,
      scale: 0.3,
      duration: 0.8,
      ease: "power2.out",
    }, 0.15);
  });
  tl.add(() => { sparkles.forEach((s) => s.remove()); });
}

/**
 * Reveal wrong: shake + flash red + correct plate glows.
 * 800ms.
 */
export function playWrongReveal(plateEl: HTMLElement, correctPlateEl?: HTMLElement | null, onComplete?: () => void) {
  if (prefersReducedMotion()) {
    gsap.to(plateEl, { opacity: 1, duration: 0.15, onComplete });
    return;
  }
  const tl = gsap.timeline({ onComplete });
  // Shake (more pronounced)
  tl.to(plateEl, { x: -8, duration: 0.06, ease: "power2.in" })
    .to(plateEl, { x: 8, duration: 0.06 })
    .to(plateEl, { x: -5, duration: 0.06 })
    .to(plateEl, { x: 5, duration: 0.06 })
    .to(plateEl, { x: -3, duration: 0.06 })
    .to(plateEl, { x: 0, duration: 0.06 });

  // Red flash overlay
  const rect = plateEl.getBoundingClientRect();
  const flash = document.createElement("div");
  flash.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;background:#FF6B7A;opacity:0;pointer-events:none;z-index:9998;border-radius:16px;`;
  document.body.appendChild(flash);
  tl.to(flash, { opacity: 0.4, duration: 0.15, ease: "power2.out" }, 0)
    .to(flash, { opacity: 0, duration: 0.3 }, 0.15)
    .add(() => flash.remove(), 0.5);

  if (correctPlateEl) {
    tl.fromTo(correctPlateEl,
      { scale: 1 },
      { scale: 1.08, duration: 0.4, ease: "back.out(2.5)" },
      0.3
    ).to(correctPlateEl, { scale: 1, duration: 0.3 });
  }
}

/**
 * 50:50 joker: plates dissolve into stardust particles.
 * 700ms.
 */
export function playFiftyFifty(eliminatedPlates: HTMLElement[], onComplete?: () => void) {
  if (prefersReducedMotion()) {
    eliminatedPlates.forEach((el) => gsap.set(el, { opacity: 0.3 }));
    onComplete?.();
    return;
  }
  const tl = gsap.timeline({ onComplete });

  eliminatedPlates.forEach((el, i) => {
    // Create dust particles
    const rect = el.getBoundingClientRect();
    const dust: HTMLElement[] = [];
    for (let j = 0; j < 8; j++) {
      const d = document.createElement("div");
      d.style.cssText = `position:fixed;width:4px;height:4px;background:#BDB8E6;border-radius:50%;pointer-events:none;z-index:9999;left:${rect.left + Math.random() * rect.width}px;top:${rect.top + Math.random() * rect.height}px;`;
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
        y: -30 - Math.random() * 40,
        x: (Math.random() - 0.5) * 60,
        opacity: 0,
        scale: 0.2,
        duration: 0.6,
        ease: "power2.out",
      }, i * 0.1 + j * 0.02);
      tl.add(() => d.remove(), i * 0.1 + 0.8);
    });
  });
}

/**
 * Klassen-Umfrage: bars grow with elastic + numbers count up.
 * 1.5s.
 */
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

/**
 * Safe station reached: camp-fire glow + mini fireworks.
 * 1.5s.
 */
export function playSafeStation(el: HTMLElement, onComplete?: () => void) {
  if (prefersReducedMotion()) { onComplete?.(); return; }
  const tl = gsap.timeline({ onComplete });
  tl.fromTo(el,
    { scale: 1, filter: "brightness(1)" },
    { scale: 1.15, filter: "brightness(1.8)", duration: 0.4, ease: "power2.out" }
  ).to(el, { scale: 1, filter: "brightness(1)", duration: 0.5, ease: "elastic.out(1, 0.4)" });

  // Mini fireworks around the element
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < 15; i++) {
    const p = document.createElement("div");
    const colors = ["#FFC83D", "#3DDBA4", "#5CC8FF"];
    p.style.cssText = `position:fixed;width:6px;height:6px;background:${colors[i % 3]};border-radius:50%;pointer-events:none;z-index:9999;left:${cx}px;top:${cy}px;box-shadow:0 0 6px ${colors[i % 3]};`;
    document.body.appendChild(p);
    const angle = (i / 15) * Math.PI * 2;
    const dist = 80 + Math.random() * 60;
    tl.to(p, {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      opacity: 0,
      scale: 0.2,
      duration: 1.0,
      ease: "power2.out",
    }, 0.2);
    tl.add(() => p.remove(), 1.3);
  }
}

/**
 * Summit (500,000 Taler): full-screen golden confetti + beacon beam.
 * 5s.
 */
export function playSummitConfetti(container: HTMLElement, onComplete?: () => void) {
  if (prefersReducedMotion()) { onComplete?.(); return; }
  const colors = ["#FFC83D", "#3DDBA4", "#5CC8FF", "#8B6CFF", "#FF6B7A", "#F2A93B"];
  const pieces: HTMLElement[] = [];
  for (let i = 0; i < 120; i++) {
    const piece = document.createElement("div");
    const color = colors[i % colors.length];
    const size = 8 + Math.random() * 8;
    piece.style.cssText = `position:fixed;width:${size}px;height:${size * 1.4}px;background:${color};border-radius:2px;pointer-events:none;left:50%;top:20%;opacity:0;z-index:9999;transform:translateX(-50%);box-shadow:0 0 4px ${color};`;
    document.body.appendChild(piece);
    pieces.push(piece);
  }
  const tl = gsap.timeline({ onComplete: () => { pieces.forEach((p) => p.remove()); onComplete?.(); } });
  pieces.forEach((piece, i) => {
    const angle = (i / pieces.length) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 200 + Math.random() * 400;
    tl.to(piece, {
      opacity: 1,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist + 300,
      rotation: Math.random() * 1080,
      duration: 2 + Math.random() * 1.5,
      ease: "power2.out",
    }, Math.random() * 0.5);
    tl.to(piece, { opacity: 0, duration: 0.6 }, 2 + Math.random() * 0.8);
  });
}

/**
 * Ladder climb: marker animates from old to new station with bounce.
 */
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

/**
 * Taler counter: odometer roll with bounce.
 * 1000ms.
 */
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
  // Scale pulse
  gsap.fromTo(el, { scale: 1 }, { scale: 1.1, duration: 0.2, yoyo: true, repeat: 1, ease: "power2.out" });
}

/**
 * Lumi entrance: slides in from the side with bounce + speech bubble typewriter.
 * 1.5s.
 */
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

/** Pulse animation for the "Final?" lock-in state — continuous glow pulse. */
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

/** Button press feedback — quick scale bounce. */
export function playButtonPress(el: HTMLElement) {
  if (prefersReducedMotion()) return;
  gsap.timeline()
    .to(el, { scale: 0.94, duration: 0.08, ease: "power2.in" })
    .to(el, { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.4)" });
}

/** XP bar fill animation with glow trail. */
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

/** Badge unlock — pop with rays. */
export function playBadgeUnlock(el: HTMLElement, onComplete?: () => void) {
  if (prefersReducedMotion()) { onComplete?.(); return; }
  const tl = gsap.timeline({ onComplete });
  tl.fromTo(el,
    { scale: 0, rotation: -180, opacity: 0 },
    { scale: 1.2, rotation: 0, opacity: 1, duration: 0.6, ease: "back.out(2)" }
  ).to(el, { scale: 1, duration: 0.3, ease: "elastic.out(1, 0.4)" });

  // Ray burst
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < 8; i++) {
    const ray = document.createElement("div");
    ray.style.cssText = `position:fixed;width:3px;height:40px;background:#FFC83D;pointer-events:none;z-index:9999;left:${cx}px;top:${cy}px;transform-origin:center bottom;transform:rotate(${i * 45}deg);opacity:0;`;
    document.body.appendChild(ray);
    tl.to(ray, { opacity: 0.8, duration: 0.2 }, 0.3)
      .to(ray, { height: 80, opacity: 0, duration: 0.4, ease: "power2.out" }, 0.5);
    tl.add(() => ray.remove(), 1.0);
  }
}

/** Auto-run a one-shot animation when deps change. */
export function useAnimation<T extends HTMLElement>(
  fn: (el: T) => void,
  deps: unknown[]
): RefObject<T> {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (ref.current) fn(ref.current);
  }, deps);
  return ref;
}
