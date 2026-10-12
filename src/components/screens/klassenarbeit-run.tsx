"use client";

import { useState, useRef } from "react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, FileText, RotateCcw, Home, ChevronLeft, ChevronRight } from "lucide-react";
import { useScreenTransition } from "@/lib/animations/gsap-hooks";
import { cn } from "@/lib/utils";
import { sfxCorrect, sfxWrong, sfxSelect } from "@/lib/audio/sfx";

interface ExamQuestion {
  ref: string;
  level: number;
  subject: { code: string; label: string; icon?: string | null; color?: string | null };
  topic: { code: string; label: string };
  difficulty: number;
  text: string;
  options: string[];
}

interface ExamResult {
  results: Array<{
    ref: string;
    level: number;
    text: string;
    options: string[];
    correctIndex: number;
    answeredIndex: number | null;
    correct: boolean;
    explanation: string;
    topic: { code: string; label: string };
    difficulty: number;
    questionId: number;
    topicId: number;
  }>;
  correctCount: number;
  total: number;
  percentage: number;
  grade: string;
}

const LETTERS = ["A", "B", "C", "D"];
const SHAPES = ["▲", "●", "■", "◆"];

export function KlassenarbeitRunScreen() {
  const { payload, navigate, player, pushToast } = useApp();
  const ref = useScreenTransition<HTMLDivElement>();
  const sessionId = payload?.sessionId as string;
  const questions = (payload?.questions as ExamQuestion[]) ?? [];
  const total = questions.length;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({}); // questionIdx → optionIndex
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [reviewIdx, setReviewIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function selectAnswer(qIdx: number, optIdx: number) {
    sfxSelect();
    setAnswers({ ...answers, [qIdx]: optIdx });
  }

  function goToQuestion(idx: number) {
    setCurrentIdx(idx);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitExam() {
    const unanswered = total - Object.keys(answers).length;
    if (unanswered > 0) {
      if (!confirm(`Du hast ${unanswered} Frage(n) nicht beantwortet. Trotzdem abgeben?`)) {
        return;
      }
    }
    setSubmitting(true);
    try {
      // Submit all answers to the server
      for (let i = 0; i < total; i++) {
        if (answers[i] != null) {
          await fetch(`/api/games/${sessionId}/answer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questionRef: questions[i].ref, optionIndex: answers[i] }),
          });
        }
      }
      // Fetch results
      const res = await fetch(`/api/klassenarbeit?sessionId=${sessionId}`);
      const data: ExamResult = await res.json();
      setResult(data);

      // Play sound
      if (data.percentage >= 50) {
        sfxCorrect();
      } else {
        sfxWrong();
      }

      // Save to LokiJS history
      if (player?.name) {
        const { addGameHistory, addSeenQuestion, addToReviewDeck, upsertTopicMastery, updatePlayer } = await import("@/lib/browser-db");
        const correct = data.correctCount;
        const xpGain = correct * 8;
        await updatePlayer(player.name, { xp: (player.xp ?? 0) + xpGain });
        for (const r of data.results) {
          if (r.questionId) await addSeenQuestion(player.name, r.questionId);
          if (r.topicId != null) await upsertTopicMastery(player.name, r.topicId, r.correct);
          if (!r.correct && r.questionId) await addToReviewDeck(player.name, r.questionId);
        }
        await addGameHistory({
          playerName: player.name,
          mode: "KLASSENARBEIT",
          level: 0,
          winnings: 0,
          correct,
          total,
          date: new Date().toISOString(),
        });
      }
    } catch {
      pushToast("Die Klassenarbeit konnte nicht ausgewertet werden.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // ----- Result screen -----
  if (result) {
    return (
      <div ref={ref} className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6 sm:px-6">
        <header className="mb-6 text-center">
          <div className="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-2xl border border-border bg-bg1/60">
            <FileText className="h-8 w-8 text-ink-dim" />
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            {result.correctCount} / {result.total}
          </h1>
          <p className="mt-1 text-sm text-ink-dim">
            Note: <span className="font-display font-bold text-ink">{result.grade}</span> · {result.percentage}%
          </p>
        </header>

        {/* Stats bar */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-bg1/60 p-3 text-center backdrop-blur">
            <div className="font-display text-xl font-bold text-mint">{result.correctCount}</div>
            <div className="text-[10px] uppercase tracking-wider text-ink-dim">Richtig</div>
          </div>
          <div className="rounded-xl border border-border bg-bg1/60 p-3 text-center backdrop-blur">
            <div className="font-display text-xl font-bold text-coral">{result.total - result.correctCount}</div>
            <div className="text-[10px] uppercase tracking-wider text-ink-dim">Falsch</div>
          </div>
          <div className="rounded-xl border border-border bg-bg1/60 p-3 text-center backdrop-blur">
            <div className="font-display text-xl font-bold text-ink">{result.percentage}%</div>
            <div className="text-[10px] uppercase tracking-wider text-ink-dim">Quote</div>
          </div>
        </div>

        {/* Review questions */}
        <section className="flex-1">
          <h2 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-ink-dim">
            Fragen überprüfen
          </h2>
          <div className="flex flex-col gap-3">
            {result.results.map((r, idx) => (
              <div
                key={r.ref}
                className="rounded-xl border p-4 backdrop-blur"
                style={{
                  borderColor: r.correct ? "rgba(61,219,164,0.25)" : "rgba(255,107,122,0.25)",
                  background: r.correct
                    ? "linear-gradient(135deg, rgba(61,219,164,0.04), rgba(28,26,68,0.6))"
                    : "linear-gradient(135deg, rgba(255,107,122,0.04), rgba(28,26,68,0.6))",
                }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-ink-dim">
                    Frage {idx + 1} · {r.topic.label}
                  </span>
                  <span className={cn("text-xs font-bold", r.correct ? "text-mint" : "text-coral")}>
                    {r.correct ? "✓ Richtig" : "✕ Falsch"}
                  </span>
                </div>
                <p className="text-sm text-ink leading-relaxed">{r.text}</p>
                <div className="mt-2 grid grid-cols-1 gap-1.5">
                  {r.options.map((opt, optIdx) => {
                    const isCorrect = optIdx === r.correctIndex;
                    const isAnswered = optIdx === r.answeredIndex;
                    return (
                      <div
                        key={optIdx}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm",
                          isCorrect ? "bg-mint/15 text-mint" : isAnswered ? "bg-coral/15 text-coral" : "text-ink-dim"
                        )}
                      >
                        <span className="font-mono text-xs">{LETTERS[optIdx]}</span>
                        {opt}
                        {isCorrect && <Check className="ml-auto h-3.5 w-3.5" />}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 border-t border-border/50 pt-2 text-xs leading-relaxed text-ink-dim">
                  {r.explanation}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="h-12 flex-1" onClick={() => navigate("klassenarbeit-setup")}>
            <RotateCcw className="mr-2 h-4 w-4" /> Neue Klassenarbeit
          </Button>
          <Button variant="outline" className="h-12 flex-1" onClick={() => navigate("home")}>
            <Home className="mr-2 h-4 w-4" /> Zum Menü
          </Button>
        </div>
      </div>
    );
  }

  // ----- Exam screen -----
  if (questions.length === 0) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-8 text-center">
        <div className="text-4xl">📝</div>
        <h1 className="mt-3 font-display text-xl font-bold text-ink">Keine Fragen</h1>
        <p className="mt-2 text-sm text-ink-dim">Die Klassenarbeit konnte nicht geladen werden.</p>
        <Button className="mt-6" variant="outline" onClick={() => navigate("home")}>Zum Menü</Button>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === total;

  return (
    <div ref={ref} className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-4 sm:px-6">
      {/* Top bar */}
      <header className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            if (confirm("Klassenarbeit wirklich verlassen? Dein Fortschritt geht verloren.")) {
              navigate("home");
            }
          }}
          className="tap-target inline-flex items-center gap-1 rounded-full bg-bg2/40 px-3 py-1.5 text-sm text-ink-dim hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Verlassen
        </button>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-bg2/40 px-3 py-1.5 text-sm font-display tabular-nums text-ink-dim">
            <FileText className="h-3.5 w-3.5" />
            Frage {currentIdx + 1} / {total}
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-bg2/40 px-3 py-1.5 text-sm font-display tabular-nums text-ink-dim">
            {answeredCount} / {total} beantwortet
          </div>
        </div>
      </header>

      {/* Question navigation dots */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {questions.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => goToQuestion(idx)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md border text-[10px] font-mono transition-all",
              idx === currentIdx
                ? "border-ink-dim/40 bg-bg1/70 text-ink"
                : answers[idx] != null
                ? "border-mint/30 bg-mint/10 text-mint/70"
                : "border-border bg-bg1/30 text-ink-dim/50"
            )}
            aria-label={`Frage ${idx + 1}`}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      <main ref={scrollRef} className="flex-1 overflow-y-auto">
        {/* Current question */}
        <div
          className="rounded-2xl p-5 backdrop-blur"
          style={{
            background: "linear-gradient(135deg, rgba(40,38,80,0.7), rgba(28,26,68,0.9))",
            border: "1px solid rgba(106,122,154,0.2)",
          }}
        >
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-2 rounded-full bg-bg2/60 px-3 py-1 font-medium text-ink">
              <span aria-hidden>{currentQuestion.subject.icon ?? "📚"}</span>
              {currentQuestion.subject.label}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-ink-dim">
              {currentQuestion.topic.label}
            </span>
          </div>
          <h2 className="font-display text-lg sm:text-xl font-semibold leading-snug text-ink" style={{ fontSize: "clamp(1.1rem, 1.5vw + 0.6rem, 1.6rem)" }}>
            {currentQuestion.text}
          </h2>

          {/* Answer options */}
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {currentQuestion.options.map((opt, optIdx) => {
              const isSelected = answers[currentIdx] === optIdx;
              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => selectAnswer(currentIdx, optIdx)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all",
                    isSelected
                      ? "border-ink-dim/40 bg-bg2/50"
                      : "border-border bg-bg1/40 hover:border-ink-dim/20"
                  )}
                  style={isSelected ? { boxShadow: "0 0 12px rgba(106,122,154,0.15)" } : undefined}
                >
                  <span className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    isSelected ? "bg-ink text-bg0" : "bg-bg2/40 text-ink-dim"
                  )}>
                    {LETTERS[optIdx]}
                  </span>
                  <span className="flex-1 text-sm text-ink">{opt}</span>
                  {isSelected && <Check className="h-4 w-4 text-ink-dim" />}
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Navigation + submit */}
      <footer className="mt-4 flex items-center gap-2">
        <Button
          variant="outline"
          className="h-12 px-4"
          onClick={() => goToQuestion(Math.max(0, currentIdx - 1))}
          disabled={currentIdx === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {currentIdx < total - 1 ? (
          <Button
            className="h-12 flex-1 font-display font-bold"
            onClick={() => goToQuestion(currentIdx + 1)}
          >
            Weiter <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            className="h-12 flex-1 font-display font-bold"
            onClick={() => void submitExam()}
            disabled={submitting}
          >
            {submitting ? "Wird ausgewertet …" : `Abgeben (${answeredCount}/${total})`}
          </Button>
        )}
        <Button
          variant="outline"
          className="h-12 px-4"
          onClick={() => goToQuestion(Math.min(total - 1, currentIdx + 1))}
          disabled={currentIdx === total - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </footer>
    </div>
  );
}
