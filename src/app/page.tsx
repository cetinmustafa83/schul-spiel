"use client";

import { useEffect } from "react";
import { useApp, type Screen } from "@/lib/store";
import { LandingScreen } from "@/components/screens/landing";
import { RegisterScreen } from "@/components/screens/register";
import { LoginScreen } from "@/components/screens/login";
import { ResetPinScreen } from "@/components/screens/reset-pin";
import { AccountCreatedScreen } from "@/components/screens/account-created";
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

const SCREENS: Record<Screen, React.ComponentType> = {
  landing: LandingScreen,
  register: RegisterScreen,
  login: LoginScreen,
  "reset-pin": ResetPinScreen,
  "account-created": AccountCreatedScreen,
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

  // Bootstrap session on first load.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setPlayer(data);
          navigate("home");
          if (data.prefs) setPrefs(data.prefs);
        } else {
          navigate("landing");
        }
      } catch {
        navigate("landing");
      } finally {
        setLoadingPlayer(false);
      }
    })();
  }, []);

  // Apply reduced-motion + text-scale prefs as CSS variables on <html>.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.fontSize = `${prefs.textScale}%`;
    document.documentElement.classList.toggle("reduce-motion", prefs.reducedMotion);
  }, [prefs.textScale, prefs.reducedMotion]);

  // Apply dyslexia-friendly font class.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dyslexia", prefs.dyslexia);
  }, [prefs.dyslexia]);

  // Auth gate: if a screen requires auth and no player, send to landing.
  // This must run inside an effect — calling navigate() during render
  // would trigger a setState-in-render error.
  useEffect(() => {
    if (loadingPlayer) return;
    const requiresAuth = !["landing", "register", "login", "reset-pin", "account-created"].includes(screen);
    if (requiresAuth && !player) {
      navigate("landing");
    }
  }, [screen, player, loadingPlayer, navigate]);

  if (loadingPlayer) {
    return (
      <main className="starfield relative flex min-h-screen items-center justify-center">
        <div className="mountains" />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <div className="animate-pulse text-6xl">🏔️</div>
          <p className="font-display text-xl text-ink">Wissensgipfel wird geladen …</p>
        </div>
      </main>
    );
  }

  // If auth is required but missing, render a minimal placeholder
  // while the effect above redirects to landing.
  const requiresAuth = !["landing", "register", "login", "reset-pin", "account-created"].includes(screen);
  if (requiresAuth && !player) {
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
