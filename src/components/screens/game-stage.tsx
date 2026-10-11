"use client";

import { useEffect, useState, useCallback } from "react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { AnswerPlate, QuestionCard } from "@/components/ui/answer-plate";
import { LadderRail, type LadderStep } from "@/components/ui/ladder-rail";
import { Lumi } from "@/components/lumi";
import {
  ArrowLeft, ArrowRight, Split, BarChart3, PhoneCall, Shuffle,
  DoorOpen, X, CheckCircle2, XCircle, Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTaler, SCHOOL_TYPE_LABELS } from "@/lib/german";
import { useQuestionReveal, playCorrectReveal, playWrongReveal } from "@/lib/animations/gsap-hooks";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface QuestionPayload {
  ref: string;
  level: number;
  subject: { code: string; label: string; icon?: string | null; color?: string | null };
  difficulty: number;
  text: string;
  options: string[];
}

interface JokerState {
  FIFTY_FIFTY: boolean;
  AUDIENCE: boolean;
  PHONE: boolean;
  SWITCH: boolean;
}

interface RevealData {
  correctIndex: number;
  answeredShuffled: number;
  correct: boolean;
  explanation: string;
  optionOrder: number[];
  shuffledOptions: string[];
  canonicalOptions: string[];
  topic: { code: string; label: string };
  questionId?: number;
  topicId?: number;
}

const SHAPES = ["▲", "●", "■", "◆"] as const;
const LETTERS = ["A", "B", "C", "D"] as const;

