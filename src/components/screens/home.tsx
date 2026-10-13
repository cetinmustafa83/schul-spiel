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

      {/* Big play button — the 15-step prize ladder game */}
      <button
        type="button"
        onClick={() => navigate("game-setup")}
        className="group mb-4 flex items-center justify-between gap-4 rounded-2xl border border-border bg-bg1/60 p-6 text-left backdrop-blur transition-all hover:border-ink-dim/30 hover:bg-bg1/80"
      >
        <div>
          <div className="font-display text-2xl font-extrabold text-ink">Spiel starten</div>
          <div className="mt-1 text-sm text-ink-dim">Klettere die 15-Stufen-Leiter bis zu 500.000 Taler.</div>
        </div>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-bg2/60 text-ink transition-transform group-hover:scale-110">
          <Trophy className="h-6 w-6" />
        </div>
      </button>

      {/* Klassenarbeit — the only mode card */}
      <button
        type="button"
        onClick={() => navigate("klassenarbeit-setup")}
        className="group mb-4 flex items-center justify-between gap-4 rounded-2xl border border-border bg-bg1/60 p-6 text-left backdrop-blur transition-all hover:border-ink-dim/30 hover:bg-bg1/80"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-bg2/40 text-ink-dim transition-transform group-hover:scale-110">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-lg font-bold text-ink">Klassenarbeit</div>
            <div className="text-sm text-ink-dim">Prüfung simulieren — Fach & Themen wählen</div>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-ink-dim transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}
