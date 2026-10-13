"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { GooeyButton } from "@/components/ui/gooey";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Shuffle } from "lucide-react";
import { suggestSpielername, checkSpielername, SCHOOL_TYPE_LABELS } from "@/lib/german";
import { getOrCreatePlayer } from "@/lib/browser-db";
import { useScreenTransition } from "@/lib/animations/gsap-hooks";

export function OnboardingScreen() {
  const { navigate, setPlayer, pushToast } = useApp();
  const ref = useScreenTransition<HTMLDivElement>();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [schoolType, setSchoolType] = useState("");
  const [grade, setGrade] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function next() {
    setError(null);
    if (step === 0) {
      const check = checkSpielername(name);
      if (!check.ok) {
        setError(check.reason ?? "Bitte überprüfe deinen Namen.");
        return;
      }
      setStep(1);
    } else if (step === 1) {
      if (!schoolType) {
        setError("Bitte wähle deine Schulform.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (grade == null) {
        setError("Bitte wähle deine Klasse.");
        return;
      }
      void submit();
    }
  }

  function back() {
    setError(null);
    if (step === 0) {
      navigate("landing");
    } else {
      setStep(step - 1);
    }
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const player = await getOrCreatePlayer(name, schoolType, grade ?? 5, null);
      // Remember last active player
      localStorage.setItem("wissensgipfel-last-player", player.name);
      setPlayer({
        name: player.name,
        schoolType: player.schoolType,
        grade: player.grade,
        avatarId: player.avatarId,
        xp: player.xp,
      });
      pushToast(`Willkommen, ${player.name}!`, "success");
      navigate("home");
    } catch {
      setError("Etwas ist schiefgelaufen. Bitte versuche es nochmal.");
      setSubmitting(false);
    }
  }

  return (
    <div ref={ref} className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          className="tap-target inline-flex items-center gap-1.5 rounded-full border border-border bg-bg1/40 px-3 py-1.5 text-sm text-ink-dim backdrop-blur hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Zurück
        </button>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-ink" : i < step ? "w-1.5 bg-ink-dim/60" : "w-1.5 bg-bg2"
              }`}
            />
          ))}
        </div>
      </header>

      <main className="flex flex-1 flex-col justify-center gap-6">
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Wie heißt du?</h1>
              <p className="mt-1 text-sm text-ink-dim">
                Nimm <strong>nicht</strong> deinen echten Namen — ein Fantasienname reicht.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <div className="flex gap-2">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z. B. Mutiger Fuchs"
                  maxLength={20}
                  className="h-12 text-base"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") next(); }}
                />
                <GooeyButton
                  size="md"
                  variant="soft"
                  className="h-12 px-3"
                  blobColor="rgba(139, 108, 255, 0.2)"
                  onClick={() => setName(suggestSpielername())}
                >
                  <Shuffle className="h-4 w-4" />
                </GooeyButton>
              </div>
              <p className="text-xs text-ink-dim/60">3–20 Zeichen, nur Buchstaben.</p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Welche Schulform?</h1>
              <p className="mt-1 text-sm text-ink-dim">
                Wir wählen nur Fragen aus, die zu deiner Schule passen.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {Object.entries(SCHOOL_TYPE_LABELS).map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSchoolType(code)}
                  className={`flex items-center justify-between rounded-xl border p-4 text-left backdrop-blur transition-all ${
                    schoolType === code
                      ? "border-ink-dim/40 bg-bg1/70"
                      : "border-border bg-bg1/40 hover:border-ink-dim/20 hover:bg-bg1/60"
                  }`}
                  style={schoolType === code ? { boxShadow: "0 0 16px rgba(106,122,154,0.15), inset 0 0 12px rgba(106,122,154,0.08)" } : undefined}
                >
                  <span className="font-display text-base font-semibold text-ink">{label}</span>
                  {schoolType === code && <span className="text-ink-dim">✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Welche Klasse?</h1>
              <p className="mt-1 text-sm text-ink-dim">Klassen 5–8.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[5, 6, 7, 8].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={`rounded-xl border p-6 text-center backdrop-blur transition-all ${
                    grade === g
                      ? "border-ink-dim/40 bg-bg1/70"
                      : "border-border bg-bg1/40 hover:border-ink-dim/20 hover:bg-bg1/60"
                  }`}
                  style={grade === g ? { boxShadow: "0 0 16px rgba(106,122,154,0.15), inset 0 0 12px rgba(106,122,154,0.08)" } : undefined}
                >
                  <div className="font-display text-3xl font-bold text-ink">{g}</div>
                  <div className="text-xs text-ink-dim">Klasse</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-coral">
            {error}
          </div>
        )}
      </main>

      <footer className="pt-4">
        <GooeyButton
          size="lg"
          className="h-14 w-full"
          blobColor="rgba(106, 122, 154, 0.35)"
          onClick={next}
          disabled={submitting}
        >
          {step === 2 ? (submitting ? "Wird erstellt …" : "Los geht's") : "Weiter"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </GooeyButton>
      </footer>
    </div>
  );
}
