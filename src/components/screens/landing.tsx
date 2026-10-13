"use client";

import { useApp } from "@/lib/store";
import { GooeyButton } from "@/components/ui/gooey";
import { formatTaler } from "@/lib/german";
import { useScreenTransition } from "@/lib/animations/gsap-hooks";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function LandingScreen() {
  const { navigate, prefs } = useApp();
  const ref = useScreenTransition<HTMLDivElement>();
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (prefs.reducedMotion || !titleRef.current) return;
    const tl = gsap.to(titleRef.current, {
      textShadow: "0 0 28px rgba(139, 108, 255, 0.55)",
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
    return () => { tl.kill(); };
  }, [prefs.reducedMotion]);

  return (
    <div ref={ref} className="relative mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8 sm:px-6">
      <header className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-8 flex flex-col items-center gap-4">
          <div>
            <h1 ref={titleRef} className="font-display text-5xl sm:text-6xl font-extrabold tracking-tight text-ink">
              Wissensgipfel
            </h1>
            <p className="mt-3 font-display text-base tracking-wide text-ink-dim uppercase">
              Besteige den Berg des Wissens
            </p>
          </div>
        </div>

        <p className="mb-10 max-w-xl text-balance text-ink-dim leading-relaxed">
          Eine Lern-Plattform für die Klassen 5–8. Beantworte 15 Fragen,
          nutze Joker und erreiche den Gipfel —{" "}
          <span className="font-semibold text-ink">{formatTaler(500000)} Taler Spielgeld</span> warten.
        </p>

        <div className="w-full max-w-md">
          <GooeyButton
            size="lg"
            className="w-full h-14"
            blobColor="rgba(139, 108, 255, 0.45)"
            onClick={() => navigate("onboarding")}
          >
            Los geht&apos;s
          </GooeyButton>
        </div>
      </header>
    </div>
  );
}
