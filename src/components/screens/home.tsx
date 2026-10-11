"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SCHOOL_TYPE_LABELS, formatTaler } from "@/lib/german";
import {
  Trophy, Target, Repeat, Calendar, User, Settings, LogOut, ChevronRight, Flame,
} from "lucide-react";

export function HomeScreen() {
  const { player, navigate, setPayload } = useApp();
  const [dueCount, setDueCount] = useState(0);
  const [dailyDone, setDailyDone] = useState(0);
  const [dailyTotal, setDailyTotal] = useState(5);
  const [rank, setRank] = useState<string>("Wanderer");
  const [xp, setXp] = useState(player?.xp ?? 0);

  useEffect(() => {
    void (async () => {
      try {
        const [statsRes, dailyRes] = await Promise.all([
          fetch("/api/me/stats").then((r) => r.json()),
          fetch("/api/daily").then((r) => r.json()),
        ]);
        setDueCount(statsRes.stats?.dueCount ?? 0);
        setRank(statsRes.player?.rank?.label ?? "Wanderer");
        setXp(statsRes.player?.xp ?? 0);
        setDailyDone((dailyRes.items ?? []).filter((i: { answered: boolean }) => i.answered).length);
        setDailyTotal((dailyRes.items ?? []).length);
      } catch {
        // ignore
      }
    })();
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-bg2/40">
            <Trophy className="h-5 w-5 text-gold/80" />
          </div>
          <div>
            <div className="font-display text-xl font-bold text-ink">
              Hallo, {player?.displayName}!
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

      {/* Rank/XP bar */}
      <div className="mb-6 rounded-2xl border border-border bg-bg1/60 p-4 backdrop-blur">
        <div className="flex items-center justify-between text-sm">
          <span className="font-display font-semibold text-gold">{rank}</span>
          <span className="text-ink-dim">{formatTaler(xp)} XP</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg2/60">
          <div className="h-full bg-gold transition-all" style={{ width: `${Math.min(100, (xp % 100) + 20)}%` }} />
        </div>
      </div>

      {/* Big play button */}
      <button
        type="button"
        onClick={() => navigate("game-setup")}
        className="group mb-4 flex items-center justify-between gap-4 rounded-3xl border-2 border-gold/40 bg-gradient-to-br from-gold/20 to-bg1 p-6 text-left transition-all hover:from-gold/30 hover:border-gold/60 plate-glow-gold"
      >
        <div>
          <div className="font-display text-2xl font-extrabold text-ink">Spiel starten</div>
          <div className="mt-1 text-sm text-ink-dim">Klettere die 15-Stufen-Leiter bis zu 500.000 Taler.</div>
        </div>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gold text-bg0 transition-transform group-hover:scale-110">
          <Trophy className="h-7 w-7" />
        </div>
      </button>

      {/* Mode cards */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ModeCard
          icon={<Calendar className="h-5 w-5" />}
          title="Tagesquiz"
          subtitle={`${dailyDone}/${dailyTotal} heute beantwortet`}
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
        <ModeCard
          icon={<User className="h-5 w-5" />}
          title="Profil"
          subtitle="Statistiken & Abzeichen"
          accent="from-gold/20"
          onClick={() => navigate("profile")}
        />
      </div>

      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate("legal")}
          className="flex w-full items-center justify-between rounded-2xl border border-border bg-bg1/40 p-4 text-left hover:bg-bg1/70"
        >
          <div className="flex items-center gap-3">
            <span aria-hidden>🛡️</span>
            <div>
              <div className="font-display text-sm font-semibold text-ink">Datenschutz</div>
              <div className="text-xs text-ink-dim">Deine Daten, deine Rechte</div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-ink-dim" />
        </button>
      </div>

      <footer className="mt-auto flex flex-wrap items-center justify-center gap-4 pt-4 text-xs text-ink-dim">
        <button className="hover:text-ink" onClick={() => navigate("legal")}>Datenschutz</button>
        <span aria-hidden>·</span>
        <button className="hover:text-ink" onClick={() => navigate("parent-info")}>Eltern-Info</button>
        <span aria-hidden>·</span>
        <button className="hover:text-ink" onClick={() => navigate("imprint")}>Impressum</button>
        <span aria-hidden>·</span>
        <button className="hover:text-ink" onClick={() => navigate("help")}>Hilfe</button>
      </footer>

      <button
        type="button"
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          useApp.getState().setPlayer(null);
          navigate("landing");
        }}
        className="tap-target mt-4 inline-flex items-center justify-center gap-2 text-sm text-ink-dim hover:text-coral"
      >
        <LogOut className="h-4 w-4" /> Abmelden
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

function ModeCard({ icon, title, subtitle, accent, onClick }: ModeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex items-center gap-4 rounded-2xl border border-border bg-gradient-to-br p-4 text-left transition-all hover:border-gold/40",
        accent,
        "to-bg1"
      )}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-bg2/70 text-gold transition-transform group-hover:scale-110">
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
