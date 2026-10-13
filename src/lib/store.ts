"use client";

import { create } from "zustand";

export type Screen =
  | "landing"
  | "onboarding"
  | "home"
  | "game-setup"
  | "game-stage"
  | "klassenarbeit-setup"
  | "klassenarbeit-run"
  | "profile"
  | "settings";

export interface SessionPlayer {
  name: string;
  schoolType: string;
  grade: number;
  avatarId: number | null;
  xp: number;
}

interface AppState {
  player: SessionPlayer | null;
  loadingPlayer: boolean;
  setPlayer: (p: SessionPlayer | null) => void;
  setLoadingPlayer: (b: boolean) => void;

  screen: Screen;
  navigate: (s: Screen) => void;
  payload: Record<string, unknown> | null;
  setPayload: (p: Record<string, unknown> | null) => void;

  prefs: {
    sound: boolean;
    reducedMotion: boolean;
    textScale: number;
    dyslexia: boolean;
    highContrast: boolean;
    largeTargets: boolean;
    reduceTransparency: boolean;
    focusRing: boolean;
    timer: "off" | "relaxed" | "challenge";
  };
  setPrefs: (p: Partial<AppState["prefs"]>) => void;

  toasts: Array<{ id: string; message: string; tone: "default" | "success" | "error" | "info" }>;
  pushToast: (message: string, tone?: "default" | "success" | "error" | "info") => void;
  dismissToast: (id: string) => void;
}

const PREFS_KEY = "wissensgipfel-prefs";

const DEFAULT_PREFS = {
  sound: true,
  reducedMotion: false,
  textScale: 100,
  dyslexia: false,
  highContrast: false,
  largeTargets: false,
  reduceTransparency: false,
  focusRing: false,
  timer: "off" as const,
};

function loadPrefs(): AppState["prefs"] {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS };
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (stored) return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_PREFS };
}

export const useApp = create<AppState>((set, get) => ({
  player: null,
  loadingPlayer: true,
  setPlayer: (p) => set({ player: p }),
  setLoadingPlayer: (b) => set({ loadingPlayer: b }),

  screen: "landing",
  navigate: (s) => {
    set({ screen: s });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },
  payload: null,
  setPayload: (p) => set({ payload: p }),

  prefs: loadPrefs(),
  setPrefs: (p) => {
    const np = { ...get().prefs, ...p };
    set({ prefs: np });
    if (typeof window !== "undefined") try { localStorage.setItem(PREFS_KEY, JSON.stringify(np)); } catch { /* ignore */ }
  },

  toasts: [],
  pushToast: (message, tone = "default") => {
    const id = Math.random().toString(36).slice(2, 9);
    set({ toasts: [...get().toasts, { id, message, tone }] });
    setTimeout(() => get().dismissToast(id), 3500);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
