"use client";
import { useEffect, useState } from "react";
import { useApp, type Screen } from "@/lib/store";
import { setSoundEnabled, unlockAudio } from "@/lib/audio/sfx";
import { LandingScreen } from "@/components/screens/landing";
import { OnboardingScreen } from "@/components/screens/onboarding";
import { HomeScreen } from "@/components/screens/home";
import { GameSetupScreen } from "@/components/screens/game-setup";
import { GameStageScreen } from "@/components/screens/game-stage";
import { KlassenarbeitSetupScreen } from "@/components/screens/klassenarbeit-setup";
import { KlassenarbeitRunScreen } from "@/components/screens/klassenarbeit-run";
import { ProfileScreen } from "@/components/screens/profile";
import { SettingsScreen } from "@/components/screens/settings";
import { BinaryOrbits } from "@/components/ui/binary-orbits";
import { getDB, getPlayer } from "@/lib/browser-db";

const SCREENS: Record<Screen, React.ComponentType> = {
  landing: LandingScreen,
  onboarding: OnboardingScreen,
  home: HomeScreen,
  "game-setup": GameSetupScreen,
  "game-stage": GameStageScreen,
  "klassenarbeit-setup": KlassenarbeitSetupScreen,
  "klassenarbeit-run": KlassenarbeitRunScreen,
  profile: ProfileScreen,
  settings: SettingsScreen,
};

export default function Page() {
  const { player, loadingPlayer, screen, setPlayer, setLoadingPlayer, navigate, prefs } = useApp();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setSoundEnabled(prefs.sound); }, [prefs.sound]);
  useEffect(() => {
    const handler = () => { unlockAudio(); };
    window.addEventListener("pointerdown", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await getDB();
        const lastName = typeof window !== "undefined" ? localStorage.getItem("wissensgipfel-last-player") : null;
        if (lastName) {
          const p = await getPlayer(lastName);
          if (p) {
            setPlayer({ name: p.name, schoolType: p.schoolType, grade: p.grade, avatarId: p.avatarId, xp: p.xp });
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

  useEffect(() => {
    if (loadingPlayer) return;
    const requiresPlayer = !["landing", "onboarding"].includes(screen);
    if (requiresPlayer && !player) navigate("landing");
  }, [screen, player, loadingPlayer, navigate]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.fontSize = `${prefs.textScale}%`;
    document.documentElement.classList.toggle("reduce-motion", prefs.reducedMotion);
    document.documentElement.classList.toggle("dyslexia", prefs.dyslexia);
  }, [prefs.textScale, prefs.reducedMotion, prefs.dyslexia]);

  if (loadingPlayer || !mounted) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-bg0">
        <BinaryOrbits reducedMotion={prefs.reducedMotion} />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <div className="animate-pulse text-6xl">🏔️</div>
          <p className="font-display text-xl text-ink">Wird geladen …</p>
        </div>
      </main>
    );
  }

  const requiresPlayer = !["landing", "onboarding"].includes(screen);
  if (requiresPlayer && !player) return null;

  const Screen = SCREENS[screen] ?? LandingScreen;
  return (
    <main className="relative min-h-screen">
      <BinaryOrbits reducedMotion={prefs.reducedMotion} />
      <div className="relative z-10">
        <Screen />
      </div>
    </main>
  );
}
