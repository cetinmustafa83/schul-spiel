"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { LadderRail, type LadderStep } from "@/components/ui/ladder-rail";
import { Lumi } from "@/components/lumi";
import { SCHOOL_TYPE_LABELS, formatTaler } from "@/lib/german";
import { ArrowLeft, Timer, Shuffle, BarChart3, PhoneCall, Split } from "lucide-react";
import { cn } from "@/lib/utils";

const JOKER_INFO = [
  { code: "FIFTY_FIFTY", label: "50:50", icon: <Split className="h-5 w-5" />, desc: "Entfernt zwei falsche Antworten." },
  { code: "AUDIENCE", label: "Klassen-Umfrage", icon: <BarChart3 className="h-5 w-5" />, desc: "Was denken die anderen Spieler:innen?" },
  { code: "PHONE", label: "Lumi fragen", icon: <PhoneCall className="h-5 w-5" />, desc: "Lumi gibt dir einen Tipp — sie kann sich auch irren." },
  { code: "SWITCH", label: "Frage tauschen", icon: <Shuffle className="h-5 w-5" />, desc: "Tauscht die Frage gegen eine neue." },
];

export function GameSetupScreen() {
  const { player, navigate, setPayload, pushToast } = useApp();
  const [ladder, setLadder] = useState<LadderStep[]>([]);
  const [timerMode, setTimerMode] = useState<"off" | "relaxed" | "challenge">("off");
  const [starting, setStarting] = useState(false);

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
        body: JSON.stringify({ mode: "GIPFEL", timerMode }),
      });
      const data = await res.json();
      if (!res.ok) {
        pushToast(data.message ?? "Spiel konnte nicht gestartet werden.", "error");
        setStarting(false);
        return;
      }
      setPayload({ gameId: data.gameId, ladder: data.ladder, jokers: data.jokers, timerMode });
      navigate("game-stage");
    } catch {
      pushToast("Etwas ist schiefgelaufen.", "error");
      setStarting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("home")}
          className="tap-target inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-ink-dim hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Zurück
        </button>
        <span className="font-display text-lg font-bold text-ink">Spiel einrichten</span>
      </header>

      <main className="flex flex-1 flex-col gap-6">
        {/* Player summary */}
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-bg1/60 p-4 backdrop-blur">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bg2/70 text-2xl" aria-hidden>🏔️</div>
          <div>
            <div className="font-display text-lg font-bold text-ink">{player?.displayName}#{player?.tag}</div>
            <div className="text-sm text-ink-dim">
              {SCHOOL_TYPE_LABELS[player?.schoolType ?? ""] ?? player?.schoolType} · Klasse {player?.grade}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          {/* Left: rules + jokers + timer */}
          <div className="flex flex-col gap-5">
            {/* Info about cumulative review */}
            <div className="rounded-2xl border border-sky/30 bg-sky/5 p-4">
              <div className="font-display text-sm font-semibold text-sky">ℹ️ Dein Gipfel enthält</div>
              <p className="mt-1 text-sm text-ink-dim">
                Wiederholung aus jüngeren Klassen <span className="text-ink">+</span> aktueller Stoff aus Klasse {player?.grade}.
                So bleibt altes Wissen frisch!
              </p>
            </div>

            {/* Jokers */}
            <div>
              <h2 className="mb-2 font-display text-base font-semibold text-ink">Deine Joker (je 1× pro Spiel)</h2>
              <div className="grid grid-cols-2 gap-3">
                {JOKER_INFO.map((j) => (
                  <div key={j.code} className="rounded-xl border border-border bg-bg1/60 p-3">
                    <div className="flex items-center gap-2 text-gold">
                      {j.icon}
                      <span className="font-display text-sm font-semibold text-ink">{j.label}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-dim">{j.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Timer */}
            <div>
              <h2 className="mb-2 font-display text-base font-semibold text-ink">Timer (optional)</h2>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { code: "off", label: "Aus", desc: "Kein Zeitdruck" },
                  { code: "relaxed", label: "Entspannt", desc: "60 Sekunden" },
                  { code: "challenge", label: "Challenge", desc: "30 Sekunden" },
                ].map((t) => (
                  <button
                    key={t.code}
                    type="button"
                    onClick={() => setTimerMode(t.code as "off" | "relaxed" | "challenge")}
                    className={cn(
                      "rounded-xl border-2 p-3 text-center transition-all",
                      timerMode === t.code
                        ? "border-gold bg-gold/10"
                        : "border-border bg-bg1/60 hover:border-gold/40"
                    )}
                  >
                    <Timer className="mx-auto mb-1 h-4 w-4 text-ink-dim" />
                    <div className="font-display text-sm font-semibold text-ink">{t.label}</div>
                    <div className="text-[10px] text-ink-dim">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: ladder preview */}
          <div className="rounded-2xl border border-border bg-bg1/60 p-4">
            <h2 className="mb-3 font-display text-base font-semibold text-ink">Die Taler-Leiter</h2>
            {ladder.length > 0 && <LadderRail ladder={ladder} currentLevel={1} />}
          </div>
        </div>
      </main>

      <footer className="sticky bottom-0 mt-6 border-t border-border/40 bg-bg0/80 py-4 backdrop-blur">
        <Button
          size="lg"
          className="h-14 w-full font-display text-base font-bold"
          onClick={startGame}
          disabled={starting}
        >
          {starting ? "Spiel wird vorbereitet …" : `Los! Auf zum Gipfel — ${formatTaler(500000)} Taler 🏔️`}
        </Button>
      </footer>
    </div>
  );
}
