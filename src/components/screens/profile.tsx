"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Home, Trophy } from "lucide-react";
import { formatTaler, SCHOOL_TYPE_LABELS } from "@/lib/german";

interface Avatar {
  id: number;
  code: string;
  label: string;
  emoji: string;
}
interface GameRow {
  id: string;
  currentLevel: number;
  winnings: number;
  startedAt: string;
  endedAt: string | null;
}
interface StatsResponse {
  player: {
    displayName: string;
    schoolType: string;
    grade: number;
    avatarId: number | null;
  };
  stats: {
    totalGames: number;
    bestLevel: number;
    bestWinnings: number;
  };
  games: GameRow[];
}

let avatarCache: Avatar[] | null = null;
async function loadAvatars(): Promise<Avatar[]> {
  if (avatarCache) return avatarCache;
  try {
    const res = await fetch("/api/meta/avatars", { cache: "no-store" });
    const data = await res.json();
    avatarCache = (data.items ?? []) as Avatar[];
  } catch {
    avatarCache = [];
  }
  return avatarCache ?? [];
}

export function ProfileScreen() {
  const { navigate, player } = useApp();
  const [data, setData] = useState<StatsResponse | null>(null);
  const [avatars, setAvatars] = useState<Avatar[]>(avatarCache ?? []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!player?.name) {
      setLoading(false);
      setError("Kein Spielerprofil gefunden.");
      return;
    }
    void (async () => {
      try {
        const params = new URLSearchParams({
          playerName: player.name,
          schoolType: player.schoolType,
          grade: String(player.grade),
        });
        const [statsRes, av] = await Promise.all([
          fetch(`/api/me/stats?${params.toString()}`, { cache: "no-store" }).then((r) => r.json()) as Promise<StatsResponse>,
          loadAvatars(),
        ]);
        if (!statsRes?.player) throw new Error("Profil konnte nicht geladen werden.");
        setData(statsRes);
        setAvatars(av);
      } catch {
        setError("Profil konnte nicht geladen werden. Bitte versuche es später nochmal.");
      } finally {
        setLoading(false);
      }
    })();
  }, [player?.name, player?.schoolType, player?.grade]);

  const avatar = avatars.find((a) => a.id === data?.player?.avatarId);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6">
        <Skeleton className="mb-4 h-8 w-32" />
        <Skeleton className="mb-6 h-32 w-full rounded-3xl" />
        <Skeleton className="mb-4 h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-8 text-center">
        <div className="text-4xl">😶</div>
        <h1 className="mt-3 font-display text-xl font-bold text-ink">Hm</h1>
        <p className="mt-2 text-sm text-ink-dim">{error ?? "Etwas ist schiefgelaufen."}</p>
        <Button className="mt-6" variant="outline" onClick={() => navigate("home")}>
          <Home className="h-4 w-4" /> Zurück zum Menü
        </Button>
      </div>
    );
  }

  const { player: profile, games } = data;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("home")}
          className="tap-target inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-ink-dim hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Zurück
        </button>
        <span className="font-display text-sm font-semibold text-gold">Profil</span>
      </header>

      {/* Profile header */}
      <div className="mb-5 flex items-center gap-4 rounded-3xl border border-border bg-bg1/70 p-5 backdrop-blur">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-bg2/70 text-5xl">
          {avatar?.emoji ?? "🦉"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-xl font-bold text-ink">
            {profile.displayName}
          </div>
          <div className="text-xs text-ink-dim">
            {SCHOOL_TYPE_LABELS[profile.schoolType] ?? profile.schoolType} · Klasse {profile.grade}
          </div>
        </div>
      </div>

      {/* Recent games */}
      <section className="mb-6">
        <h2 className="mb-2 flex items-center gap-2 font-display text-base font-semibold text-ink">
          <Trophy className="h-4 w-4 text-gold/80" />
          Letzte Spiele
        </h2>
        {games.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-bg1/40 p-5 text-center text-sm text-ink-dim">
            Noch keine beendeten Gipfel-Spiele. Starte dein erstes!
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {games.slice(0, 5).map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-bg1/50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-bg2/60 text-sm text-gold">
                    {g.currentLevel}
                  </span>
                  <div>
                    <div className="text-sm text-ink">Stufe {g.currentLevel} erreicht</div>
                    <div className="text-xs text-ink-dim">
                      {g.endedAt ? new Date(g.endedAt).toLocaleDateString("de-DE") : ""}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-gold">
                    {formatTaler(g.winnings)}
                  </div>
                  <div className="text-[11px] text-ink-dim">Taler</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-auto pt-2">
        <Button variant="outline" className="w-full" onClick={() => navigate("home")}>
          <Home className="h-4 w-4" /> Zurück zum Menü
        </Button>
      </div>
    </div>
  );
}
