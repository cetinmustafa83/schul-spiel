"use client";

import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { formatTaler } from "@/lib/german";
import { useScreenTransition } from "@/lib/animations/gsap-hooks";
import { MountainScene3D } from "@/components/three/mountain-scene";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function LandingScreen() {
  const { navigate, prefs } = useApp();
  const ref = useScreenTransition<HTMLDivElement>();
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Subtle title glow — refined, not flashy
  useEffect(() => {
    if (prefs.reducedMotion || !titleRef.current) return;
    const tl = gsap.to(titleRef.current, {
      textShadow: "0 0 24px rgba(74, 85, 104, 0.4)",
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
    return () => { tl.kill(); };
  }, [prefs.reducedMotion]);

  return (
    <div ref={ref} className="relative mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8 sm:px-6">
      <MountainScene3D
        className="pointer-events-none fixed inset-0 z-0 opacity-90"
        reducedMotion={prefs.reducedMotion}
      />
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

        <div className="flex w-full max-w-md flex-col gap-3">
          <Button
            size="lg"
            className="h-14 text-base font-display font-bold"
            onClick={() => navigate("register")}
          >
            Los geht&apos;{`'`}s — Konto erstellen
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-14 text-base font-display font-semibold"
            onClick={() => navigate("login")}
          >
            Ich habe schon ein Konto
          </Button>
        </div>

        <div className="mt-12 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          <FeatureCard icon="◆" title="Strategie" text="Nutze Joker klug — jeder zählt." />
          <FeatureCard icon="▲" title="Lehrplan" text="Echter Schulstoff, passend zur Klasse." />
          <FeatureCard icon="●" title="Privat" text="Keine E-Mail, kein Tracking." />
        </div>
      </header>

      <footer className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-ink-dim">
        <button className="hover:text-ink" onClick={() => navigate("legal")}>Datenschutz</button>
        <span aria-hidden>·</span>
        <button className="hover:text-ink" onClick={() => navigate("parent-info")}>Eltern-Info</button>
        <span aria-hidden>·</span>
        <button className="hover:text-ink" onClick={() => navigate("imprint")}>Impressum</button>
        <span aria-hidden>·</span>
        <button className="hover:text-ink" onClick={() => navigate("help")}>Hilfe</button>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg1/40 p-5 text-center backdrop-blur-md transition-all hover:border-gold/30 hover:bg-bg1/60">
      <div className="mb-3 text-xl text-gold/70" aria-hidden>{icon}</div>
      <div className="font-display text-sm font-semibold text-ink">{title}</div>
      <div className="mt-1.5 text-xs text-ink-dim leading-relaxed">{text}</div>
    </div>
  );
}
