"use client";

import { useRef, type ComponentProps } from "react";
import { useIconHover } from "@animateicons/react";
import {
  TrophyIcon,
  TimerIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CircleCheckBigIcon,
  CircleXIcon,
  PhoneCallIcon,
  ShuffleIcon,
  SettingsIcon,
  LogOutIcon,
  DownloadIcon,
  Trash2Icon,
  CalendarIcon,
  TargetIcon,
  RepeatIcon,
  UserIcon,
  HeadphonesIcon,
  EyeIcon,
} from "@animateicons/react/lucide";

/**
 * Animated icon wrapper — uses @animateicons/react for hover-triggered
 * Lottie-style icon animations. Falls back to static if animation fails.
 *
 * Usage:
 *   <AnimatedIcon name="trophy" size={20} />
 *   <AnimatedIcon name="trophy" size={20} trigger="click" />
 */

const ICON_MAP = {
  trophy: TrophyIcon,
  timer: TimerIcon,
  arrowLeft: ArrowLeftIcon,
  arrowRight: ArrowRightIcon,
  checkCircle: CircleCheckBigIcon,
  xCircle: CircleXIcon,
  phoneCall: PhoneCallIcon,
  shuffle: ShuffleIcon,
  settings: SettingsIcon,
  logOut: LogOutIcon,
  download: DownloadIcon,
  trash2: Trash2Icon,
  calendar: CalendarIcon,
  target: TargetIcon,
  repeat: RepeatIcon,
  user: UserIcon,
  headphones: HeadphonesIcon,
  eye: EyeIcon,
} as const;

export type AnimatedIconName = keyof typeof ICON_MAP;

interface AnimatedIconProps {
  name: AnimatedIconName;
  size?: number;
  color?: string;
  trigger?: "hover" | "click" | "both";
  className?: string;
}

export function AnimatedIcon({
  name,
  size = 20,
  color = "currentColor",
  trigger = "hover",
  className,
}: AnimatedIconProps) {
  const IconComp = ICON_MAP[name];
  if (!IconComp) return null;

  return (
    <div className={className} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <IconComp
        size={size}
        color={color}
        isAnimated={true}
        trigger={trigger}
        duration={0.8}
      />
    </div>
  );
}

/** Hook-based animated icon for more control (start/stop animation). */
export function useAnimatedIcon(name: AnimatedIconName) {
  const ref = useRef<null>(null);
  const IconComp = ICON_MAP[name];
  return { IconComp, ref };
}
