"use client";

import { useApp } from "@/lib/store";
import { SCHOOL_TYPE_LABELS } from "@/lib/german";
import { Trophy, Settings, ChevronRight, FileText } from "lucide-react";

export function HomeScreen() {
  const { player, navigate } = useApp();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-bg2/40">
            <Trophy className="h-5 w-5 text-gold/80" />
          </div>
          <div>
            <div className="font-display text-xl font-bold text-ink">
              Hallo, {player?.name}!
            </div>
            <div className="text-xs text-ink-dim">
              {SCHOOL_TYPE_LABELS[player?.schoolType ?? ""] ?? player?.schoolType} · Klasse {player?.grade}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("settings")}
          className="tap-target hidden items-center justify-center rounded-full border border-border bg-bg2/40 p-2.5 text-ink-dim backdrop-blur transition-colors hover:border-ink-dim/40 hover:text-ink sm:flex"
          aria-label="Einstellungen"
        >
          <Settings className="h-5 w-5" />
        </button>
      </header>

      {/* Two mode cards in a single row */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => navigate("game-setup")}
          className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-bg1/60 p-5 text-left backdrop-blur transition-all hover:border-ink-dim/30 hover:bg-bg1/80"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-bg2/40 text-gold/80 transition-transform group-hover:scale-110">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="min-w-0 w-full">
            <div className="font-display text-lg font-bold leading-tight text-ink">Spiel starten</div>
            <div className="mt-1 text-xs leading-relaxed text-ink-dim">
              Klettere die 15-Stufen-Leiter bis zu 500.000 Taler.
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-ink-dim transition-transform group-hover:translate-x-0.5" />
        </button>

        <button
          type="button"
          onClick={() => navigate("klassenarbeit-setup")}
          className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-bg1/60 p-5 text-left backdrop-blur transition-all hover:border-ink-dim/30 hover:bg-bg1/80"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-bg2/40 text-ink-dim transition-transform group-hover:scale-110">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 w-full">
            <div className="font-display text-lg font-bold leading-tight text-ink">Klassenarbeit</div>
            <div className="mt-1 text-xs leading-relaxed text-ink-dim">
              Prüfung simulieren — Fach & Themen wählen
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-ink-dim transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
