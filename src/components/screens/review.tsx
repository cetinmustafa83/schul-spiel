"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { AnswerPlate, QuestionCard } from "@/components/ui/answer-plate";
import { Lumi } from "@/components/lumi";
import { ArrowLeft, ArrowRight, Home, RefreshCw } from "lucide-react";

const LETTERS = ["A", "B", "C", "D"] as const;
const SHAPES = ["▲", "●", "■", "◆"] as const;

interface SubjectRef {
  code: string;
  label: string;
  icon?: string | null;
  color?: string | null;
}
interface Question {
  ref: string;
  level?: number;
  subject: SubjectRef;
  topic?: { code: string; label: string };
  difficulty?: number;
  text: string;
  options: string[];
}
interface Reveal {
  correctIndex: number;
  answeredShuffled: number;
  correct: boolean;
  explanation: string;
  optionOrder: number[];
  shuffledOptions: string[];
  canonicalOptions: string[];
  topic?: { code: string; label: string };
}
interface DueResponse {
  sessionId: string | null;
  length: number;
  currentIndex?: number;
  dueCount?: number;
  question: Question | null;
}
interface AnswerResponse {
  ok: boolean;
  correct: boolean;
  reveal: Reveal;
  next: Question | null;
  finished: boolean;
  message?: string;
}

export function ReviewScreen() {
  const { navigate, pushToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Reveal | null>(null);
  const [nextQuestionData, setNextQuestionData] = useState<Question | null>(null);
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/review/due", { cache: "no-store" });
      const data = (await res.json()) as DueResponse;
      if (!res.ok) {
        setError(data.question === null && data.sessionId === null
          ? null
          : "Wiederholungsstapel konnte nicht geladen werden.");
      }
      setSessionId(data.sessionId);
      setQuestion(data.question);
      setTotal(data.length);
      setIndex(0);
      setCorrectCount(0);
      setSelected(null);
      setRevealed(null);
      setNextQuestionData(null);
      setFinished(false);
    } catch {
      setError("Netzwerkfehler. Bitte versuche es später nochmal.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function confirmAnswer() {
    if (selected == null || !question || !sessionId || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/review/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionRef: question.ref,
          optionIndex: selected,
        }),
      });
      const data = (await res.json()) as AnswerResponse;
      if (!res.ok) {
        pushToast(data.message ?? "Antwort konnte nicht gesendet werden.", "error");
        setSubmitting(false);
        return;
      }
      setRevealed(data.reveal);
      setNextQuestionData(data.next);
      if (data.correct) setCorrectCount((c) => c + 1);
      if (data.finished) setFinished(true);
    } catch {
      pushToast("Netzwerkfehler. Bitte versuche es nochmal.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function nextQuestion() {
    if (!nextQuestionData || finished) return;
    setQuestion(nextQuestionData);
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(null);
    setNextQuestionData(null);
  }

  const plateStateFor = useMemo(() => {
    return (i: number): "idle" | "selected" | "correct" | "wrong" => {
      if (!revealed) return selected === i ? "selected" : "idle";
      if (i === revealed.answeredShuffled && !revealed.correct) return "wrong";
      if (revealed.shuffledOptions[i] === revealed.canonicalOptions[revealed.correctIndex])
        return "correct";
      return "idle";
    };
  }, [revealed, selected]);

  // Empty state.
  if (!loading && !sessionId) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-8 text-center">
        <Lumi pose="cheer" size={120} />
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">Alles geschafft!</h1>
        <p className="mt-2 text-sm text-ink-dim">
          Aktuell sind keine Fragen fällig. Komm später wieder, dann wartet bestimmt wieder etwas auf dich.
        </p>
        <Button className="mt-6" onClick={() => navigate("home")}>
          <Home className="h-4 w-4" /> Zurück zum Menü
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-ink-dim">Lädt …</span>
        </div>
        <div className="mb-4 h-24 animate-pulse rounded-3xl border border-border bg-bg1/60" />
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl border border-border bg-bg1/60" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-8 text-center">
        <Lumi pose="sympathy" size={96} />
        <h1 className="mt-4 font-display text-xl font-bold text-ink">Hm</h1>
        <p className="mt-2 text-sm text-ink-dim">{error ?? "Etwas ist schiefgelaufen."}</p>
        <Button className="mt-6" variant="outline" onClick={() => navigate("home")}>
          <Home className="h-4 w-4" /> Zurück zum Menü
        </Button>
      </div>
    );
  }

  if (finished) {
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-8 text-center">
        <Lumi pose="cheer" size={120} />
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">Stapel geschafft!</h1>
        <p className="mt-2 text-sm text-ink-dim">
          Du hast {correctCount} von {total} Wiederholungsfragen richtig beantwortet.
        </p>
        <div className="mt-6 w-full max-w-xs rounded-2xl border-2 border-gold/40 bg-bg1/80 p-5">
          <div className="font-display text-4xl font-extrabold text-gold">{pct}%</div>
          <div className="mt-1 text-xs text-ink-dim">Trefferquote</div>
        </div>
        <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
          <Button size="lg" className="h-12" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" /> Nochmal prüfen
          </Button>
          <Button size="lg" variant="outline" className="h-12" onClick={() => navigate("home")}>
            <Home className="h-4 w-4" /> Zurück zum Menü
          </Button>
        </div>
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
        <span className="font-display text-sm font-semibold text-gold">
          Wiederholung {index + 1} / {total}
        </span>
      </header>

      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-bg2/60">
        <div
          className="h-full bg-gold transition-all"
          style={{ width: `${total > 0 ? ((index + (revealed ? 1 : 0)) / total) * 100 : 0}%` }}
        />
      </div>

      <QuestionCard
        subject={question.subject}
        level={question.level}
        difficulty={question.difficulty}
        text={question.text}
      >
        <div className="mt-4 flex flex-col gap-2.5">
          {question.options.map((opt, i) => (
            <AnswerPlate
              key={i}
              letter={LETTERS[i]}
              shape={SHAPES[i]}
              text={opt}
              state={plateStateFor(i)}
              index={i}
              disabled={revealed != null || submitting}
              onClick={() => setSelected(i)}
            />
          ))}
        </div>

        {!revealed ? (
          <Button
            size="lg"
            className="mt-5 h-12 w-full font-display font-bold"
            onClick={confirmAnswer}
            disabled={selected == null || submitting}
          >
            {submitting ? "Prüfe …" : "Bestätigen"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <ExplanationCard reveal={revealed} onNext={nextQuestion} isLast={finished} />
        )}
      </QuestionCard>
    </div>
  );
}

function ExplanationCard({
  reveal,
  onNext,
  isLast,
}: {
  reveal: Reveal;
  onNext: () => void;
  isLast: boolean;
}) {
  return (
    <div
      className={`mt-5 rounded-2xl border-2 p-4 ${
        reveal.correct ? "border-mint/50 bg-mint/10" : "border-coral/50 bg-coral/10"
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
      {reveal.topic && (
        <div className="mb-1 text-xs text-ink-dim">Thema: {reveal.topic.label}</div>
      )}
      <p className="text-sm leading-relaxed text-ink">{reveal.explanation}</p>
      {isLast ? null : (
        <Button size="sm" className="mt-3" onClick={onNext}>
          Nächste Frage
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
