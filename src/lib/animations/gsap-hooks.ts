"use client";

import { useEffect, useRef, useLayoutEffect } from "react";
import { gsap } from "gsap";
import type { RefObject } from "react";

/**
 * Wissensgipfel — GSAP animation system (PRD §12.1).
 *
 * All animations honour `prefers-reduced-motion` (and the in-app toggle)
 * by checking the `reduce-motion` class on <html>. When reduced motion is
 * requested, animations degrade to simple fades.
 */

function prefersReducedMotion(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("reduce-motion")
    || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Screen transition: fade + 12px slide. 220ms. */
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
    gsap.fromTo(el,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.22, ease: "power2.out", clearProps: "opacity,transform" }
    );
  }, []);
  return ref;
}

/**
 * Question reveal: card slides up, text fades in, answers stagger A→D.
 * 450ms + 80ms stagger.
 */
export function useQuestionReveal<T extends HTMLElement>(deps: unknown[]): RefObject<T> {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const plates = el.querySelectorAll<HTMLElement>("[data-answer-plate]");
    const question = el.querySelector<HTMLElement>("[data-question-text]");
    if (prefersReducedMotion()) {
      gsap.set([el, question, ...plates], { opacity: 0 });
      gsap.to([el, question, ...plates], { opacity: 1, duration: 0.15 });
      return;
    }
    const tl = gsap.timeline();
    tl.fromTo(el, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" });
    if (question) {
      tl.fromTo(question, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 }, "-=0.2");
    }
    if (plates.length > 0) {
      tl.fromTo(plates, { opacity: 0, y: 15, scale: 0.96 }, {
        opacity: 1, y: 0, scale: 1, duration: 0.3, stagger: 0.08, ease: "back.out(1.4)"
      }, "-=0.15");
    }
    return () => { tl.kill(); };
  }, deps);
  return ref;
}

/**
 * Reveal correct: plate turns mint + sparkle burst + ladder marker climbs.
 * 900ms.
 */
export function playCorrectReveal(plateEl: HTMLElement, onComplete?: () => void) {
  if (prefersReducedMotion()) {
    gsap.to(plateEl, { opacity: 1, duration: 0.15, onComplete });
    return;
  }
  const tl = gsap.timeline({ onComplete });
  tl.to(plateEl, { scale: 1.05, duration: 0.15, ease: "power2.out" })
    .to(plateEl, { scale: 1, duration: 0.3, ease: "elastic.out(1, 0.5)" });
  // Sparkle burst
  const sparkles = plateEl.querySelectorAll<HTMLElement>("[data-sparkle]");
  sparkles.forEach((s, i) => {
    tl.fromTo(s,
      { opacity: 1, scale: 0, x: 0, y: 0 },
      { opacity: 0, scale: 1.5, x: (Math.random() - 0.5) * 80, y: (Math.random() - 0.5) * 80 - 20, duration: 0.6, ease: "power2.out" },
      0.1 + i * 0.02
    );
  });
}

/**
 * Reveal wrong: gentle shake (2px, 2 cycles) + correct plate glows mint.
 * 700ms.
 */
export function playWrongReveal(plateEl: HTMLElement, correctPlateEl?: HTMLElement | null, onComplete?: () => void) {
  if (prefersReducedMotion()) {
    gsap.to(plateEl, { opacity: 1, duration: 0.15, onComplete });
    return;
  }
  const tl = gsap.timeline({ onComplete });
  tl.to(plateEl, { x: -4, duration: 0.08, ease: "power2.in" })
    .to(plateEl, { x: 4, duration: 0.08 })
    .to(plateEl, { x: -2, duration: 0.08 })
    .to(plateEl, { x: 0, duration: 0.08 });
  if (correctPlateEl) {
    tl.fromTo(correctPlateEl, { scale: 1 }, { scale: 1.06, duration: 0.3, ease: "back.out(2)" }, 0.2)
      .to(correctPlateEl, { scale: 1, duration: 0.25 });
  }
}

/**
 * 50:50 joker: two plates "dissolve" into stardust.
 * 600ms.
 */
export function playFiftyFifty(eliminatedPlates: HTMLElement[], onComplete?: () => void) {
  if (prefersReducedMotion()) {
    eliminatedPlates.forEach((el) => gsap.set(el, { opacity: 0.3 }));
    onComplete?.();
    return;
  }
  const tl = gsap.timeline({ onComplete });
  eliminatedPlates.forEach((el, i) => {
    tl.to(el, {
      opacity: 0.15,
      scale: 0.9,
      filter: "blur(4px)",
      duration: 0.4,
      ease: "power2.in",
    }, i * 0.1);
  });
  tl.to({}, { duration: 0.2 });
}

