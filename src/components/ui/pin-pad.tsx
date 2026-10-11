"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Delete } from "lucide-react";

interface PinPadProps {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  onSubmit?: (finalValue: string) => void;
  autoFocus?: boolean;
  label?: string;
  className?: string;
}

export function PinPad({
  length = 4,
  value,
  onChange,
  onSubmit,
  autoFocus = true,
  label = "PIN",
  className,
}: PinPadProps) {
  const [revealed, setRevealed] = useState(false);
  // Keep a ref to the latest onSubmit so setTimeout doesn't call a stale closure.
  const submitRef = useRef(onSubmit);
  useEffect(() => {
    submitRef.current = onSubmit;
  }, [onSubmit]);

  const press = (digit: string) => {
    if (value.length >= length) return;
    const next = value + digit;
    onChange(next);
    if (next.length === length) {
      const final = next;
      setTimeout(() => submitRef.current?.(final), 150);
    }
  };
  const backspace = () => onChange(value.slice(0, -1));

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-ink-dim">{label}</span>
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          className="text-ink-dim hover:text-ink"
          aria-label={revealed ? "PIN verbergen" : "PIN anzeigen"}
        >
          {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {/* Dots/digits */}
      <div className="flex gap-3" role="group" aria-label={`${label}-Eingabe`}>
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex h-14 w-12 items-center justify-center rounded-xl border-2 text-2xl font-display font-bold transition-all",
              i < value.length
                ? "border-gold bg-gold/10 text-gold"
                : "border-border bg-bg1/60 text-ink"
            )}
          >
            {i < value.length ? (revealed ? value[i] : "•") : ""}
          </div>
        ))}
      </div>

      {/* Keypad */}
      <div className="grid w-full max-w-[280px] grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => press(d)}
            autoFocus={autoFocus && d === "1"}
            className="tap-target rounded-xl bg-bg2/60 py-4 text-2xl font-display font-semibold text-ink hover:bg-bg2 active:bg-gold active:text-bg0 transition-colors"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={backspace}
          disabled={value.length === 0}
          className="tap-target rounded-xl bg-bg2/30 py-4 text-ink-dim hover:bg-bg2/60 disabled:opacity-40 transition-colors"
          aria-label="Löschen"
        >
          <Delete className="mx-auto h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => press("0")}
          className="tap-target rounded-xl bg-bg2/60 py-4 text-2xl font-display font-semibold text-ink hover:bg-bg2 active:bg-gold active:text-bg0 transition-colors"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => submitRef.current?.(value)}
          disabled={value.length !== length}
          className="tap-target rounded-xl bg-gold/20 py-4 text-sm font-semibold text-gold hover:bg-gold/30 disabled:opacity-40 transition-colors"
          aria-label="Bestätigen"
        >
          ✓
        </button>
      </div>
    </div>
  );
}
