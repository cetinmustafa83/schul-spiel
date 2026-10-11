"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { SCHOOL_TYPE_LABELS, formatTaler } from "@/lib/german";
import { countDueReview, getPlayer, getGameHistory } from "@/lib/browser-db";
import {
  Trophy, Target, Repeat, Calendar, User, Settings, LogOut, ChevronRight,
} from "lucide-react";

export function HomeScreen() {
  const { player, navigate, setPlayer, pushToast } = useApp();
  const [dueCount, setDueCount] = useState(0);
  const [bestLevel, setBestLevel] = useState(0);
  const [bestWinnings, setBestWinnings] = useState(0);
  const [totalGames, setTotalGames] = useState(0);

  useEffect(() => {
    if (!player?.name) return;
    void (async () => {
      try {
        const [due, p, history] = await Promise.all([
          countDueReview(player.name),
          getPlayer(player.name),
          getGameHistory(player.name, 50),
        ]);
        setDueCount(due);
        if (p) {
          setBestLevel(history.reduce((m, g) => Math.max(m, g.level), 0));
          setBestWinnings(history.reduce((m, g) => Math.max(m, g.winnings), 0));
          setTotalGames(history.length);
        }
      } catch {
        // ignore
      }
    })();
  }, [player?.name]);

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
          className="tap-target rounded-full bg-bg2/60 p-2.5 text-ink-dim hover:text-ink"
          aria-label="Einstellungen"
        >
          <Settings className="h-5 w-5" />
        </button>
      </header>

      {/* Stats bar */}
      <div className="mb-6 rounded-2xl border border-border bg-bg1/60 p-4 backdrop-blur">
        <div className="flex items-center justify-between text-sm">
          <span className="font-display font-semibold text-ink-dim">
            {formatTaler(player?.xp ?? 0)} XP
          </span>
          <span className="text-ink-dim">{totalGames} Spiele</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg2/60">
          <div className="h-full bg-ink-dim/60 transition-all" style={{ width: `${Math.min(100, ((player?.xp ?? 0) % 100) + 20)}%` }} />
        </div>
      </div>

      {/* Big play button */}
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

      {/* Mode cards */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ModeCard
          icon={<Calendar className="h-5 w-5" />}
          title="Tagesquiz"
          subtitle="5 Fragen pro Tag"
          accent="from-sky/20"
          onClick={() => navigate("daily")}
        />
        <ModeCard
          icon={<Repeat className="h-5 w-5" />}
          title="Wiederholungsstapel"
          subtitle={dueCount > 0 ? `${dueCount} Frage(n) fällig` : "Nichts fällig"}
          accent="from-violet/20"
          onClick={() => navigate("review")}
        />
        <ModeCard
          icon={<Target className="h-5 w-5" />}
          title="Training"
          subtitle="Wähle ein Fach und übe"
          accent="from-mint/20"
          onClick={() => navigate("training-setup")}
        />
      </div>

      <button
        type="button"
        onClick={() => {
          if (typeof window !== "undefined") {
            localStorage.removeItem("wissensgipfel-last-player");
          }
          setPlayer(null);
          navigate("landing");
        }}
        className="tap-target mt-4 inline-flex items-center justify-center gap-2 text-sm text-ink-dim hover:text-coral"
      >
        <LogOut className="h-4 w-4" /> Spieler wechseln
      </button>
    </div>
  );
}

interface ModeCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent: string;
  onClick: () => void;
}

function ModeCard({ icon, title, subtitle, accent: _accent, onClick }: ModeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-4 rounded-2xl border border-border bg-bg1/60 p-4 text-left backdrop-blur transition-all hover:border-ink-dim/30 hover:bg-bg1/80"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-bg2/40 text-ink-dim transition-transform group-hover:scale-110">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display text-base font-semibold text-ink">{title}</div>
        <div className="truncate text-xs text-ink-dim">{subtitle}</div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-dim" />
    </button>
  );
}
