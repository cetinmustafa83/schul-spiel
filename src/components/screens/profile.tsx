"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Home, Trophy, Target, Repeat, Flame, Award } from "lucide-react";
import { formatTaler } from "@/lib/german";

interface SubjectRef {
  code: string;
  label: string;
  icon?: string | null;
  color?: string | null;
}
interface Avatar {
  id: number;
  code: string;
  label: string;
  emoji: string;
}
interface Rank {
  code: string;
  label: string;
  minXp: number;
}
interface StatsPlayer {
  displayName: string;
  tag: string;
  schoolType: string;
  grade: number;
  avatarId: number | null;
  xp: number;
  rank: Rank | null;
  nextRank: Rank | null;
  xpToNext: number;
  xpProgress: number;
}
interface StatsBlock {
  totalGames: number;
  totalWinnings: number;
  bestLevel: number;
  bestWinnings: number;
  trainingCorrect: number;
  trainingTotal: number;
  dueCount: number;
}
interface BadgeRow {
  code: string;
  label: string;
  description: string;
  icon: string;
  earnedAt: string;
}
interface GameRow {
  id: string;
  currentLevel: number;
  winnings: number;
  startedAt: string;
  endedAt: string | null;
}
interface TopicMasteryRow {
  topic: { code: string; label: string };
  subject: SubjectRef;
  attempts: number;
  correct: number;
  accuracy: number;
}
interface StatsResponse {
  player: StatsPlayer;
  stats: StatsBlock;
  ladder: unknown;
  games: GameRow[];
  trainingSessions: unknown[];
  badges: BadgeRow[];
  topicMastery: TopicMasteryRow[];
}

// Module-level cache so multiple ProfileScreen mounts reuse the same data.
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
  const { navigate } = useApp();
  const [data, setData] = useState<StatsResponse | null>(null);
  const [avatars, setAvatars] = useState<Avatar[]>(avatarCache ?? []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [statsRes, av] = await Promise.all([
          fetch("/api/me/stats", { cache: "no-store" }).then((r) => r.json()) as Promise<StatsResponse>,
          loadAvatars(),
        ]);
        setData(statsRes);
        setAvatars(av);
      } catch {
        setError("Profil konnte nicht geladen werden. Bitte versuche es später nochmal.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const avatar = avatars.find((a) => a.id === data?.player?.avatarId);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6">
        <Skeleton className="mb-4 h-8 w-32" />
        <Skeleton className="mb-6 h-32 w-full rounded-3xl" />
        <Skeleton className="mb-4 h-24 w-full rounded-2xl" />
        <Skeleton className="mb-4 h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
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

  const { player, stats, badges, topicMastery, games } = data;
  const xpPct = Math.max(0, Math.min(100, Math.round(player.xpProgress * 100)));

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
            {player.displayName}
          </div>
          <div className="text-xs text-ink-dim">#{player.tag}</div>
          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">
            <Award className="h-3.5 w-3.5" />
            {player.rank?.label ?? "Wanderer"}
          </div>
        </div>
      </div>

      {/* XP progress */}
      <div className="mb-5 rounded-2xl border border-border bg-bg1/60 p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-ink-dim">Erfahrung (XP)</span>
          <span className="font-display font-semibold text-ink">
            {formatTaler(player.xp)} XP
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-bg2/60">
          <div
            className="h-full bg-gradient-to-r from-gold-deep to-gold transition-all"
            style={{ width: `${xpPct}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs text-ink-dim">
          <span>
            {player.nextRank
              ? `Noch ${formatTaler(player.xpToNext)} XP bis „${player.nextRank.label}“`
              : "Höchster Rang erreicht 🎉"}
          </span>
          {player.rank && <span>{player.rank.label}</span>}
        </div>
      </div>

      {/* Stats grid */}
      <section className="mb-5">
        <h2 className="mb-2 font-display text-base font-semibold text-ink">Statistiken</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard icon={<Trophy className="h-4 w-4" />} label="Spiele" value={String(stats.totalGames)} />
          <StatCard icon={<Flame className="h-4 w-4" />} label="Höchste Stufe" value={String(stats.bestLevel)} />
          <StatCard icon={<Award className="h-4 w-4" />} label="Beste Gewinn" value={`${formatTaler(stats.bestWinnings)}`} />
          <StatCard icon={<Trophy className="h-4 w-4" />} label="Gesamt-Gewinn" value={`${formatTaler(stats.totalWinnings)}`} />
          <StatCard icon={<Target className="h-4 w-4" />} label="Training richtig" value={`${stats.trainingCorrect} / ${stats.trainingTotal}`} />
          <StatCard icon={<Repeat className="h-4 w-4" />} label="Wiederholung fällig" value={String(stats.dueCount)} />
        </div>
      </section>

      {/* Badges */}
      <section className="mb-5">
        <h2 className="mb-2 font-display text-base font-semibold text-ink">Abzeichen</h2>
        {badges.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-bg1/40 p-5 text-center text-sm text-ink-dim">
            Sammle Abzeichen durch Spielen!
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {badges.map((b) => (
              <div
                key={b.code}
                className="rounded-2xl border border-border bg-bg1/60 p-3 text-center"
              >
                <div className="mb-1 text-3xl" aria-hidden>{b.icon}</div>
                <div className="font-display text-sm font-semibold text-ink">{b.label}</div>
                <div className="mt-0.5 text-[11px] leading-tight text-ink-dim">{b.description}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Topic mastery */}
      {topicMastery.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 font-display text-base font-semibold text-ink">Themen-Meisterschaft</h2>
          <div className="flex flex-col gap-2">
            {topicMastery
              .slice()
              .sort((a, b) => b.attempts - a.attempts)
              .slice(0, 10)
              .map((t) => (
                <div
                  key={t.topic.code}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-bg1/50 p-3"
                >
                  <span className="text-xl" aria-hidden>{t.subject.icon ?? "📚"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-ink">{t.topic.label}</div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg2/60">
                      <div
                        className={`h-full ${t.accuracy >= 0.8 ? "bg-mint" : t.accuracy >= 0.5 ? "bg-gold" : "bg-coral"}`}
                        style={{ width: `${Math.round(t.accuracy * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-ink-dim">
                    {Math.round(t.accuracy * 100)}%
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Recent games */}
      <section className="mb-6">
        <h2 className="mb-2 font-display text-base font-semibold text-ink">Letzte Spiele</h2>
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

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg1/60 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-ink-dim">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="font-display text-lg font-bold text-ink">{value}</div>
    </div>
  );
}