export function GameStageScreen() {
  const { payload, navigate, pushToast, prefs, player } = useApp();
  const gameId = payload?.gameId as string;
  const initialLadder = (payload?.ladder as LadderStep[]) ?? [];
  const initialJokers = (payload?.jokers as JokerState) ?? { FIFTY_FIFTY: true, AUDIENCE: true, PHONE: true, SWITCH: true };

  const [ladder, setLadder] = useState<LadderStep[]>(initialLadder);
  const [level, setLevel] = useState(1);
  const [question, setQuestion] = useState<QuestionPayload | null>(null);
  const [jokers, setJokers] = useState<JokerState>(initialJokers);
  const [selected, setSelected] = useState<number | null>(null);
  const [eliminated, setEliminated] = useState<number[]>([]);
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [phase, setPhase] = useState<"loading" | "asking" | "revealing" | "ended">("loading");
  const [endedReason, setEndedReason] = useState<"wrong_answer" | "walked_away" | "summit_reached">("wrong_answer");
  const [winnings, setWinnings] = useState(0);
  const [gameFinished, setGameFinished] = useState(false);
  const [finalSheet, setFinalSheet] = useState(false);
  const [walkAwayDialog, setWalkAwayDialog] = useState(false);
  const [jokerModal, setJokerModal] = useState<"audience" | "phone" | null>(null);
  const [audiencePoll, setAudiencePoll] = useState<number[] | null>(null);
  const [phoneSuggests, setPhoneSuggests] = useState<{ suggests: number; confidence: string; phrase: string } | null>(null);

  // GSAP question-reveal animation — re-triggers when the level changes.
  const questionRef = useQuestionReveal<HTMLDivElement>([level, question?.ref]);

  const refreshState = useCallback(async () => {
    const res = await fetch(`/api/games/${gameId}`, { cache: "no-store" });
    const data = await res.json();
    setLadder(data.ladder ?? []);
    setJokers(data.jokers ?? { FIFTY_FIFTY: true, AUDIENCE: true, PHONE: true, SWITCH: true });
    setLevel(data.level ?? 1);
    setWinnings(data.winnings ?? 0);
    if (data.status === "finished" || !data.question) {
      setEndedReason(data.winnings > 0 ? "walked_away" : "wrong_answer");
      setPhase("ended");
    } else {
      setQuestion(data.question);
      setPhase("asking");
    }
  }, [gameId]);

  // Fetch game state if no payload.
  useEffect(() => {
    if (!gameId) {
      navigate("home");
      return;
    }
    void (async () => {
      // We rely on the payload's question (from POST /api/games). If empty, fetch /api/games/:id.
      if (payload?.question) {
        setQuestion(payload.question as QuestionPayload);
        setLevel((payload.question as QuestionPayload).level);
        setPhase("asking");
      } else {
        await refreshState();
      }
    })();
  }, [gameId, payload, navigate, refreshState]);

  async function confirmAnswer() {
    if (selected == null || !question) return;
    setFinalSheet(false);
    setPhase("revealing");
    try {
      const res = await fetch(`/api/games/${gameId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionRef: question.ref, optionIndex: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        pushToast(data.message ?? "Antwort konnte nicht gesendet werden.", "error");
        setPhase("asking");
        return;
      }
      // Set reveal FIRST, then update other state
      setReveal(data.reveal);
      if (data.game?.status === "finished") {
        setWinnings(data.game.winnings ?? 0);
        setEndedReason(data.game.reason === "summit_reached" ? "summit_reached" : "wrong_answer");
        setGameFinished(true);
      } else {
        setGameFinished(false);
      }

      // Browser-side persistence (LokiJS) — fire and forget, completely non-blocking
      const pName = player?.name;
      if (pName) {
        import("@/lib/browser-db").then(async ({ updatePlayer, addSeenQuestion, addToReviewDeck, upsertTopicMastery, addGameHistory }) => {
          try {
            const isCorrect = data.reveal?.correct === true;
            const xpGain = isCorrect ? 10 : 1;
            await updatePlayer(pName, { xp: (player?.xp ?? 0) + xpGain });
            if (data.reveal?.questionId) await addSeenQuestion(pName, data.reveal.questionId);
            if (data.reveal?.topicId != null) await upsertTopicMastery(pName, data.reveal.topicId, isCorrect);
            if (!isCorrect && data.reveal?.questionId) await addToReviewDeck(pName, data.reveal.questionId);
            if (data.game?.status === "finished") {
              await addGameHistory({
                playerName: pName,
                mode: "GIPFEL",
                level: data.game.reason === "summit_reached" ? 15 : level,
                winnings: data.game.winnings ?? 0,
                correct: 0,
                total: level,
                date: new Date().toISOString(),
              });
            }
          } catch (e) {
            console.warn("[loki] update error:", e);
          }
        }).catch(() => {});
      }
    } catch (err) {
      console.error("[confirmAnswer] error:", err);
      pushToast("Verbindungsfehler.", "error");
      setPhase("asking");
    }
  }

  function nextQuestion(next: QuestionPayload | null) {
    if (!next) {
      setPhase("ended");
      return;
    }
    setQuestion(next);
    setLevel(next.level);
    setSelected(null);
    setEliminated([]);
    setReveal(null);
    setAudiencePoll(null);
    setPhoneSuggests(null);
    setPhase("asking");
  }

  async function applyJoker(type: keyof JokerState) {
    if (!jokers[type] || phase !== "asking") return;
    try {
      const res = await fetch(`/api/games/${gameId}/joker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) {
        pushToast(data.message ?? "Joker fehlgeschlagen.", "error");
        return;
      }
      setJokers(data.jokers);
      if (type === "FIFTY_FIFTY") {
        setEliminated(data.eliminated as number[]);
        pushToast("50:50 — zwei falsche Antworten entfernt.", "info");
      } else if (type === "AUDIENCE") {
        setAudiencePoll(data.poll as number[]);
        setJokerModal("audience");
      } else if (type === "PHONE") {
        setPhoneSuggests(data);
        setJokerModal("phone");
      } else if (type === "SWITCH") {
        setQuestion(data.newQuestion);
        setSelected(null);
        setEliminated([]);
        pushToast("Frage getauscht — frische Frage geladen.", "info");
      }
    } catch {
      pushToast("Verbindungsfehler.", "error");
    }
  }

  async function walkAway() {
    setWalkAwayDialog(false);
    try {
      const res = await fetch(`/api/games/${gameId}/walk-away`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        pushToast(data.message ?? "Aussteigen fehlgeschlagen.", "error");
        return;
      }
      setWinnings(data.winnings);
      setEndedReason("walked_away");
      setPhase("ended");
    } catch {
      pushToast("Verbindungsfehler.", "error");
    }
  }

  // ----- Renderings -------------------------------------------------------

  if (phase === "loading") {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <Lumi pose="thinking" size={96} />
          <p className="font-display text-lg text-ink">Lumi sucht die besten Fragen für dich …</p>
        </div>
      </div>
    );
  }

  if (phase === "ended") {
    return <ResultScreen reason={endedReason} winnings={winnings} level={level} onHome={() => navigate("home")} onAgain={() => navigate("game-setup")} />;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-4 sm:px-6">
      {/* Top bar */}
      <header className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (confirm("Spiel wirklich verlassen? Dein Fortschritt geht verloren.")) {
              navigate("home");
            }
          }}
          className="tap-target inline-flex items-center gap-1 rounded-full bg-bg2/40 px-3 py-1.5 text-sm text-ink-dim hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Verlassen
        </button>
        <div className="flex items-center gap-2 rounded-full bg-bg2/40 px-4 py-1.5">
          <span className="text-sm text-ink-dim">Stufe {level} / 15</span>
          <span className="text-ink-dim/50">·</span>
          <span className="font-display text-sm font-bold text-ink">{formatTaler(ladder.find((s) => s.level === level)?.amount ?? 0)} Taler</span>
        </div>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        {/* Left: question + answers + jokers */}
        <div className="flex flex-col gap-4">
          {question && (
            <div ref={questionRef}>
            <QuestionCard
              subject={question.subject}
              level={level}
              difficulty={question.difficulty}
              text={question.text}
            >
              {/* Answer plates */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {question.options.map((opt, idx) => {
                  const letter = LETTERS[idx];
                  const shape = SHAPES[idx];
                  const isEliminated = eliminated.includes(idx);
                  // reveal.correctIndex is CANONICAL; we need the SHUFFLED position of the correct answer.
                  const correctShuffledIdx = reveal ? reveal.optionOrder.indexOf(reveal.correctIndex) : -1;
                  const isCorrect = reveal && correctShuffledIdx === idx;
                  const isSelected = selected === idx;
                  const isWrong = reveal && isSelected && correctShuffledIdx !== idx;
                  const state = isEliminated
                    ? "eliminated"
                    : isCorrect
                    ? "correct"
                    : isWrong
                    ? "wrong"
                    : isSelected
                    ? (phase === "revealing" ? "locked" : "selected")
                    : "idle";
                  return (
                    <AnswerPlate
                      key={idx}
                      letter={letter}
                      shape={shape}
                      text={opt}
                      state={state}
                      index={idx}
                      disabled={phase === "revealing" || isEliminated}
                      onClick={() => {
                        if (phase === "asking") setSelected(idx);
                      }}
                    />
                  );
                })}
              </div>

              {/* Action bar */}
              {phase === "asking" && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button
                    size="lg"
                    className="h-12 flex-1 font-display font-bold"
                    disabled={selected == null}
                    onClick={() => setFinalSheet(true)}
                  >
                    Final? <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  {level >= 2 && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-12"
                      onClick={() => setWalkAwayDialog(true)}
                    >
                      <DoorOpen className="mr-2 h-4 w-4" /> Aussteigen
                    </Button>
                  )}
                </div>
              )}

              {phase === "revealing" && reveal && (
                <RevealCard reveal={reveal} onNext={() => {
                  if (gameFinished) {
                    setPhase("ended");
                  } else {
                    // fetch next question
                    void (async () => {
                      const res = await fetch(`/api/games/${gameId}`, { cache: "no-store" });
                      const data = await res.json();
                      if (data.status === "finished") {
                        setWinnings(data.winnings);
                        setEndedReason(data.winnings > 0 ? "walked_away" : "wrong_answer");
                        setPhase("ended");
                      } else {
                        nextQuestion(data.question);
                      }
                    })();
                  }
                }} gameFinished={gameFinished} revealCorrect={reveal.correct} />
              )}
            </QuestionCard>
            </div>
          )}

          {/* Jokers bar */}
          <div className="grid grid-cols-4 gap-2 rounded-2xl border border-border bg-bg1/60 p-3">
            {([
              { key: "FIFTY_FIFTY", label: "50:50", icon: <Split className="h-5 w-5" /> },
              { key: "AUDIENCE", label: "Umfrage", icon: <BarChart3 className="h-5 w-5" /> },
              { key: "PHONE", label: "Lumi", icon: <PhoneCall className="h-5 w-5" /> },
              { key: "SWITCH", label: "Tauschen", icon: <Shuffle className="h-5 w-5" /> },
            ] as const).map((j) => {
              const available = jokers[j.key];
              return (
                <button
                  key={j.key}
                  type="button"
                  onClick={() => applyJoker(j.key)}
                  disabled={!available || phase !== "asking"}
                  className={cn(
                    "tap-target flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-xs transition-all",
                    available
                      ? "border-border bg-bg2/40 text-ink hover:border-ink-dim/50 hover:bg-bg2/60"
                      : "border-border/40 bg-bg2/20 text-ink-dim/50 opacity-50"
                  )}
                  aria-label={j.label}
                  aria-disabled={!available}
                >
                  <span className={available ? "text-ink-dim" : "text-ink-dim/50"}>{j.icon}</span>
                  <span className="font-display font-semibold">{j.label}</span>
                  {!available && <span className="text-[10px] text-ink-dim">verbraucht</span>}
                </button>
              );
            })}
          </div>

          {/* Encouragement */}
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-bg1/40 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-bg2/40 text-ink-dim">
              <Lumi pose={phase === "revealing" ? "thinking" : "idle"} size={40} />
            </div>
            <p className="text-sm text-ink-dim">
              {phase === "asking" && "Lies die Frage in Ruhe. Du schaffst das."}
              {phase === "revealing" && reveal?.correct && "Richtig. Weiter zur nächsten Stufe."}
              {phase === "revealing" && !reveal?.correct && "Knapp daneben. Schau dir die Erklärung an."}
            </p>
          </div>
        </div>

        {/* Right: ladder rail (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-4 rounded-2xl border border-border bg-bg1/60 p-4">
            <h2 className="mb-3 font-display text-sm font-semibold text-ink">Taler-Leiter</h2>
            <LadderRail ladder={ladder} currentLevel={level} variant="mountain" reducedMotion={prefs.reducedMotion} />
          </div>
        </aside>

        {/* Mobile ladder: pull-up sheet button */}
        <div className="lg:hidden">
          <Button variant="outline" className="w-full" onClick={() => setJokerModal("audience")}>
            Leiter anzeigen
          </Button>
        </div>
      </main>

      {/* Final-answer confirm sheet */}
      <Sheet open={finalSheet} onOpenChange={setFinalSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl border-t border-border bg-bg1 p-6 backdrop-blur-xl">
          <SheetHeader>
            <SheetTitle className="text-center font-display text-xl tracking-tight text-ink">
              Ist das deine finale Antwort?
            </SheetTitle>
            <SheetDescription className="text-center text-ink-dim">
              {selected != null && question && (
                <span className="mt-2 inline-flex items-center gap-2 rounded-lg border border-border bg-bg2/40 px-4 py-2">
                  <span className="font-mono text-sm text-ink-dim">{LETTERS[selected]}</span>
                  <span className="text-ink-dim/40">·</span>
                  <span className="font-display font-semibold text-ink">{question.options[selected]}</span>
                </span>
              )}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="h-12 flex-1" onClick={() => setFinalSheet(false)}>
              Nochmal überlegen
            </Button>
            <Button className="h-12 flex-1 font-display font-bold" onClick={confirmAnswer}>
              Ja, final!
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Walk-away confirm dialog */}
      <Dialog open={walkAwayDialog} onOpenChange={setWalkAwayDialog}>
        <DialogContent className="bg-bg1 border-border backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-center font-display text-xl tracking-tight text-ink">Aussteigen?</DialogTitle>
            <DialogDescription className="text-center text-ink-dim">
              Du behältst deine bisherigen{" "}
              <span className="inline-block rounded border border-border bg-bg2/40 px-2 py-0.5 font-display font-semibold text-ink tabular-nums">
                {formatTaler(ladder.find((s) => s.level === level - 1)?.amount ?? 0)} Taler
              </span>
              . Bist du sicher?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setWalkAwayDialog(false)}>
              Weiter spielen
            </Button>
            <Button className="flex-1" onClick={walkAway}>
              Ja, aussteigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audience joker modal */}
      <Dialog open={jokerModal === "audience"} onOpenChange={(o) => !o && setJokerModal(null)}>
        <DialogContent className="bg-bg1 border-border backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl tracking-tight text-ink">Klassen-Umfrage</DialogTitle>
            <DialogDescription className="text-ink-dim">
              Umfrage unter Mitspieler:innen — kein echtes Ergebnis, nur ein Tipp.
            </DialogDescription>
          </DialogHeader>
          {audiencePoll && question && (
            <div className="mt-4 space-y-3">
              {audiencePoll.map((pct, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-bg2/40 font-mono text-sm font-bold text-ink">
                    {LETTERS[idx]}
                  </div>
                  <div className="flex-1">
                    <div className="h-7 overflow-hidden rounded-md border border-border bg-bg2/20">
                      <div
                        className="h-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: "linear-gradient(90deg, rgba(106,122,154,0.6), rgba(160,170,200,0.8))",
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-12 text-right font-display text-sm font-bold text-ink tabular-nums">{pct}%</div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button className="w-full" onClick={() => setJokerModal(null)}>Verstanden</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phone joker modal */}
      <Dialog open={jokerModal === "phone"} onOpenChange={(o) => !o && setJokerModal(null)}>
        <DialogContent className="bg-bg1 border-border backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl tracking-tight text-ink">Lumi fragen</DialogTitle>
            <DialogDescription className="text-ink-dim">
              Lumi überlegt sich eine Antwort — sie kann sich auch irren!
            </DialogDescription>
          </DialogHeader>
          {phoneSuggests && question && (
            <div className="mt-2 flex items-start gap-3 rounded-xl border border-border bg-bg2/30 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-bg2/40">
                <Lumi pose="thinking" size={48} />
              </div>
              <div>
                <p className="text-sm text-ink leading-relaxed">{phoneSuggests.phrase}</p>
                <p className="mt-2 text-xs text-ink-dim">
                  Lumi tippt auf:{" "}
                  <span className="inline-block rounded border border-border bg-bg2/40 px-2 py-0.5 font-display font-semibold text-ink">
                    {LETTERS[phoneSuggests.suggests]} — {question.options[phoneSuggests.suggests]}
                  </span>
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button className="w-full" onClick={() => setJokerModal(null)}>Danke, Lumi!</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface RevealCardProps {
  reveal: RevealData;
  onNext: () => void;
  gameFinished: boolean;
  revealCorrect: boolean;
}

function RevealCard({ reveal, onNext, gameFinished, revealCorrect }: RevealCardProps) {
  // Label logic:
  //  - If wrong → "Zum Ergebnis" (game is over, fall to safe level)
  //  - If correct AND game finished (summit reached) → "Zum Ergebnis"
  //  - If correct AND game continues → "Weiter"
  const label = !revealCorrect || gameFinished ? "Zum Ergebnis" : "Weiter";
  return (
    <div
      className="mt-4 rounded-2xl border p-4 backdrop-blur-xl"
      style={{
        background: reveal.correct
          ? "linear-gradient(135deg, rgba(61,219,164,0.08), rgba(61,219,164,0.02))"
          : "linear-gradient(135deg, rgba(255,107,122,0.08), rgba(255,107,122,0.02))",
        borderColor: reveal.correct ? "rgba(61,219,164,0.4)" : "rgba(255,107,122,0.4)",
        boxShadow: reveal.correct
          ? "0 0 20px rgba(61,219,164,0.15), 0 8px 24px rgba(0,0,0,0.3)"
          : "0 0 20px rgba(255,107,122,0.15), 0 8px 24px rgba(0,0,0,0.3)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg border"
          style={{
            borderColor: reveal.correct ? "rgba(61,219,164,0.4)" : "rgba(255,107,122,0.4)",
            background: reveal.correct ? "rgba(61,219,164,0.1)" : "rgba(255,107,122,0.1)",
          }}
        >
          {reveal.correct ? (
            <CheckCircle2 className="h-5 w-5 text-mint" />
          ) : (
            <XCircle className="h-5 w-5 text-coral" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg font-bold tracking-tight text-ink">
            {reveal.correct ? "Richtig" : "Knapp daneben"}
          </div>
          <div className="text-xs text-ink-dim">
            Thema: <span className="text-ink-dim/80">{reveal.topic.label}</span>
          </div>
        </div>
      </div>
      <p className="mt-3 border-t border-border/50 pt-3 text-sm text-ink leading-relaxed">
        {reveal.explanation}
      </p>
      <div className="mt-4 flex justify-end">
        <Button onClick={onNext} size="lg" className="h-12 font-display font-bold">
          {label}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface ResultScreenProps {
  reason: "wrong_answer" | "walked_away" | "summit_reached";
  winnings: number;
  level: number;
  onHome: () => void;
  onAgain: () => void;
}

function ResultScreen({ reason, winnings, level, onHome, onAgain }: ResultScreenProps) {
  const title = reason === "summit_reached"
    ? "Gipfel erreicht"
    : reason === "walked_away"
    ? "Klug ausgestiegen"
    : "Knapp daneben";
  const subtitle = reason === "summit_reached"
    ? `Du hast die 15. Stufe erklommen und ${formatTaler(500000)} Taler Spielgeld gewonnen.`
    : reason === "walked_away"
    ? `Du gehst mit ${formatTaler(winnings)} Talern nach Hause.`
    : `Du landest auf der Sicherheitsstufe mit ${formatTaler(winnings)} Talern.`;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-8 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-bg1/60">
        <Trophy className="h-8 w-8 text-ink-dim" />
      </div>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
      <p className="mt-3 text-ink-dim leading-relaxed">{subtitle}</p>

      <div className="my-8 w-full rounded-2xl border border-border bg-bg1/60 p-6 backdrop-blur">
        <div className="text-xs uppercase tracking-wider text-ink-dim">Deine Gewinn</div>
        <div className="mt-2 font-display text-4xl font-extrabold text-ink">
          {formatTaler(winnings)}
        </div>
        <div className="text-sm text-ink-dim">Taler Spielgeld</div>
        <div className="mt-3 border-t border-border pt-3 text-xs text-ink-dim">Erreichte Stufe: {level} / 15</div>
      </div>

      <div className="flex w-full flex-col gap-3">
        <Button size="lg" className="h-14 font-display font-bold" onClick={onAgain}>
          Nochmal spielen
        </Button>
        <Button size="lg" variant="outline" className="h-14" onClick={onHome}>
          Zum Hauptmenü
        </Button>
      </div>
    </div>
  );
}
