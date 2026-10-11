"use client";

import { create } from "zustand";

export type Screen =
  | "landing"
  | "register"
  | "login"
  | "reset-pin"
  | "account-created"
  | "home"
  | "game-setup"
  | "game-stage"
  | "training-setup"
  | "training-run"
  | "review"
  | "daily"
  | "profile"
  | "settings"
  | "legal"
  | "parent-info"
  | "help"
  | "imprint";

export interface SessionPlayer {
  id: string;
  displayName: string;
  tag: string;
  schoolType: string;
  grade: number;
  avatarId: number | null;
  xp: number;
}

interface AppState {
  // Session
  player: SessionPlayer | null;
  loadingPlayer: boolean;
  setPlayer: (p: SessionPlayer | null) => void;
  setLoadingPlayer: (b: boolean) => void;

  // Navigation
  screen: Screen;
  navigate: (s: Screen) => void;
  // Optional payload for screens that need one (e.g., game id).
  payload: Record<string, unknown> | null;
  setPayload: (p: Record<string, unknown> | null) => void;

  // Player prefs (theme, sound, etc.) — kept in client state, mirrored to /api/me.
  prefs: {
    sound: boolean;
    music: boolean;
    reducedMotion: boolean;
    textScale: number;
    dyslexia: boolean;
    timer: "off" | "relaxed" | "challenge";
  };
  setPrefs: (p: Partial<AppState["prefs"]>) => void;

  // Toasts
  toasts: Array<{ id: string; message: string; tone: "default" | "success" | "error" | "info" }>;
  pushToast: (message: string, tone?: "default" | "success" | "error" | "info") => void;
  dismissToast: (id: string) => void;
}

export const useApp = create<AppState>((set, get) => ({
  player: null,
  loadingPlayer: true,
  setPlayer: (p) => set({ player: p }),
  setLoadingPlayer: (b) => set({ loadingPlayer: b }),

  screen: "landing",
  navigate: (s) => {
    set({ screen: s });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  },
  payload: null,
  setPayload: (p) => set({ payload: p }),

  prefs: {
    sound: true,
    music: false,
    reducedMotion: false,
    textScale: 100,
    dyslexia: false,
    timer: "off",
  },
  setPrefs: (p) => set({ prefs: { ...get().prefs, ...p } }),

  toasts: [],
  pushToast: (message, tone = "default") => {
    const id = Math.random().toString(36).slice(2, 9);
    set({ toasts: [...get().toasts, { id, message, tone }] });
    setTimeout(() => get().dismissToast(id), 3500);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
