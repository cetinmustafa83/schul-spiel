"use client";

import { useState, useRef, useEffect } from "react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, ArrowRight, Check, FileText, RotateCcw, Home,
  ChevronLeft, ChevronRight, Timer, Pause, Play, AlertCircle, Brain, Clock, TrendingUp, Lightbulb,
} from "lucide-react";
import { useScreenTransition } from "@/lib/animations/gsap-hooks";
import { cn } from "@/lib/utils";
import { sfxCorrect, sfxWrong, sfxSelect, sfxTickTack, sfxTimeUp } from "@/lib/audio/sfx";

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
    ref: string; level: number; text: string; options: string[];
    correctIndex: number; answeredIndex: number | null; correct: boolean;
    explanation: string; topic: { code: string; label: string };
    difficulty: number; questionId: number; topicId: number;
  }>;
  correctCount: number;
  total: number;
  percentage: number;
  grade: string;
}

const EXAM_DURATION = 40 * 60; // 40 minutes in seconds
const LETTERS = ["A", "B", "C", "D"];
const SHAPES = ["▲", "●", "■", "◆"];

export function KlassenarbeitRunScreen() {
  const { payload, navigate, player, pushToast } = useApp();
  const ref = useScreenTransition<HTMLDivElement>();
  const sessionId = payload?.sessionId as string;
  const questions = (payload?.questions as ExamQuestion[]) ?? [];
  const total = questions.length;

  // --- Exam state ---
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Timer state ---
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseUsed, setPauseUsed] = useState(false);
  const [examStartedAt] = useState(Date.now());
  const examStartRef = useRef<number>(Date.now());
  const pauseStartRef = useRef<number | null>(null);
  const totalPausedRef = useRef<number>(0);

  // --- Per-question time tracking ---
  const [questionTimes, setQuestionTimes] = useState<Record<number, number>>({}); // qIdx → seconds spent
  const questionEnterRef = useRef<number>(Date.now());
  const lastQIdxRef = useRef<number>(0);

  // Track time when switching questions
  function goToQuestion(idx: number) {
    // Save time spent on previous question
    const now = Date.now();
    const elapsed = Math.floor((now - questionEnterRef.current) / 1000);
    setQuestionTimes((prev) => ({
      ...prev,
      [lastQIdxRef.current]: (prev[lastQIdxRef.current] ?? 0) + elapsed,
    }));
    questionEnterRef.current = now;
    lastQIdxRef.current = idx;
    setCurrentIdx(idx);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectAnswer(qIdx: number, optIdx: number) {
    sfxSelect();
    // Track if this is a change (dilemma indicator)
    setAnswers((prev) => {
      const wasAnswered = prev[qIdx] != null;
      if (wasAnswered && prev[qIdx] !== optIdx) {
        // Answer changed — mark as "changed answer"
        setAnswerChanges((p) => ({ ...p, [qIdx]: (p[qIdx] ?? 0) + 1 }));
      }
      return { ...prev, [qIdx]: optIdx };
    });
  }

  const [answerChanges, setAnswerChanges] = useState<Record<number, number>>({}); // qIdx → number of changes

  // --- Timer countdown ---
  useEffect(() => {
    if (isPaused || result) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 10 && next > 0) sfxTickTack(next <= 3);
        if (next <= 0) {
          sfxTimeUp();
          // Auto-submit
          void submitExam(true);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, result]);

  // Save question time on unmount
  useEffect(() => {
    return () => {
      const now = Date.now();
      const elapsed = Math.floor((now - questionEnterRef.current) / 1000);
      setQuestionTimes((prev) => ({
        ...prev,
        [lastQIdxRef.current]: (prev[lastQIdxRef.current] ?? 0) + elapsed,
      }));
    };
  }, []);

  function togglePause() {
    if (isPaused) {
      // Resume
      if (pauseStartRef.current) {
        totalPausedRef.current += Date.now() - pauseStartRef.current;
        pauseStartRef.current = null;
      }
      setIsPaused(false);
    } else {
      // Pause (only 1 allowed)
      if (pauseUsed) {
        pushToast("Du hast deine Pause bereits verwendet.", "info");
        return;
      }
      pauseStartRef.current = Date.now();
      setIsPaused(true);
      setPauseUsed(true);
      pushToast("Pause gestartet — WC-Pause. Klicke zum Fortsetzen.", "info");
    }
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  async function submitExam(autoSubmit = false) {
    if (!autoSubmit) {
      const unanswered = total - Object.keys(answers).length;
      if (unanswered > 0) {
        if (!confirm(`Du hast ${unanswered} Frage(n) nicht beantwortet. Trotzdem abgeben?`)) return;
      }
    }
    // Save time for last question
    const now = Date.now();
    const elapsed = Math.floor((now - questionEnterRef.current) / 1000);
    setQuestionTimes((prev) => ({
      ...prev,
      [lastQIdxRef.current]: (prev[lastQIdxRef.current] ?? 0) + elapsed,
    }));

    setSubmitting(true);
    try {
      for (let i = 0; i < total; i++) {
        if (answers[i] != null) {
          await fetch(`/api/games/${sessionId}/answer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questionRef: questions[i].ref, optionIndex: answers[i] }),
          });
        }
      }
      const res = await fetch(`/api/klassenarbeit?sessionId=${sessionId}`);
      const data: ExamResult = await res.json();
      setResult(data);
      if (data.percentage >= 50) sfxCorrect(); else sfxWrong();

      // LokiJS save
      if (player?.name) {
        const { addGameHistory, addSeenQuestion, addToReviewDeck, upsertTopicMastery, updatePlayer } = await import("@/lib/browser-db");
        await updatePlayer(player.name, { xp: (player.xp ?? 0) + data.correctCount * 8 });
        for (const r of data.results) {
          if (r.questionId) await addSeenQuestion(player.name, r.questionId);
          if (r.topicId != null) await upsertTopicMastery(player.name, r.topicId, r.correct);
          if (!r.correct && r.questionId) await addToReviewDeck(player.name, r.questionId);
        }
        await addGameHistory({
          playerName: player.name, mode: "KLASSENARBEIT", level: 0, winnings: 0,
          correct: data.correctCount, total, date: new Date().toISOString(),
        });
      }
    } catch {
      pushToast("Die Klassenarbeit konnte nicht ausgewertet werden.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // ====== RESULT / REPORT SCREEN ======
  if (result) {
    return <ExamReport
      result={result}
      questionTimes={questionTimes}
      answerChanges={answerChanges}
      totalTime={EXAM_DURATION - timeLeft}
      player={player}
      navigate={navigate}
    />;
  }

  // ====== EXAM SCREEN ======
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
  const timeUrgent = timeLeft <= 60;

  return (
    <div ref={ref} className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-4 sm:px-6">
      {/* Top bar with timer */}
      <header className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            if (confirm("Klassenarbeit wirklich verlassen? Dein Fortschritt geht verloren.")) navigate("home");
          }}
          className="tap-target inline-flex items-center gap-1 rounded-full bg-bg2/40 px-3 py-1.5 text-sm text-ink-dim hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Verlassen
        </button>
        <div className="flex items-center gap-2">
          {/* Timer */}
          <div className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-display tabular-nums transition-all",
            isPaused ? "bg-sky/20 text-sky" : timeUrgent ? "bg-coral/20 text-coral animate-pulse" : "bg-bg2/40 text-ink-dim"
          )}>
            <Timer className="h-3.5 w-3.5" />
            {isPaused ? "PAUSE" : formatTime(timeLeft)}
          </div>
          {/* Pause button */}
          <button
            type="button"
            onClick={togglePause}
            disabled={!isPaused && pauseUsed}
            className={cn(
              "tap-target flex items-center justify-center rounded-full p-2 transition-all",
              isPaused ? "bg-mint/20 text-mint hover:bg-mint/30" : pauseUsed ? "bg-bg2/20 text-ink-dim/30" : "bg-bg2/40 text-ink-dim hover:text-ink"
            )}
            title={isPaused ? "Fortsetzen" : pauseUsed ? "Pause verbraucht" : "Pause (1× möglich)"}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
          {/* Progress */}
          <div className="flex items-center gap-1.5 rounded-full bg-bg2/40 px-3 py-1.5 text-sm font-display tabular-nums text-ink-dim">
            {answeredCount}/{total}
          </div>
        </div>
      </header>

      {/* Pause overlay */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg0/80 backdrop-blur-xl">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-sky/30 bg-sky/10">
              <Pause className="h-8 w-8 text-sky" />
            </div>
            <h2 className="font-display text-xl font-bold text-ink">Pause</h2>
            <p className="text-sm text-ink-dim">Der Timer ist gestoppt. Klicke zum Fortsetzen.</p>
            <Button onClick={togglePause} className="h-12 px-8">
              <Play className="mr-2 h-4 w-4" /> Fortsetzen
            </Button>
          </div>
        </div>
      )}

      {/* Question navigation dots */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {questions.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => goToQuestion(idx)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md border text-[10px] font-mono transition-all",
              idx === currentIdx ? "border-ink-dim/40 bg-bg1/70 text-ink"
              : answers[idx] != null ? "border-mint/30 bg-mint/10 text-mint/70"
              : "border-border bg-bg1/30 text-ink-dim/50"
            )}
          >{idx + 1}</button>
        ))}
      </div>

      <main ref={scrollRef} className="flex-1 overflow-y-auto">
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
                    isSelected ? "border-ink-dim/40 bg-bg2/50" : "border-border bg-bg1/40 hover:border-ink-dim/20"
                  )}
                  style={isSelected ? { boxShadow: "0 0 12px rgba(106,122,154,0.15)" } : undefined}
                >
                  <span className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    isSelected ? "bg-ink text-bg0" : "bg-bg2/40 text-ink-dim"
                  )}>{LETTERS[optIdx]}</span>
                  <span className="flex-1 text-sm text-ink">{opt}</span>
                  {isSelected && <Check className="h-4 w-4 text-ink-dim" />}
                </button>
              );
            })}
          </div>
        </div>
      </main>

      <footer className="mt-4 flex items-center gap-2">
        <Button variant="outline" className="h-12 px-4" onClick={() => goToQuestion(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {currentIdx < total - 1 ? (
          <Button className="h-12 flex-1 font-display font-bold" onClick={() => goToQuestion(currentIdx + 1)}>
            Weiter <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button className="h-12 flex-1 font-display font-bold" onClick={() => void submitExam()} disabled={submitting}>
            {submitting ? "Wird ausgewertet …" : `Abgeben (${answeredCount}/${total})`}
          </Button>
        )}
        <Button variant="outline" className="h-12 px-4" onClick={() => goToQuestion(Math.min(total - 1, currentIdx + 1))} disabled={currentIdx === total - 1}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </footer>
    </div>
  );
}

// ============================================================================
// EXAM REPORT — premium analysis screen
// ============================================================================

interface ExamReportProps {
  result: ExamResult;
  questionTimes: Record<number, number>;
  answerChanges: Record<number, number>;
  totalTime: number;
  player: { name: string; schoolType: string; grade: number; xp: number } | null;
  navigate: (s: never) => void;
}

function ExamReport({ result, questionTimes, answerChanges, totalTime, player, navigate }: ExamReportProps) {
  const ref = useScreenTransition<HTMLDivElement>();
  const { results, correctCount, total, percentage, grade } = result;

  // Analysis
  const avgTimePerQuestion = total > 0 ? Math.round(totalTime / total) : 0;
  const slowestQuestion = results.reduce((max, r, idx) => {
    const t = questionTimes[idx] ?? 0;
    return t > (questionTimes[max] ?? 0) ? idx : max;
  }, 0);
  const fastestQuestion = results.reduce((min, r, idx) => {
    const t = questionTimes[idx] ?? Infinity;
    return t < (questionTimes[min] ?? Infinity) ? idx : min;
  }, 0);
  const changedAnswers = Object.entries(answerChanges).filter(([, count]) => count > 0);
  const changedCount = changedAnswers.length;
  const correctAfterChange = changedAnswers.filter(([idx]) => results[Number(idx)]?.correct).length;
  const wrongAfterChange = changedCount - correctAfterChange;

  // Dilemma detection: spent >2x avg time AND changed answer
  const dilemmas = results.filter((r, idx) => {
    const t = questionTimes[idx] ?? 0;
    return t > avgTimePerQuestion * 2 && (answerChanges[idx] ?? 0) > 0;
  });

  // Topic breakdown
  const topicStats: Record<string, { correct: number; total: number; time: number }> = {};
  results.forEach((r, idx) => {
    const key = r.topic.label;
    if (!topicStats[key]) topicStats[key] = { correct: 0, total: 0, time: 0 };
    topicStats[key].total++;
    if (r.correct) topicStats[key].correct++;
    topicStats[key].time += questionTimes[idx] ?? 0;
  });

  // Psychological assessment
  const confidence = changedCount === 0 ? "Sehr selbstsicher — du hast keine Antwort geändert." :
    correctAfterChange > wrongAfterChange ? "Gute Selbstkontontrolle — Änderungen waren meist richtig." :
    "Unsicherheit erkannt — Änderungen waren oft falsch. Vertraue deinem ersten Instinkt mehr.";

  const pace = avgTimePerQuestion < 30 ? "Sehr schnell — nimm dir mehr Zeit für schwierige Fragen." :
    avgTimePerQuestion > 120 ? "Sehr gründlich — versuche, bei leichten Fragen schneller zu sein." :
    "Gutes Tempo — du balancierst Geschwindigkeit und Genauigkeit gut.";

  const focus = dilemmas.length === 0 ? "Keine offensichtlichen Unsicherheitsmomente — fokussierte Leistung." :
    `${dilemmas.length} Frage(n) mit langem Zögern und Antwortänderung erkannt. Diese Themen solltest du wiederholen.`;

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  }

  return (
    <div ref={ref} className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6 sm:px-6">
      {/* Header */}
      <header className="mb-6 text-center">
        <div className="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-2xl border border-border bg-bg1/60">
          <FileText className="h-8 w-8 text-ink-dim" />
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
          {correctCount} / {total}
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Note: <span className="font-display font-bold text-ink">{grade}</span> · {percentage}%
        </p>
      </header>

      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Check className="h-4 w-4" />} label="Richtig" value={String(correctCount)} color="mint" />
        <StatCard icon={<AlertCircle className="h-4 w-4" />} label="Falsch" value={String(total - correctCount)} color="coral" />
        <StatCard icon={<Clock className="h-4 w-4" />} label="Ø Zeit/Frage" value={formatTime(avgTimePerQuestion)} color="sky" />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Antwort geändert" value={String(changedCount)} color="violet" />
      </div>

      {/* Psychological assessment */}
      <section className="mb-6">
        <h2 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-ink-dim">
          Auswertung
        </h2>
        <div className="flex flex-col gap-3">
          <AssessmentCard icon={<Brain className="h-4 w-4" />} title="Selbstvertrauen" text={confidence} />
          <AssessmentCard icon={<Clock className="h-4 w-4" />} title="Tempo" text={pace} />
          <AssessmentCard icon={<Lightbulb className="h-4 w-4" />} title="Fokus" text={focus} />
        </div>
      </section>

      {/* Dilemma detection */}
      {dilemmas.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-ink-dim">
            Ikilem Tespiti ({dilemmas.length})
          </h2>
          <div className="rounded-xl border border-coral/25 bg-coral/5 p-4 backdrop-blur">
            <div className="flex flex-col gap-2">
              {dilemmas.map((r, idx) => {
                const realIdx = results.indexOf(r);
                return (
                  <div key={r.ref} className="flex items-center justify-between text-sm">
                    <span className="text-ink-dim">
                      Frage {realIdx + 1}: <span className="text-ink">{r.topic.label}</span>
                    </span>
                    <span className="text-coral">{formatTime(questionTimes[realIdx] ?? 0)} · {answerChanges[realIdx] ?? 0}× geändert</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-ink-dim leading-relaxed">
              Diese Fragen haben dich besonders lange beschäftigt und du hast deine Antwort geändert.
              Das deutet auf Unsicherheit hin — wiederhole diese Themen!
            </p>
          </div>
        </section>
      )}

      {/* Topic breakdown */}
      <section className="mb-6">
        <h2 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-ink-dim">
          Themen-Übersicht
        </h2>
        <div className="flex flex-col gap-2">
          {Object.entries(topicStats).map(([topic, stats]) => {
            const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
            return (
              <div key={topic} className="flex items-center gap-3 rounded-lg border border-border bg-bg1/40 p-3 backdrop-blur">
                <div className="flex-1">
                  <div className="text-sm font-medium text-ink">{topic}</div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-bg2/30">
                    <div
                      className={cn("h-full transition-all", pct >= 50 ? "bg-mint/60" : "bg-coral/60")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-sm font-bold text-ink tabular-nums">{stats.correct}/{stats.total}</div>
                  <div className="text-[10px] text-ink-dim">{formatTime(stats.time)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Per-question detail */}
      <section className="mb-6">
        <h2 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-ink-dim">
          Frage-Detail
        </h2>
        <div className="flex flex-col gap-3">
          {results.map((r, idx) => {
            const time = questionTimes[idx] ?? 0;
            const changes = answerChanges[idx] ?? 0;
            const isSlow = time > avgTimePerQuestion * 1.5;
            return (
              <div
                key={r.ref}
                className="rounded-xl border p-4 backdrop-blur"
                style={{
                  borderColor: r.correct ? "rgba(61,219,164,0.2)" : "rgba(255,107,122,0.2)",
                  background: r.correct ? "rgba(61,219,164,0.03)" : "rgba(255,107,122,0.03)",
                }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-ink-dim">
                    Frage {idx + 1} · {r.topic.label}
                  </span>
                  <div className="flex items-center gap-2">
                    {changes > 0 && (
                      <span className="rounded bg-coral/15 px-1.5 py-0.5 text-[9px] font-bold text-coral">
                        {changes}× geändert
                      </span>
                    )}
                    {isSlow && (
                      <span className="rounded bg-sky/15 px-1.5 py-0.5 text-[9px] font-bold text-sky">
                        langsam
                      </span>
                    )}
                    <span className={cn("text-xs font-bold", r.correct ? "text-mint" : "text-coral")}>
                      {r.correct ? "✓" : "✕"}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-ink leading-relaxed">{r.text}</p>
                <div className="mt-2 grid grid-cols-1 gap-1">
                  {r.options.map((opt, optIdx) => {
                    const isCorrect = optIdx === r.correctIndex;
                    const isAnswered = optIdx === r.answeredIndex;
                    return (
                      <div
                        key={optIdx}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-1 text-sm",
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
                <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2">
                  <p className="flex-1 text-xs leading-relaxed text-ink-dim">{r.explanation}</p>
                  <span className="ml-3 shrink-0 text-[10px] tabular-nums text-ink-dim">{formatTime(time)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <Button variant="outline" className="h-12 flex-1" onClick={() => navigate("klassenarbeit-setup" as never)}>
          <RotateCcw className="mr-2 h-4 w-4" /> Neue Klassenarbeit
        </Button>
        <Button variant="outline" className="h-12 flex-1" onClick={() => navigate("home" as never)}>
          <Home className="mr-2 h-4 w-4" /> Zum Menü
        </Button>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    mint: "text-mint",
    coral: "text-coral",
    sky: "text-sky",
    violet: "text-violet",
  };
  return (
    <div className="rounded-xl border border-border bg-bg1/60 p-3 text-center backdrop-blur">
      <div className={cn("mb-1 flex justify-center", colorMap[color])}>{icon}</div>
      <div className={cn("font-display text-xl font-bold tabular-nums", colorMap[color])}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-ink-dim">{label}</div>
    </div>
  );
}

function AssessmentCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-bg1/40 p-4 backdrop-blur">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-bg2/40 text-ink-dim">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold text-ink">{title}</div>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-dim">{text}</p>
      </div>
    </div>
  );
}
