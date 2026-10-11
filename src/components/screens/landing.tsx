"use client";

import { useApp } from "@/lib/store";
import { Lumi } from "@/components/lumi";
import { Button } from "@/components/ui/button";
import { formatTaler } from "@/lib/german";
import { MountainScene3D } from "@/components/three/mountain-scene";
import { useScreenTransition } from "@/lib/animations/gsap-hooks";

export function LandingScreen() {
  const { navigate, prefs } = useApp();
  const ref = useScreenTransition<HTMLDivElement>();
  const reducedMotion = prefs.reducedMotion;

  return (
    <div ref={ref} className="relative mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8 sm:px-6">
      {/* 3D mountain scene as background */}
      <MountainScene3D
        className="pointer-events-none fixed inset-0 z-0 opacity-70"
        reducedMotion={reducedMotion}
      />

      <header className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-6 flex flex-col items-center gap-4">
          <div className="flex items-end gap-2">
            <Lumi pose="cheer" size={120} className="drop-shadow-[0_8px_24px_rgba(255,200,61,0.35)]" />
            <span className="text-5xl sm:text-6xl" aria-hidden>🏔️</span>
          </div>
          <div>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-ink drop-shadow-lg">
              Wissensgipfel
            </h1>
            <p className="mt-2 font-display text-base text-gold">
              Besteige den Berg des Wissens
            </p>
          </div>
        </div>

        <p className="mb-8 max-w-xl text-balance text-ink-dim">
          Eine kostenlose Lern-App für die Klassen 5–8. Beantworte 15 Fragen,
          nutze Joker und erreiche den Gipfel — <span className="font-semibold text-gold">{formatTaler(500000)} Taler Spielgeld</span> warten!
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

        {/* Feature highlights */}
        <div className="mt-12 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          <FeatureCard icon="🦉" title="Lumi hilft dir" text="Unsere Eule gibt dir Tipps — manchmal." />
          <FeatureCard icon="🎯" title="Passend zur Klasse" text="Nur Schulstoff, den du schon kennst." />
          <FeatureCard icon="🛡️" title="Privat & sicher" text="Keine E-Mail, kein Tracking." />
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
    <div className="rounded-2xl border border-border bg-bg1/60 p-4 text-center backdrop-blur transition-transform hover:scale-105">
      <div className="mb-2 text-3xl" aria-hidden>{icon}</div>
      <div className="font-display text-base font-semibold text-ink">{title}</div>
      <div className="mt-1 text-xs text-ink-dim">{text}</div>
    </div>
  );
}
