"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

interface Topic {
  id: number;
  code: string;
  label: string;
}
interface Subject {
  id: number;
  code: string;
  label: string;
  icon: string | null;
  color: string | null;
  topics: Topic[];
}

const LENGTHS = [5, 10, 15, 20] as const;

export function TrainingSetupScreen() {
  const { navigate, setPayload, pushToast } = useApp();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [length, setLength] = useState<number>(10);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/meta/subjects", { cache: "no-store" });
        if (!res.ok) throw new Error("Fächer konnten nicht geladen werden.");
        const data = await res.json();
        setSubjects((data.items ?? []) as Subject[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Etwas ist schiefgelaufen.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function toggleSubject(code: string) {
    setSelectedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
        // Also drop topics of this subject
        const subj = subjects.find((s) => s.code === code);
        if (subj) {
          setSelectedTopics((tp) => {
            const t2 = new Set(tp);
            for (const t of subj.topics) t2.delete(t.code);
            return t2;
          });
        }
      } else {
        next.add(code);
      }
      return next;
    });
  }

  function toggleTopic(code: string) {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  const filteredSubjects = subjects.filter((s) => selectedSubjects.has(s.code));

  async function start() {
    if (selectedSubjects.size === 0) {
      pushToast("Bitte wähle mindestens ein Fach aus.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectFilter: Array.from(selectedSubjects),
          topicFilter: selectedTopics.size > 0 ? Array.from(selectedTopics) : undefined,
          length,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        pushToast(data.message ?? "Training konnte nicht gestartet werden.", "error");
        setSubmitting(false);
        return;
      }
      setPayload({
        sessionId: data.sessionId,
        length: data.length,
        currentIndex: 0,
        correctCount: 0,
        currentQuestion: data.question,
        filters: {
          subjectFilter: Array.from(selectedSubjects),
          topicFilter: selectedTopics.size > 0 ? Array.from(selectedTopics) : undefined,
          length,
        },
      });
      navigate("training-run");
    } catch {
      pushToast("Netzwerkfehler. Bitte versuche es nochmal.", "error");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("home")}
          className="tap-target inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-ink-dim hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Zurück
        </button>
        <span className="font-display text-sm font-semibold text-gold">Training</span>
      </header>

      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">Trainingsmodus</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Wähle ein oder mehrere Fächer, übe ohne Druck und sammle XP. Falsche Fragen
          kommen automatisch in deinen Wiederholungsstapel.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-coral">
          {error}
        </div>
      )}

      {/* Subject chips */}
      <section className="mb-6">
        <h2 className="mb-2 font-display text-base font-semibold text-ink">Fächer</h2>
        {loading ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-28 rounded-full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => {
              const active = selectedSubjects.has(s.code);
              return (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => toggleSubject(s.code)}
                  aria-pressed={active}
                  className={`tap-target inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm transition-all ${
                    active
                      ? "border-gold bg-gold/15 text-ink"
                      : "border-border bg-bg1/60 text-ink-dim hover:border-gold/40 hover:text-ink"
                  }`}
                >
                  <span aria-hidden>{s.icon ?? "📚"}</span>
                  {s.label}
                  {active && <Check className="h-3.5 w-3.5 text-gold" />}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Topics for selected subjects */}
      {filteredSubjects.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 font-display text-base font-semibold text-ink">
            Themen <span className="text-xs font-normal text-ink-dim">(optional)</span>
          </h2>
          <div className="flex flex-col gap-3">
            {filteredSubjects.map((s) => (
              <div
                key={s.code}
                className="rounded-2xl border border-border bg-bg1/60 p-3"
              >
                <div className="mb-2 flex items-center gap-2 text-xs text-ink-dim">
                  <span aria-hidden>{s.icon ?? "📚"}</span>
                  {s.label}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {s.topics.map((t) => {
                    const active = selectedTopics.has(t.code);
                    return (
                      <button
                        key={t.code}
                        type="button"
                        onClick={() => toggleTopic(t.code)}
                        aria-pressed={active}
                        className={`rounded-full border px-2.5 py-1 text-xs transition-all ${
                          active
                            ? "border-mint bg-mint/15 text-ink"
                            : "border-border bg-bg2/40 text-ink-dim hover:border-mint/50"
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Length */}
      <section className="mb-6">
        <h2 className="mb-2 font-display text-base font-semibold text-ink">Anzahl Fragen</h2>
        <div className="grid grid-cols-4 gap-2">
          {LENGTHS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setLength(n)}
              aria-pressed={length === n}
              className={`tap-target rounded-2xl border-2 py-3 text-center font-display text-lg font-bold transition-all ${
                length === n
                  ? "border-gold bg-gold/15 text-ink"
                  : "border-border bg-bg1/60 text-ink-dim hover:border-gold/40"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      <div className="mt-auto pt-4">
        <Button
          size="lg"
          className="h-14 w-full font-display text-base font-bold"
          onClick={start}
          disabled={submitting || selectedSubjects.size === 0}
        >
          {submitting ? "Startet …" : "Los!"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        {selectedSubjects.size === 0 && (
          <p className="mt-2 text-center text-xs text-ink-dim">
            Bitte wähle zuerst mindestens ein Fach aus.
          </p>
        )}
      </div>
    </div>
  );
}
