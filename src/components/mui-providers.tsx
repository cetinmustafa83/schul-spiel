"use client";

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { wissensgipfelTheme } from "@/lib/theme";

export function MuiProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={wissensgipfelTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
