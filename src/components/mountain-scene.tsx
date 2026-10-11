"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Mountain SVG silhouette — wraps content visually as the "twilight summit"
 * background decoration. The actual gradient is in globals.css (.mountains).
 * This component just renders the SVG path used as a header decoration.
 */
export function MountainScene({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden="true"
    >
      {!compact && (
        <>
          {/* Far ridge */}
          <svg className="absolute bottom-0 left-0 w-full" height="40%" viewBox="0 0 1200 200" preserveAspectRatio="none">
            <path
              d="M0,200 L0,120 L100,80 L220,140 L340,60 L460,130 L580,50 L700,110 L820,40 L940,100 L1060,80 L1200,140 L1200,200 Z"
              fill="#1C1A44"
              opacity="0.55"
            />
          </svg>
          {/* Near ridge */}
          <svg className="absolute bottom-0 left-0 w-full" height="32%" viewBox="0 0 1200 200" preserveAspectRatio="none">
            <path
              d="M0,200 L0,140 L80,90 L180,160 L280,100 L380,170 L500,110 L620,180 L740,120 L860,180 L980,130 L1080,170 L1200,140 L1200,200 Z"
              fill="#12102B"
              opacity="0.95"
            />
          </svg>
        </>
      )}
    </div>
  );
}

/** A small Lumi banner with the mascot and a German message. */
export function LumiBubble({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative flex items-start gap-3 rounded-2xl bg-bg1/80 p-4 border border-border backdrop-blur",
        className
      )}
    >
      <span className="text-2xl" aria-hidden>🦉</span>
      <div className="text-sm text-ink-dim">{children}</div>
    </div>
  );
}