/**
 * Klassen-Umfrage: 4 bars grow with easing, numbers count up.
 * 1.2s.
 */
export function playAudiencePoll(bars: HTMLElement[], values: number[], onComplete?: () => void) {
  if (prefersReducedMotion()) {
    bars.forEach((bar, i) => {
      gsap.set(bar, { height: `${values[i]}%` });
    });
    onComplete?.();
    return;
  }
  const tl = gsap.timeline({ onComplete });
  bars.forEach((bar, i) => {
    tl.fromTo(bar,
      { height: "0%" },
      { height: `${values[i]}%`, duration: 1.0, ease: "power3.out" },
      i * 0.05
    );
  });
}

/**
 * Safe station reached: camp-fire/beacon lights, mini fireworks.
 * 1.2s.
 */
export function playSafeStation(el: HTMLElement, onComplete?: () => void) {
  if (prefersReducedMotion()) {
    onComplete?.();
    return;
  }
  const tl = gsap.timeline({ onComplete });
  tl.fromTo(el, { scale: 1, filter: "brightness(1)" },
    { scale: 1.1, filter: "brightness(1.6)", duration: 0.4, ease: "power2.out" })
    .to(el, { scale: 1, filter: "brightness(1)", duration: 0.4 });
}

/**
 * Summit (500,000 Taler): full-screen golden confetti + beacon beam.
 * 4s.
 */
export function playSummitConfetti(container: HTMLElement, onComplete?: () => void) {
  if (prefersReducedMotion()) {
    onComplete?.();
    return;
  }
  const colors = ["#FFC83D", "#3DDBA4", "#5CC8FF", "#8B6CFF", "#FF6B7A"];
  const pieces: HTMLElement[] = [];
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement("div");
    piece.style.cssText = `position:absolute;width:10px;height:14px;background:${colors[i % colors.length]};border-radius:2px;pointer-events:none;left:50%;top:30%;opacity:0;z-index:100;`;
    container.appendChild(piece);
    pieces.push(piece);
  }
  const tl = gsap.timeline({ onComplete: () => { pieces.forEach((p) => p.remove()); onComplete?.(); } });
  pieces.forEach((piece, i) => {
    const angle = (i / pieces.length) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 150 + Math.random() * 250;
    tl.to(piece, {
      opacity: 1,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist + 200,
      rotation: Math.random() * 720,
      duration: 1.5 + Math.random() * 0.8,
      ease: "power2.out",
    }, Math.random() * 0.4);
    tl.to(piece, { opacity: 0, duration: 0.5 }, 1.5 + Math.random() * 0.5);
  });
}

/**
 * Ladder climb: marker animates from old station to new station along the path.
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
      y: toY, scale: 1.2, duration: 0.5, ease: "power2.out",
      onComplete: () => {
        gsap.to(marker, { scale: 1, duration: 0.3, onComplete });
      },
    }
  );
}

/**
 * Taler counter: numbers roll (odometer effect).
 * 800ms.
 */
export function playTalerCounter(el: HTMLElement, from: number, to: number, duration = 0.8) {
  if (prefersReducedMotion()) {
    el.textContent = new Intl.NumberFormat("de-DE").format(to);
    return;
  }
  const obj = { val: from };
  gsap.to(obj, {
    val: to,
    duration,
    ease: "power2.out",
    onUpdate: () => {
      el.textContent = new Intl.NumberFormat("de-DE").format(Math.round(obj.val));
    },
  });
}

/**
 * Lumi entrance: slides in from the side with a speech bubble typewriter.
 * 1.5s.
 */
export function playLumiEntrance(lumiEl: HTMLElement, bubbleEl?: HTMLElement | null, onComplete?: () => void) {
  if (prefersReducedMotion()) {
    if (bubbleEl) gsap.set(bubbleEl, { opacity: 1 });
    onComplete?.();
    return;
  }
  const tl = gsap.timeline({ onComplete });
  tl.fromTo(lumiEl, { x: -40, opacity: 0, scale: 0.8 },
    { x: 0, opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" });
  if (bubbleEl) {
    tl.fromTo(bubbleEl, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 }, "-=0.1");
  }
}

/** Auto-run a one-shot animation when `trigger` changes. */
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

/** Pulse animation for the "Final?" lock-in state. */
export function startLockPulse(el: HTMLElement): gsap.core.Tween {
  if (prefersReducedMotion()) {
    return gsap.to(el, { opacity: 0.7, duration: 0.3, yoyo: true, repeat: -1 });
  }
  return gsap.to(el, {
    scale: 1.03,
    duration: 0.35,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1,
  });
}

export function stopAnimation(tween: gsap.core.Tween | null) {
  if (tween) {
    tween.kill();
  }
}
