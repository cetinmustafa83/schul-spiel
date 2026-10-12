"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { LadderRail, type LadderStep } from "@/components/ui/ladder-rail";
import { GooeyButton } from "@/components/ui/gooey";
import { SCHOOL_TYPE_LABELS, formatTaler } from "@/lib/german";
import { useScreenTransition } from "@/lib/animations/gsap-hooks";
import { ArrowLeft, Timer, Shuffle, BarChart3, PhoneCall, Split, Info, Trophy, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const JOKER_INFO = [
  { code: "FIFTY_FIFTY", label: "50:50", icon: Split, desc: "Entfernt zwei falsche Antworten." },
  { code: "AUDIENCE", label: "Klassen-Umfrage", icon: BarChart3, desc: "Was denken die anderen Spieler:innen?" },
  { code: "PHONE", label: "Lumi fragen", icon: PhoneCall, desc: "Lumi gibt dir einen Tipp — sie kann sich auch irren." },
  { code: "SWITCH", label: "Frage tauschen", icon: Shuffle, desc: "Tauscht die Frage gegen eine neue." },
];

const TIMER_OPTIONS = [
  { code: "off", label: "Aus", desc: "Kein Zeitdruck", seconds: null },
  { code: "relaxed", label: "Entspannt", desc: "60 Sekunden", seconds: 60 },
  { code: "challenge", label: "Challenge", desc: "30 Sekunden", seconds: 30 },
] as const;

export function GameSetupScreen() {
  const { player, navigate, setPayload, pushToast } = useApp();
  const [ladder, setLadder] = useState<LadderStep[]>([]);
  const [timerMode, setTimerMode] = useState<"off" | "relaxed" | "challenge">("off");
  const [starting, setStarting] = useState(false);
  const ref = useScreenTransition<HTMLDivElement>();

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/meta/ladder");
      const data = await res.json();
      setLadder(data.items ?? []);
    })();
  }, []);

  async function startGame() {
    setStarting(true);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "GIPFEL", timerMode, playerName: player?.name, schoolType: player?.schoolType, grade: player?.grade }),
      });
      const data = await res.json();
      if (!res.ok) {
        pushToast(data.message ?? "Spiel konnte nicht gestartet werden.", "error");
        setStarting(false);
        return;
      }
      setPayload({ gameId: data.gameId, ladder: data.ladder, jokers: data.jokers, timerMode, question: data.question });
      navigate("game-stage");
    } catch {
      pushToast("Etwas ist schiefgelaufen.", "error");
      setStarting(false);
    }
  }

  const summitAmount = ladder.find((s) => s.level === 15)?.amount ?? 500000;

  return (
    <div ref={ref} className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 sm:px-6">
      {/* Top bar — minimal */}
      <header className="mb-8 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("home")}
          className="tap-target inline-flex items-center gap-1.5 rounded-full border border-border bg-bg1/40 px-3 py-1.5 text-sm text-ink-dim backdrop-blur transition-colors hover:border-ink-dim/30 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Zurück
        </button>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-ink-dim">
          <span className="h-1.5 w-1.5 rounded-full bg-mint/60 animate-pulse" />
          Bereit zum Start
        </div>
      </header>

      {/* Hero header — player + summit target */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
        <div
          className="flex items-center gap-4 rounded-2xl border border-border p-5 backdrop-blur-xl"
          style={{
            background: "linear-gradient(135deg, rgba(40,38,80,0.6), rgba(28,26,68,0.8))",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-bg2/40">
            <Trophy className="h-6 w-6 text-ink-dim" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-xl font-bold tracking-tight text-ink truncate">
                {player?.name}
              </span>
            </div>
            <div className="mt-0.5 text-sm text-ink-dim">
              {SCHOOL_TYPE_LABELS[player?.schoolType ?? ""] ?? player?.schoolType} · Klasse {player?.grade}
            </div>
          </div>
        </div>
        {/* Summit target card */}
        <div
          className="flex items-center gap-3 rounded-2xl border border-border px-5 py-4 backdrop-blur-xl"
          style={{
            background: "linear-gradient(135deg, rgba(160,170,200,0.08), rgba(106,122,154,0.04))",
            boxShadow: "0 0 24px rgba(106,122,154,0.1), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-wider text-ink-dim">Gipfel</span>
            <span className="font-display text-2xl font-extrabold tabular-nums text-ink">
              {formatTaler(summitAmount)}
            </span>
            <span className="text-[10px] text-ink-dim/60">Taler Spielgeld</span>
          </div>
        </div>
      </div>

      <main className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* Left: info + jokers + timer */}
        <div className="flex flex-col gap-6">
          {/* Info banner — cumulative review */}
          <div
            className="flex items-start gap-3 rounded-xl border border-border bg-bg1/40 p-4 backdrop-blur"
            style={{ borderLeft: "3px solid rgba(106,122,154,0.4)" }}
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-dim/70" />
            <div>
              <div className="text-sm font-medium text-ink">Wiederholung + aktueller Stoff</div>
              <p className="mt-1 text-xs leading-relaxed text-ink-dim">
                Dein Gipfel enthält Wiederholung aus jüngeren Klassen sowie den aktuellen Stoff aus Klasse {player?.grade}.
                So bleibt altes Wissen frisch.
              </p>
            </div>
          </div>

          {/* Jokers — premium grid */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-ink-dim">
                Deine Joker
              </h2>
              <span className="text-[10px] text-ink-dim/60">je 1× pro Spiel</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {JOKER_INFO.map((j) => {
                const Icon = j.icon;
                return (
                  <div
                    key={j.code}
                    className="group relative flex items-start gap-3 overflow-hidden rounded-xl border border-border bg-bg1/40 p-4 backdrop-blur transition-all hover:border-ink-dim/20 hover:bg-bg1/60"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-bg2/40 text-ink-dim transition-colors group-hover:text-ink">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-sm font-semibold text-ink">{j.label}</div>
                      <p className="mt-1 text-xs leading-relaxed text-ink-dim">{j.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Timer — segmented control */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-ink-dim">
                Timer
              </h2>
              <span className="text-[10px] text-ink-dim/60">optional</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {TIMER_OPTIONS.map((t) => {
                const isActive = timerMode === t.code;
                return (
                  <button
                    key={t.code}
                    type="button"
                    onClick={() => setTimerMode(t.code)}
                    className={cn(
                      "relative overflow-hidden rounded-xl border p-4 text-center backdrop-blur transition-all",
                      isActive
                        ? "border-ink-dim/40 bg-bg1/70"
                        : "border-border bg-bg1/40 hover:border-ink-dim/20 hover:bg-bg1/60"
                    )}
                    style={isActive ? {
                      boxShadow: "0 0 16px rgba(106,122,154,0.15), inset 0 0 12px rgba(106,122,154,0.08)",
                    } : undefined}
                  >
                    <Timer className={cn("mx-auto mb-1.5 h-4 w-4", isActive ? "text-ink" : "text-ink-dim/60")} />
                    <div className={cn(
                      "font-display text-sm font-semibold",
                      isActive ? "text-ink" : "text-ink-dim"
                    )}>
                      {t.label}
                    </div>
                    {t.seconds && (
                      <div className="mt-0.5 text-[10px] text-ink-dim/60 tabular-nums">{t.seconds}s</div>
                    )}
                    {!t.seconds && (
                      <div className="mt-0.5 text-[10px] text-ink-dim/60">{t.desc}</div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right: ladder preview */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div
            className="rounded-2xl border border-border p-4 backdrop-blur-xl"
            style={{
              background: "linear-gradient(180deg, rgba(40,38,80,0.5), rgba(28,26,68,0.7))",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)",
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-ink-dim">
                Taler-Leiter
              </h2>
              <span className="text-[10px] text-ink-dim/60">15 Stufen</span>
            </div>
            {ladder.length > 0 && <LadderRail ladder={ladder} currentLevel={1} />}
          </div>
        </aside>
      </main>

      {/* Footer — start button */}
      <footer className="sticky bottom-0 z-20 mt-8 -mx-4 border-t border-border/40 bg-bg0/80 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <div className="hidden flex-1 sm:block">
            <div className="text-[10px] uppercase tracking-wider text-ink-dim">Ziel</div>
            <div className="font-display text-sm font-semibold text-ink">
              {formatTaler(summitAmount)} Taler erreichen
            </div>
          </div>
          <GooeyButton
            size="lg"
            className="h-14 flex-1 sm:flex-none sm:px-12"
            blobColor="rgba(106, 122, 154, 0.35)"
            onClick={startGame}
            disabled={starting}
          >
            {starting ? "Spiel wird vorbereitet …" : (
              <span className="flex items-center gap-2">
                Spiel starten
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </GooeyButton>
        </div>
      </footer>
    </div>
  );
}
