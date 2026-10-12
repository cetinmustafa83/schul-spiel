"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import { useApp, type Screen } from "@/lib/store";
import { setSoundEnabled, unlockAudio } from "@/lib/audio/sfx";
import { LandingScreen } from "@/components/screens/landing";
import { OnboardingScreen } from "@/components/screens/onboarding";
import { HomeScreen } from "@/components/screens/home";
import { GameSetupScreen } from "@/components/screens/game-setup";
import { GameStageScreen } from "@/components/screens/game-stage";
import { TrainingSetupScreen } from "@/components/screens/training-setup";
import { TrainingRunScreen } from "@/components/screens/training-run";
import { KlassenarbeitSetupScreen } from "@/components/screens/klassenarbeit-setup";
import { KlassenarbeitRunScreen } from "@/components/screens/klassenarbeit-run";
import { ReviewScreen } from "@/components/screens/review";
import { DailyScreen } from "@/components/screens/daily";
import { ProfileScreen } from "@/components/screens/profile";
import { SettingsScreen } from "@/components/screens/settings";
import { LegalScreen } from "@/components/screens/legal";
import { getDB, getPlayer } from "@/lib/browser-db";

// Lazy-load AnimatedBackground to avoid SSR hydration mismatch
const AnimatedBackground = lazy(() =>
  import("@/components/three/animated-background").then((m) => ({ default: m.AnimatedBackground }))
);

const SCREENS: Record<Screen, React.ComponentType> = {
  landing: LandingScreen,
  onboarding: OnboardingScreen,
  home: HomeScreen,
  "game-setup": GameSetupScreen,
  "game-stage": GameStageScreen,
  "training-setup": TrainingSetupScreen,
  "training-run": TrainingRunScreen,
  "klassenarbeit-setup": KlassenarbeitSetupScreen,
  "klassenarbeit-run": KlassenarbeitRunScreen,
  review: ReviewScreen,
  daily: DailyScreen,
  profile: ProfileScreen,
  settings: SettingsScreen,
  legal: LegalScreen,
  "parent-info": LegalScreen,
  help: LegalScreen,
  imprint: LegalScreen,
};

export default function Page() {
  const { player, loadingPlayer, screen, setPlayer, setLoadingPlayer, navigate, prefs } = useApp();
  const [mounted, setMounted] = useState(false);

  // Prevent SSR rendering of browser-only components
  useEffect(() => { setMounted(true); }, []);

  // Sync sound preference to the audio engine + unlock audio on first gesture
  useEffect(() => {
    setSoundEnabled(prefs.sound);
  }, [prefs.sound]);

  useEffect(() => {
    const handler = () => { unlockAudio(); };
    window.addEventListener("pointerdown", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);

  // Bootstrap — load player from LokiJS (browser localStorage)
  useEffect(() => {
    void (async () => {
      try {
        await getDB();
        // Check if there's a "last active" player stored
        const lastName = typeof window !== "undefined" ? localStorage.getItem("wissensgipfel-last-player") : null;
        if (lastName) {
          const p = await getPlayer(lastName);
          if (p) {
            setPlayer({
              name: p.name,
              schoolType: p.schoolType,
              grade: p.grade,
              avatarId: p.avatarId,
              xp: p.xp,
            });
            navigate("home");
            return;
          }
        }
        navigate("landing");
      } catch {
        navigate("landing");
      } finally {
        setLoadingPlayer(false);
      }
    })();
  }, []);

  // Apply reduced-motion + text-scale prefs
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.fontSize = `${prefs.textScale}%`;
    document.documentElement.classList.toggle("reduce-motion", prefs.reducedMotion);
  }, [prefs.textScale, prefs.reducedMotion]);

  // Apply dyslexia-friendly font class
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dyslexia", prefs.dyslexia);
  }, [prefs.dyslexia]);

  // Auth gate — if screen requires player and none exists, go to landing
  useEffect(() => {
    if (loadingPlayer) return;
    const requiresPlayer = !["landing", "onboarding"].includes(screen);
    if (requiresPlayer && !player) {
      navigate("landing");
    }
  }, [screen, player, loadingPlayer, navigate]);

  if (loadingPlayer || !mounted) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-bg0">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="animate-pulse text-6xl">🏔️</div>
          <p className="font-display text-xl text-ink">Wird geladen …</p>
        </div>
      </main>
    );
  }

  const requiresPlayer = !["landing", "onboarding"].includes(screen);
  if (requiresPlayer && !player) {
    return null;
  }

  const Screen = SCREENS[screen] ?? LandingScreen;

  return (
    <main className="relative min-h-screen">
      <Suspense fallback={null}>
        <AnimatedBackground reducedMotion={prefs.reducedMotion} particles particleType="dust" particleCount={20} />
      </Suspense>
      <div className="relative z-10">
        <Screen />
      </div>
    </main>
  );
}
