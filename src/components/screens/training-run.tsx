"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { AnswerPlate, QuestionCard } from "@/components/ui/answer-plate";
import { Lumi } from "@/components/lumi";
import { ArrowLeft, ArrowRight, RefreshCw, Home } from "lucide-react";

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

interface Filters {
  subjectFilter?: string[];
  topicFilter?: string[];
  length: number;
}

interface Payload {
  sessionId: string;
  length: number;
  currentIndex: number;
  correctCount: number;
  currentQuestion: Question;
  filters?: Filters;
}

interface AnswerResponse {
  ok: boolean;
  correct: boolean;
  reveal: Reveal;
  next: Question | null;
  finished: boolean;
  correctCount: number;
  total: number;
  message?: string;
}

export function TrainingRunScreen() {
  const { payload, navigate, setPayload, pushToast } = useApp();
  const data = payload as Payload | null;

  const [sessionId, setSessionId] = useState<string>(data?.sessionId ?? "");
  const [question, setQuestion] = useState<Question | null>(data?.currentQuestion ?? null);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Reveal | null>(null);
  const [nextQuestionData, setNextQuestionData] = useState<Question | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [correctCount, setCorrectCount] = useState<number>(data?.correctCount ?? 0);
  const [total, setTotal] = useState<number>(data?.length ?? 0);
  const [index, setIndex] = useState<number>(data?.currentIndex ?? 0);
  const [filters, setFilters] = useState<Filters | undefined>(data?.filters);
  const [bootError, setBootError] = useState<string | null>(
    data?.sessionId ? null : "Kein aktives Training gefunden. Bitte starte ein neues.",
  );

  // Reset state when payload changes (e.g., after "Nochmal").
  useEffect(() => {
    if (data?.sessionId) {
      setSessionId(data.sessionId);
      setQuestion(data.currentQuestion);
      setCorrectCount(data.correctCount ?? 0);
      setTotal(data.length ?? 0);
      setIndex(data.currentIndex ?? 0);
      setFilters(data.filters);
      setSelected(null);
      setRevealed(null);
      setNextQuestionData(null);
      setFinished(false);
      setBootError(null);
    }
  }, [data?.sessionId]);

  async function confirmAnswer() {
    if (selected == null || !question || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/training/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionRef: question.ref,
          optionIndex: selected,
        }),
      });
      const data2 = (await res.json()) as AnswerResponse;
      if (!res.ok) {
        pushToast(data2.message ?? "Antwort konnte nicht gesendet werden.", "error");
        setSubmitting(false);
        return;
      }
      setRevealed(data2.reveal);
      setCorrectCount(data2.correctCount);
      setTotal(data2.total);
      setNextQuestionData(data2.next);
      if (data2.finished) setFinished(true);
    } catch {
      pushToast("Netzwerkfehler. Bitte versuche es nochmal.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function nextQuestion() {
    if (!nextQuestionData) return;
    if (finished) return;
    setQuestion(nextQuestionData);
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(null);
    setNextQuestionData(null);
  }

  async function restart() {
    if (!filters) {
      navigate("training-setup");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectFilter: filters.subjectFilter,
          topicFilter: filters.topicFilter,
          length: filters.length,
        }),
      });
      const data3 = await res.json();
      if (!res.ok) {
        pushToast(data3.message ?? "Training konnte nicht neu gestartet werden.", "error");
        setSubmitting(false);
        return;
      }
      setPayload({
        sessionId: data3.sessionId,
        length: data3.length,
        currentIndex: 0,
        correctCount: 0,
        currentQuestion: data3.question,
        filters,
      });
      setSessionId(data3.sessionId);
      setQuestion(data3.question);
      setCorrectCount(0);
      setTotal(data3.length);
      setIndex(0);
      setSelected(null);
      setRevealed(null);
      setFinished(false);
      setNextQuestionData(null);
    } catch {
      pushToast("Netzwerkfehler. Bitte versuche es nochmal.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const subject = question?.subject ?? { code: "", label: "" };

  const plateStateFor = useMemo(() => {
    return (i: number): "idle" | "selected" | "correct" | "wrong" => {
      if (!revealed) {
        return selected === i ? "selected" : "idle";
      }
      if (i === revealed.answeredShuffled && !revealed.correct) return "wrong";
      if (revealed.shuffledOptions[i] === revealed.canonicalOptions[revealed.correctIndex])
        return "correct";
      return "idle";
    };
  }, [revealed, selected]);

  if (bootError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-8 text-center">
        <Lumi pose="sympathy" size={96} />
        <h1 className="mt-4 font-display text-xl font-bold text-ink">Hoppla</h1>
        <p className="mt-2 text-sm text-ink-dim">{bootError}</p>
        <Button className="mt-6" onClick={() => navigate("training-setup")}>
          Neues Training starten
        </Button>
        <Button variant="ghost" className="mt-2" onClick={() => navigate("home")}>
          <Home className="h-4 w-4" /> Zum Menü
        </Button>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4">
        <div className="animate-pulse text-3xl text-ink-dim">Lädt …</div>
      </div>
    );
  }

  // Finished summary.
  if (finished) {
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const pose = pct >= 80 ? "cheer" : pct >= 50 ? "idle" : "sympathy";
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-8 text-center">
        <Lumi pose={pose} size={120} />
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">Training geschafft!</h1>
        <p className="mt-2 text-sm text-ink-dim">
          Du hast {correctCount} von {total} Fragen richtig beantwortet.
        </p>
        <div className="mt-6 w-full max-w-xs rounded-2xl border-2 border-gold/40 bg-bg1/80 p-5">
          <div className="font-display text-4xl font-extrabold text-gold">{pct}%</div>
          <div className="mt-1 text-xs text-ink-dim">Trefferquote</div>
        </div>
        <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
          <Button size="lg" className="h-12" onClick={restart} disabled={submitting}>
            <RefreshCw className="h-4 w-4" /> Nochmal
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
          Frage {index + 1} / {total}
        </span>
      </header>

      {/* Progress bar */}
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-bg2/60">
        <div
          className="h-full bg-gold transition-all"
          style={{ width: `${total > 0 ? ((index + (revealed ? 1 : 0)) / total) * 100 : 0}%` }}
        />
      </div>

      <QuestionCard
        subject={subject}
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
