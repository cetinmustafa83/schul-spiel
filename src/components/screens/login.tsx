"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { PinPad } from "@/components/ui/pin-pad";
import { formatTaler } from "@/lib/german";

export function LoginScreen() {
  const { navigate, setPlayer, pushToast } = useApp();
  const [displayName, setDisplayName] = useState("");
  const [tag, setTag] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(finalPin?: string) {
    const pinValue = finalPin ?? pin;
    if (displayName.length < 3 || tag.length !== 4 || pinValue.length !== 4) {
      setError("Bitte Spielname, Tag und PIN eingeben.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, tag, pin: pinValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Login fehlgeschlagen.");
        setSubmitting(false);
        return;
      }
      setPlayer(data);
      pushToast(`Willkommen zurück, ${data.displayName}!`, "success");
      navigate("home");
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
          onClick={() => navigate("landing")}
          className="tap-target inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-ink-dim hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Zurück
        </button>
      </header>

      <main className="flex flex-1 flex-col justify-center gap-6 py-6">
        <div className="text-center">
          <div className="mb-3 text-5xl" aria-hidden>🔑</div>
          <h1 className="font-display text-2xl font-bold text-ink">Willkommen zurück!</h1>
          <p className="mt-1 text-sm text-ink-dim">Melde dich mit Spielname, Tag und PIN an.</p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="dn">Spielname</Label>
            <Input
              id="dn"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="z. B. Mutiger Fuchs"
              className="h-12"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tag">Tag (4 Ziffern)</Label>
            <Input
              id="tag"
              value={tag}
              onChange={(e) => setTag(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              maxLength={4}
              className="h-12 text-center font-display tracking-widest"
              placeholder="4821"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-bg1/60 p-6">
          <PinPad
            value={pin}
            onChange={setPin}
            onSubmit={submit}
            label="PIN"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-coral">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate("reset-pin")}
          className="text-center text-sm text-ink-dim hover:text-ink"
        >
          PIN vergessen?
        </button>
      </main>

      <footer className="pt-2 text-center text-xs text-ink-dim">
        Kein Konto?{" "}
        <button onClick={() => navigate("register")} className="font-semibold text-gold hover:underline">
          Jetzt registrieren
        </button>
      </footer>
    </div>
  );
}
