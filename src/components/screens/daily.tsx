"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { AnswerPlate, QuestionCard } from "@/components/ui/answer-plate";
import { ArrowLeft, Home } from "lucide-react";

const LETTERS = ["A", "B", "C", "D"] as const;
const SHAPES = ["▲", "●", "■", "◆"] as const;

interface SubjectRef {
  code: string;
  label: string;
  icon?: string | null;
  color?: string | null;
}
interface DailyItem {
  ref: string;
  idx: number;
  questionId: string;
  subject: SubjectRef;
  topic: { code: string; label: string };
  difficulty: number;
  text: string;
  options: string[];
  answered: boolean;
  correct: boolean;
}
interface DailyResponse {
  day: string;
  items: DailyItem[];
}
interface Reveal {
  correctIndex: number;
  answeredShuffled: number;
  correct: boolean;
  explanation: string;
  optionOrder: number[];
  shuffledOptions: string[];
  canonicalOptions: string[];
  topic: { code: string; label: string };
}
interface AnswerResponse {
  ok: boolean;
  correct: boolean;
  reveal: Reveal;
  message?: string;
}

export function DailyScreen() {
  const { navigate, pushToast } = useApp();
  const [day, setDay] = useState<string>("");
  const [items, setItems] = useState<DailyItem[]>([]);
  const [reveals, setReveals] = useState<Record<string, Reveal>>({});
  const [loading, setLoading] = useState(true);
  const [submittingRef, setSubmittingRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/daily", { cache: "no-store" });
        const data = (await res.json()) as DailyResponse;
        if (!res.ok) {
          setError("Tagesquiz konnte nicht geladen werden.");
          return;
        }
        setDay(data.day);
        setItems(data.items ?? []);
      } catch {
        setError("Netzwerkfehler. Bitte versuche es später nochmal.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function answer(item: DailyItem, optionIndex: number) {
    if (item.answered || submittingRef || !day) return;
    setSubmittingRef(item.ref);
    try {
      const res = await fetch("/api/daily/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day,
          questionRef: item.ref,
          optionIndex,
        }),
      });
      const data = (await res.json()) as AnswerResponse;
      if (!res.ok) {
        pushToast(data.message ?? "Antwort konnte nicht gespeichert werden.", "error");
        return;
      }
      setReveals((prev) => ({ ...prev, [item.ref]: data.reveal }));
      setItems((prev) =>
        prev.map((it) =>
          it.ref === item.ref
            ? { ...it, answered: true, correct: data.reveal.correct }
            : it,
        ),
      );
    } catch {
      pushToast("Netzwerkfehler. Bitte versuche es nochmal.", "error");
    } finally {
      setSubmittingRef(null);
    }
  }

  const answeredCount = useMemo(
    () => items.filter((i) => i.answered).length,
    [items],
  );

  const plateStateFor = (item: DailyItem, i: number) => {
    if (!item.answered) return "idle";
    const r = reveals[item.ref];
    if (!r) {
      // Pre-answered (came back from API as answered).
      // We don't know which option the user picked; just mark the correct one.
      // Without optionOrder, fall back to nothing highlighted.
      return "idle";
    }
    if (i === r.answeredShuffled && !r.correct) return "wrong";
    if (r.shuffledOptions[i] === r.canonicalOptions[r.correctIndex]) return "correct";
    return "idle";
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6">
        <div className="mb-6 h-7 w-40 animate-pulse rounded bg-bg2/60" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="mb-4 h-40 animate-pulse rounded-3xl border border-border bg-bg1/60" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-8 text-center">
        <div className="text-4xl">😶</div>
        <h1 className="mt-3 font-display text-xl font-bold text-ink">Hm</h1>
        <p className="mt-2 text-sm text-ink-dim">{error}</p>
        <Button className="mt-6" variant="outline" onClick={() => navigate("home")}>
          <Home className="h-4 w-4" /> Zurück zum Menü
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("home")}
          className="tap-target inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-ink-dim hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Menü
        </button>
        <span className="font-display text-sm font-semibold text-gold">Tagesquiz</span>
      </header>

      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink">5 Fragen pro Tag</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Jeden Tag gibt es fünf neue Fragen — passend zu deiner Klasse. Beantworte alle
          und sammle XP!
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {items.map((item) => {
          const reveal = reveals[item.ref];
          return (
            <QuestionCard
              key={item.ref}
              subject={item.subject}
              difficulty={item.difficulty}
              text={item.text}
            >
              <div className="mb-2 flex items-center justify-end text-xs">
                {item.answered && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                      item.correct
                        ? "bg-mint/15 text-mint"
                        : "bg-coral/15 text-coral"
                    }`}
                  >
                    {item.correct ? "✓ Richtig" : "✕ Falsch"}
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-col gap-2.5">
                {item.options.map((opt, i) => (
                  <AnswerPlate
                    key={i}
                    letter={LETTERS[i]}
                    shape={SHAPES[i]}
                    text={opt}
                    state={plateStateFor(item, i)}
                    index={i}
                    disabled={item.answered || submittingRef === item.ref}
                    onClick={() => void answer(item, i)}
                  />
                ))}
              </div>

              {reveal && (
                <div
                  className={`mt-4 rounded-2xl border-2 p-4 ${
                    reveal.correct
                      ? "border-mint/50 bg-mint/10"
                      : "border-coral/50 bg-coral/10"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`text-xl ${reveal.correct ? "text-mint" : "text-coral"}`}>
                      {reveal.correct ? "✓" : "✕"}
                    </span>
                    <span
                      className={`font-display text-base font-bold ${
                        reveal.correct ? "text-mint" : "text-coral"
                      }`}
                    >
                      {reveal.correct ? "Richtig!" : "Leider falsch"}
                    </span>
                  </div>
                  <div className="mb-1 text-xs text-ink-dim">
                    Thema: {reveal.topic.label}
                  </div>
                  <p className="text-sm leading-relaxed text-ink">{reveal.explanation}</p>
                </div>
              )}
            </QuestionCard>
          );
        })}
      </div>

      {/* Progress footer */}
      <div className="sticky bottom-3 mt-6 flex items-center justify-between rounded-2xl border border-border bg-bg1/90 px-4 py-3 backdrop-blur">
        <span className="text-sm text-ink-dim">
          <span className="font-display font-bold text-ink">{answeredCount}</span> / {items.length} beantwortet
        </span>
        {answeredCount === items.length && items.length > 0 ? (
          <Button size="sm" onClick={() => navigate("home")}>
            <Home className="h-4 w-4" /> Fertig
          </Button>
        ) : (
          <span className="text-xs text-ink-dim">Tipp: Klicke eine Antwort an.</span>
        )}
      </div>
    </div>
  );
}
