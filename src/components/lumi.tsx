"use client";

import { cn } from "@/lib/utils";

interface LumiProps {
  pose?: "idle" | "thinking" | "cheer" | "sympathy" | "surprised" | "sleeping";
  size?: number;
  className?: string;
}

/**
 * Lumi — the Wissensgipfel mascot. Original SVG character (gender-neutral owl).
 * Poses change the eye/eyebrow shape only (keeps the silhouette consistent).
 */
export function Lumi({ pose = "idle", size = 96, className }: LumiProps) {
  const eyeOffset = pose === "thinking" ? 0 : 0;
  const browRotate = pose === "surprised" ? -10 : pose === "sympathy" ? 8 : 0;
  const cheekFill = pose === "cheer" ? "#FF6B7A" : "#FFB5C2";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label="Lumi, die Eule"
      className={cn("select-none", className)}
    >
      <defs>
        <radialGradient id="lumi-body" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#9F8CFF" />
          <stop offset="100%" stopColor="#5A4BCA" />
        </radialGradient>
        <radialGradient id="lumi-belly" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F5F3FF" />
          <stop offset="100%" stopColor="#C9C0FF" />
        </radialGradient>
      </defs>

      {/* Body (rounded owl silhouette) */}
      <ellipse cx="60" cy="68" rx="44" ry="42" fill="url(#lumi-body)" />
      {/* Belly */}
      <ellipse cx="60" cy="76" rx="28" ry="26" fill="url(#lumi-belly)" opacity="0.95" />

      {/* Ear tufts */}
      <path d="M 22 30 L 30 18 L 36 32 Z" fill="#5A4BCA" />
      <path d="M 98 30 L 90 18 L 84 32 Z" fill="#5A4BCA" />

      {/* Eye discs (large circles) */}
      <circle cx="44" cy="56" r="16" fill="#F5F3FF" />
      <circle cx="76" cy="56" r="16" fill="#F5F3FF" />
      {/* Pupils */}
      <g transform={`translate(${eyeOffset}, 0)`}>
        <circle cx="46" cy="58" r="7" fill="#1A1238" />
        <circle cx="78" cy="58" r="7" fill="#1A1238" />
        {/* Sparkle */}
        <circle cx="44" cy="55" r="2" fill="#F5F3FF" />
        <circle cx="76" cy="55" r="2" fill="#F5F3FF" />
      </g>
      {/* Eyebrows (small lines above eyes for expression) */}
      <g transform={`rotate(${browRotate} 44 44)`}>
        <rect x="36" y="40" width="16" height="2.5" rx="1.25" fill="#3D2F8F" opacity="0.7" />
      </g>
      <g transform={`rotate(${-browRotate} 76 44)`}>
        <rect x="68" y="40" width="16" height="2.5" rx="1.25" fill="#3D2F8F" opacity="0.7" />
      </g>

      {/* Beak */}
      <path d="M 60 66 L 54 72 Q 60 78 66 72 Z" fill="#FFC83D" />
      <path d="M 54 72 L 60 76 L 66 72 Z" fill="#E59A00" />

      {/* Cheeks (for cheer/sympathy poses) */}
      <circle cx="34" cy="72" r="5" fill={cheekFill} opacity={pose === "cheer" || pose === "sympathy" ? 0.85 : 0} />
      <circle cx="86" cy="72" r="5" fill={cheekFill} opacity={pose === "cheer" || pose === "sympathy" ? 0.85 : 0} />

      {/* Feet */}
      <ellipse cx="48" cy="108" rx="6" ry="3" fill="#FFC83D" />
      <ellipse cx="72" cy="108" rx="6" ry="3" fill="#FFC83D" />
    </svg>
  );
}
