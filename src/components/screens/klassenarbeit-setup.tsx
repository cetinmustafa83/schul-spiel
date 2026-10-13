"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { GooeyButton } from "@/components/ui/gooey";
import { ArrowLeft, FileText, ChevronRight, Check } from "lucide-react";
import { useScreenTransition } from "@/lib/animations/gsap-hooks";
import { cn } from "@/lib/utils";

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

const EXAM_LENGTHS = [20, 30, 45] as const;

export function KlassenarbeitSetupScreen() {
  const { navigate, setPayload, player, pushToast } = useApp();
  const ref = useScreenTransition<HTMLDivElement>();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [length, setLength] = useState<number>(20);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/meta/subjects", { cache: "no-store" });
        const data = await res.json();
        setSubjects(data.items ?? []);
      } catch {
        pushToast("Fächer konnten nicht geladen werden.", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [pushToast]);

  function toggleSubject(code: string) {
    setSelectedSubject((prev) => {
      const next = code === prev ? null : code;
      // Reset topic selection when subject changes
      setSelectedTopics(new Set());
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

  const activeSubject = subjects.find((s) => s.code === selectedSubject);

  async function startExam() {
    if (!selectedSubject) {
      pushToast("Bitte wähle ein Fach.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/klassenarbeit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: player?.name,
          schoolType: player?.schoolType,
          grade: player?.grade,
          subjectCode: selectedSubject,
          topicFilter: selectedTopics.size > 0 ? Array.from(selectedTopics) : undefined,
          length,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        pushToast(data.message ?? "Klassenarbeit konnte nicht gestartet werden.", "error");
        setSubmitting(false);
        return;
      }
      setPayload({
        sessionId: data.sessionId,
        questions: data.questions,
        length: data.length,
        subjectCode: data.subjectCode,
      });
      navigate("klassenarbeit-run");
    } catch {
      pushToast("Etwas ist schiefgelaufen.", "error");
      setSubmitting(false);
    }
  }

  return (
    <div ref={ref} className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("home")}
          className="tap-target inline-flex items-center gap-1.5 rounded-full border border-border bg-bg1/40 px-3 py-1.5 text-sm text-ink-dim backdrop-blur hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Zurück
        </button>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-ink-dim">
          <FileText className="h-3.5 w-3.5" />
          Klassenarbeit
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6">
        {/* Title */}
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            Klassenarbeit simulieren
          </h1>
          <p className="mt-2 text-sm text-ink-dim leading-relaxed">
            Wähle ein Fach und beantworte alle Fragen ohne sofortiges Feedback.
            Am Ende erhältst du deine Note und kannst jede Frage überprüfen.
          </p>
        </div>

        {/* Subject selection */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-ink-dim">
              Fach wählen
            </h2>
          </div>
          {loading ? (
            <div className="h-32 animate-pulse rounded-2xl bg-bg2/30" />
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {subjects.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSubject(s.code)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-4 backdrop-blur transition-all",
                    selectedSubject === s.code
                      ? "border-ink-dim/40 bg-bg1/70"
                      : "border-border bg-bg1/40 hover:border-ink-dim/20 hover:bg-bg1/60"
                  )}
                  style={selectedSubject === s.code ? { boxShadow: "0 0 16px rgba(106,122,154,0.15), inset 0 0 12px rgba(106,122,154,0.08)" } : undefined}
                >
                  <span className="text-2xl" aria-hidden>{s.icon ?? "📚"}</span>
                  <span className="font-display text-sm font-semibold text-ink text-center">{s.label}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Topic selection (optional) */}
        {activeSubject && activeSubject.topics.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-ink-dim">
                Themen
              </h2>
              <span className="text-xs text-ink-dim">(optional — leer = alle)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeSubject.topics.map((t) => {
                const active = selectedTopics.has(t.code);
                return (
                  <button
                    key={t.code}
                    type="button"
                    onClick={() => toggleTopic(t.code)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition-all",
                      active
                        ? "border-ink-dim/40 bg-bg1/70 text-ink"
                        : "border-border bg-bg1/40 text-ink-dim hover:border-ink-dim/20 hover:text-ink"
                    )}
                  >
                    {active && <Check className="h-3 w-3" />}
                    {t.label}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Exam length */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-ink-dim">
              Anzahl Fragen
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {EXAM_LENGTHS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setLength(n)}
                className={cn(
                  "rounded-xl border p-4 text-center backdrop-blur transition-all",
                  length === n
                    ? "border-ink-dim/40 bg-bg1/70"
                    : "border-border bg-bg1/40 hover:border-ink-dim/20 hover:bg-bg1/60"
                )}
                style={length === n ? { boxShadow: "0 0 16px rgba(106,122,154,0.15)" } : undefined}
              >
                <div className="font-display text-xl font-bold text-ink">{n}</div>
                <div className="text-xs text-ink-dim">Fragen</div>
              </button>
            ))}
          </div>
        </section>

        {/* Info banner */}
        <div
          className="flex items-start gap-3 rounded-xl border border-border bg-bg1/40 p-4 backdrop-blur"
          style={{ borderLeft: "3px solid rgba(106,122,154,0.4)" }}
        >
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-ink-dim/70" />
          <div>
            <div className="text-sm font-medium text-ink">So funktioniert die Klassenarbeit</div>
            <p className="mt-1 text-xs leading-relaxed text-ink-dim">
              Du erhältst alle Fragen auf einmal und kannst frei zwischen ihnen navigieren.
              Es gibt kein sofortiges Feedback — erst am Ende siehst du, was richtig und falsch war.
              Die Fragen gehen von leicht nach schwer.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="sticky bottom-0 z-20 mt-6 -mx-4 border-t border-border/40 bg-bg0/80 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <div className="hidden flex-1 sm:block">
            <div className="text-[10px] uppercase tracking-wider text-ink-dim">Prüfung</div>
            <div className="font-display text-sm font-semibold text-ink">
              {length} Fragen · {selectedSubject ? subjects.find((s) => s.code === selectedSubject)?.label : "Fach wählen"}
              {selectedTopics.size > 0 && ` · ${selectedTopics.size} Themen`}
            </div>
          </div>
          <GooeyButton
            size="lg"
            className="h-14 flex-1 sm:flex-none sm:px-12"
            blobColor="rgba(106, 122, 154, 0.35)"
            onClick={startExam}
            disabled={submitting || !selectedSubject}
          >
            {submitting ? "Wird vorbereitet …" : (
              <span className="flex items-center gap-2">
                Klassenarbeit starten
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </GooeyButton>
        </div>
      </footer>
    </div>
  );
}
