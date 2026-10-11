"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Shuffle } from "lucide-react";
import { suggestSpielername, checkSpielername, SCHOOL_TYPE_LABELS } from "@/lib/german";

interface SchoolType { code: string; label: string; }
interface Grade { grade: number; label: string; }
interface Avatar { id: number; code: string; label: string; emoji: string; }

export function RegisterScreen() {
  const { navigate, setPayload, pushToast } = useApp();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [schoolTypes, setSchoolTypes] = useState<SchoolType[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [schoolType, setSchoolType] = useState("");
  const [grade, setGrade] = useState<number | null>(null);
  const [avatarId, setAvatarId] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load meta on first step entry.
  async function loadMeta() {
    const [st, g, a] = await Promise.all([
      fetch("/api/meta/school-types").then((r) => r.json()),
      fetch("/api/meta/grades").then((r) => r.json()),
      fetch("/api/meta/avatars").then((r) => r.json()),
    ]);
    setSchoolTypes(st.items ?? []);
    setGrades(g.items ?? []);
    setAvatars(a.items ?? []);
  }

  function next() {
    setError(null);
    if (step === 0) {
      const check = checkSpielername(displayName);
      if (!check.ok) {
        setError(check.reason ?? "Bitte überprüfe deinen Namen.");
        return;
      }
      void loadMeta();
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
      setStep(3);
    } else if (step === 3) {
      if (pin.length !== 4) {
        setError("Deine PIN muss 4 Ziffern haben.");
        return;
      }
      if (pin !== pin2) {
        setError("Die beiden PINs stimmen nicht überein.");
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          schoolType,
          grade,
          pin,
          avatarId: avatarId ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Registrierung fehlgeschlagen.");
        setSubmitting(false);
        return;
      }
      setPayload({
        handle: data.handle,
        displayName: data.displayName,
        tag: data.tag,
        rescueCode: data.rescueCode,
        avatarId: data.avatarId,
      });
      navigate("account-created");
    } catch (e) {
      setError("Etwas ist schiefgelaufen. Bitte versuche es nochmal.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          className="tap-target inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-ink-dim hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Zurück
        </button>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? "w-6 bg-gold" : i < step ? "w-2 bg-mint" : "w-2 bg-bg2"
              }`}
            />
          ))}
        </div>
      </header>

      <main className="flex flex-1 flex-col justify-center py-6">
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">Wie soll ich dich nennen?</h1>
              <p className="mt-1 text-sm text-ink-dim">
                Nimm <strong>nicht</strong> deinen echten Namen! Ein Fantasienname ist sicherer.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Spielername</Label>
              <div className="flex gap-2">
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="z. B. Mutiger Fuchs"
                  maxLength={20}
                  className="h-12 text-base"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 px-3"
                  onClick={() => setDisplayName(suggestSpielername())}
                  title="Namen vorschlagen"
                >
                  <Shuffle className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-ink-dim">3–20 Zeichen, nur Buchstaben.</p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">Welche Schulform besuchst du?</h1>
              <p className="mt-1 text-sm text-ink-dim">
                Wir wählen nur Fragen aus, die zu deiner Schule passen.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {schoolTypes.map((st) => (
                <button
                  key={st.code}
                  type="button"
                  onClick={() => setSchoolType(st.code)}
                  className={`tap-target flex items-center justify-between rounded-2xl border-2 px-4 py-3 text-left transition-all ${
                    schoolType === st.code
                      ? "border-gold bg-gold/10"
                      : "border-border bg-bg1/60 hover:border-gold/40"
                  }`}
                >
                  <span className="font-display text-base font-semibold text-ink">{st.label}</span>
                  {schoolType === st.code && <span className="text-gold">✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">In welcher Klasse bist du?</h1>
              <p className="mt-1 text-sm text-ink-dim">
                Wissensgipfel funktioniert für die Klassen 5–8.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {grades.map((g) => (
                <button
                  key={g.grade}
                  type="button"
                  onClick={() => setGrade(g.grade)}
                  className={`tap-target rounded-2xl border-2 px-4 py-6 text-center transition-all ${
                    grade === g.grade
                      ? "border-gold bg-gold/10"
                      : "border-border bg-bg1/60 hover:border-gold/40"
                  }`}
                >
                  <div className="font-display text-2xl font-bold text-ink">{g.grade}</div>
                  <div className="text-xs text-ink-dim">Klasse</div>
                </button>
              ))}
            </div>
            <div>
              <Label className="mb-2 block">Avatar (optional)</Label>
              <div className="nice-scroll grid max-h-32 grid-cols-6 gap-2 overflow-y-auto sm:grid-cols-8">
                {avatars.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAvatarId(a.id)}
                    className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-2xl transition-all ${
                      avatarId === a.id ? "border-gold bg-gold/10" : "border-border bg-bg1/60 hover:border-gold/40"
                    }`}
                    aria-label={a.label}
                    title={a.label}
                  >
                    {a.emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">Wähle deine PIN</h1>
              <p className="mt-1 text-sm text-ink-dim">
                4 Ziffern, die du dir gut merken kannst. <strong>Bitte nicht 1234 oder 0000!</strong>
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="pin1">PIN (4 Ziffern)</Label>
                <Input
                  id="pin1"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  className="h-12 text-center text-2xl font-display tracking-widest"
                  placeholder="••••"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pin2">PIN wiederholen</Label>
                <Input
                  id="pin2"
                  value={pin2}
                  onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  className="h-12 text-center text-2xl font-display tracking-widest"
                  placeholder="••••"
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-coral">
            {error}
          </div>
        )}
      </main>

      <footer className="pt-4">
        <Button
          size="lg"
          className="h-14 w-full font-display text-base font-bold"
          onClick={next}
          disabled={submitting}
        >
          {step === 3 ? (submitting ? "Wird erstellt …" : "Konto erstellen") : "Weiter"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </footer>
    </div>
  );
}
