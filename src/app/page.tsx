"use client";

import { useEffect } from "react";
import { useApp, type Screen } from "@/lib/store";
import { LandingScreen } from "@/components/screens/landing";
import { OnboardingScreen } from "@/components/screens/onboarding";
import { HomeScreen } from "@/components/screens/home";
import { GameSetupScreen } from "@/components/screens/game-setup";
import { GameStageScreen } from "@/components/screens/game-stage";
import { TrainingSetupScreen } from "@/components/screens/training-setup";
import { TrainingRunScreen } from "@/components/screens/training-run";
import { ReviewScreen } from "@/components/screens/review";
import { DailyScreen } from "@/components/screens/daily";
import { ProfileScreen } from "@/components/screens/profile";
import { SettingsScreen } from "@/components/screens/settings";
import { LegalScreen } from "@/components/screens/legal";
import { AnimatedBackground } from "@/components/three/animated-background";
import { getDB, getPlayer } from "@/lib/browser-db";

const SCREENS: Record<Screen, React.ComponentType> = {
  landing: LandingScreen,
  onboarding: OnboardingScreen,
  home: HomeScreen,
  "game-setup": GameSetupScreen,
  "game-stage": GameStageScreen,
  "training-setup": TrainingSetupScreen,
  "training-run": TrainingRunScreen,
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
  const { player, loadingPlayer, screen, setPlayer, setLoadingPlayer, navigate, prefs, setPrefs } = useApp();

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

  if (loadingPlayer) {
    return (
      <main className="relative flex min-h-screen items-center justify-center">
        <AnimatedBackground reducedMotion={prefs.reducedMotion} particles particleType="dust" particleCount={20} />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
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
      <AnimatedBackground reducedMotion={prefs.reducedMotion} particles particleType="dust" particleCount={20} />
      <div className="relative z-10">
        <Screen />
      </div>
    </main>
  );
}
