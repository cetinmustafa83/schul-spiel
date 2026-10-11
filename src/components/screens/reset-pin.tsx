"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

export function ResetPinScreen() {
  const { navigate, pushToast } = useApp();
  const [displayName, setDisplayName] = useState("");
  const [tag, setTag] = useState("");
  const [rescueCode, setRescueCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, tag, rescueCode, newPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Zurücksetzen fehlgeschlagen.");
        setSubmitting(false);
        return;
      }
      pushToast("PIN geändert! Du kannst dich jetzt einloggen.", "success");
      navigate("login");
    } catch {
      setError("Etwas ist schiefgelaufen.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6 sm:px-6">
      <header className="flex items-center">
        <button
          type="button"
          onClick={() => navigate("login")}
          className="tap-target inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-ink-dim hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Zurück
        </button>
      </header>

      <main className="flex flex-1 flex-col justify-center gap-6 py-6">
        <div className="text-center">
          <div className="mb-3 text-5xl" aria-hidden>🦉</div>
          <h1 className="font-display text-2xl font-bold text-ink">PIN vergessen?</h1>
          <p className="mt-1 text-sm text-ink-dim">
            Gib deinen Spielnamen, Tag und Rettungscode ein, dann kannst du eine neue PIN wählen.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <Label htmlFor="dn">Spielname</Label>
            <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-12" autoFocus />
          </div>
          <div>
            <Label htmlFor="tag">Tag</Label>
            <Input
              id="tag"
              value={tag}
              onChange={(e) => setTag(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              maxLength={4}
              className="h-12 text-center font-display tracking-widest"
            />
          </div>
          <div>
            <Label htmlFor="rc">Rettungscode</Label>
            <Input
              id="rc"
              value={rescueCode}
              onChange={(e) => setRescueCode(e.target.value)}
              placeholder="Mond-Tiger-Brot-47"
              className="h-12"
            />
            <p className="mt-1 text-xs text-ink-dim">Genau so eingeben wie bei der Registrierung.</p>
          </div>
          <div>
            <Label htmlFor="np">Neue PIN (4 Ziffern)</Label>
            <Input
              id="np"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              maxLength={4}
              className="h-12 text-center font-display tracking-widest"
            />
          </div>
        </div>
        {error && (
          <div className="rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-coral">
            {error}
          </div>
        )}
        <Button
          size="lg"
          className="h-14 w-full font-display text-base font-bold"
          onClick={submit}
          disabled={submitting}
        >
          {submitting ? "Wird geändert …" : "PIN ändern"}
        </Button>
      </main>
    </div>
  );
}
