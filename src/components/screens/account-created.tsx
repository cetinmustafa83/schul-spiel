"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Lumi } from "@/components/lumi";
import { formatTaler } from "@/lib/german";

export function AccountCreatedScreen() {
  const { payload, navigate } = useApp();
  const [confirmed, setConfirmed] = useState(false);

  const handle = (payload?.handle as string) ?? "";
  const rescueCode = (payload?.rescueCode as string) ?? "";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-8 sm:px-6">
      <main className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <Lumi pose="cheer" size={96} />
          <div className="text-4xl" aria-hidden>🎉</div>
        </div>
        <h1 className="font-display text-2xl font-bold text-ink">Willkommen an Bord!</h1>
        <p className="text-sm text-ink-dim">
          Dein Zugang ist erstellt. Merke dir diese Daten — ohne Rettungscode können wir deine PIN nicht zurücksetzen.
        </p>

        {/* Account card */}
        <div className="w-full rounded-2xl border-2 border-gold/40 bg-bg1/80 p-5 backdrop-blur">
          <div className="mb-3 text-xs uppercase tracking-wide text-gold">Mein Zugang</div>
          <div className="font-display text-2xl font-bold text-ink">{handle}</div>
          <div className="my-4 border-t border-border" />
          <div className="text-xs uppercase tracking-wide text-gold">Rettungscode</div>
          <div className="mt-1 break-words font-display text-lg font-bold text-mint">{rescueCode}</div>
          <p className="mt-2 text-xs text-ink-dim">
            Schreib ihn dir am besten auf einen Zettel und leg ihn zu Hause hin.
          </p>
        </div>

        <label className="flex items-center gap-3 text-sm text-ink-dim">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="h-5 w-5 accent-gold"
          />
          Ich habe mir meinen Zugang gemerkt.
        </label>

        <Button
          size="lg"
          className="h-14 w-full font-display text-base font-bold"
          onClick={() => navigate("home")}
          disabled={!confirmed}
        >
          Los geht&apos;{`'`}s!
        </Button>
      </main>
    </div>
  );
}
