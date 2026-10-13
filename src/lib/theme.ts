"use client";

import { createTheme, type ThemeOptions } from "@mui/material/styles";

/**
 * Wissensgipfel MUI theme — "Twilight Summit" palette.
 * Deep indigo night sky + violet/gold accents matching the BinaryOrbits galaxy.
 */
const baseTypography = {
  fontFamily:
    'var(--font-lexend), "Roboto", "Helvetica", "Arial", sans-serif',
  h1: { fontWeight: 800, letterSpacing: "-0.02em" },
  h2: { fontWeight: 700, letterSpacing: "-0.015em" },
  h3: { fontWeight: 700, letterSpacing: "-0.01em" },
  h4: { fontWeight: 700 },
  h5: { fontWeight: 600 },
  h6: { fontWeight: 600 },
  button: { fontWeight: 600, textTransform: "none" as const },
};

export const wissensgipfelTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#8B6CFF", // violet
      light: "#A88BFF",
      dark: "#6B4EDB",
    },
    secondary: {
      main: "#FFC83D", // gold
      light: "#FFD96B",
      dark: "#E59A00",
    },
    error: { main: "#FF6B7A" },
    success: { main: "#3DDBA4" },
    info: { main: "#5CC8FF" },
    background: {
      default: "#0E0A28",
      paper: "rgba(28, 26, 68, 0.6)",
    },
    text: {
      primary: "#F5F3FF",
      secondary: "#BDB8E6",
    },
    divider: "rgba(245, 243, 255, 0.12)",
  },
  typography: baseTypography,
  shape: { borderRadius: 16 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#0E0A28",
          backgroundImage:
            "radial-gradient(1200px 600px at 50% -10%, rgba(139, 108, 255, 0.18), transparent 60%)",
          minHeight: "100vh",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backdropFilter: "blur(12px)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 20,
          paddingBlock: 10,
        },
        sizeLarge: {
          paddingInline: 28,
          paddingBlock: 14,
          fontSize: "1rem",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(12px)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
      },
    },
  },
} as ThemeOptions);

export const motionPresets = {
  // Page enter — fade + slide up
  pageEnter: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -16 },
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
  // Card enter — fade + scale up (staggered)
  cardEnter: (delay = 0) => ({
    initial: { opacity: 0, scale: 0.94, y: 12 },
    animate: { opacity: 1, scale: 1, y: 0 },
    transition: { duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
  // Item enter — fade + slide from left
  itemEnter: (delay = 0) => ({
    initial: { opacity: 0, x: -16 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.3, delay, ease: "easeOut" as const },
  }),
  // Pop — scale bounce
  pop: {
    initial: { opacity: 0, scale: 0.5 },
    animate: { opacity: 1, scale: 1 },
    transition: { type: "spring" as const, stiffness: 400, damping: 22 },
  },
};
