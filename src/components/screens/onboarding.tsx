"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Container, Box, Typography, Button, Card } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckIcon from "@mui/icons-material/Check";
import { useApp } from "@/lib/store";
import { suggestSpielername, SCHOOL_TYPE_LABELS } from "@/lib/german";
import { getOrCreatePlayer } from "@/lib/browser-db";
import { motionPresets } from "@/lib/theme";

export function OnboardingScreen() {
  const { navigate, setPlayer, pushToast } = useApp();
  const [step, setStep] = useState(0);
  const [schoolType, setSchoolType] = useState("");
  const [grade, setGrade] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function next() {
    setError(null);
    if (step === 0) {
      if (!schoolType) {
        setError("Bitte wähle deine Schulform.");
        return;
      }
      setStep(1);
    } else if (step === 1) {
      if (grade == null) {
        setError("Bitte wähle deine Klasse.");
        return;
      }
      void submit();
    }
  }

  function back() {
    setError(null);
    if (step === 0) {
      navigate("landing");
    } else {
      setStep(step - 1);
    }
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      // Auto-generate a fantasy name — no user input needed.
      const name = suggestSpielername();
      const player = await getOrCreatePlayer(name, schoolType, grade ?? 5, null);
      localStorage.setItem("wissensgipfel-last-player", player.name);
      setPlayer({
        name: player.name,
        schoolType: player.schoolType,
        grade: player.grade,
        avatarId: player.avatarId,
        xp: player.xp,
      });
      pushToast(`Willkommen, ${player.name}!`, "success");
      navigate("home");
    } catch {
      setError("Etwas ist schiefgelaufen. Bitte versuche es nochmal.");
      setSubmitting(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", py: 4 }}>
      {/* Header with back + step dots */}
      <Box component={motion.div} {...motionPresets.itemEnter(0)} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={back} sx={{ color: "text.secondary" }}>
          Zurück
        </Button>
        <Box sx={{ display: "flex", gap: 0.75 }}>
          {[0, 1].map((i) => (
            <Box
              key={i}
              sx={{
                height: 6, borderRadius: 3,
                transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
                width: i === step ? 24 : 6,
                bgcolor: i === step ? "primary.main" : i < step ? "rgba(139, 108, 255, 0.4)" : "rgba(245, 243, 255, 0.1)",
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Step content */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 3 }}>
        <AnimatePresence mode="wait">
          {step === 0 && (
            <Box key="step0" component={motion.div} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <Typography variant="h5" fontWeight={700} color="text.primary" gutterBottom>
                Welche Schulform?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Wir wählen nur Fragen aus, die zu deiner Schule passen.
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {Object.entries(SCHOOL_TYPE_LABELS).map(([code, label], idx) => {
                  const active = schoolType === code;
                  return (
                    <Box key={code} component={motion.div} {...motionPresets.itemEnter(0.03 * idx)}>
                      <Card
                        onClick={() => setSchoolType(code)}
                        sx={{
                          cursor: "pointer", p: 2,
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          bgcolor: active ? "rgba(139, 108, 255, 0.12)" : "background.paper",
                          border: "1px solid",
                          borderColor: active ? "primary.main" : "divider",
                          boxShadow: active ? "0 0 16px rgba(139, 108, 255, 0.2)" : "none",
                          transition: "all 0.25s",
                          "&:hover": { borderColor: "primary.light", transform: "translateY(-1px)" },
                        }}
                      >
                        <Typography variant="body1" fontWeight={600} color="text.primary">{label}</Typography>
                        {active && <CheckIcon sx={{ color: "primary.light" }} />}
                      </Card>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}

          {step === 1 && (
            <Box key="step1" component={motion.div} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <Typography variant="h5" fontWeight={700} color="text.primary" gutterBottom>
                Welche Klasse?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Klassen 5–8.</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                {[5, 6, 7, 8].map((g, idx) => {
                  const active = grade === g;
                  return (
                    <Box key={g} component={motion.div} {...motionPresets.cardEnter(0.05 * idx)}>
                      <Card
                        onClick={() => setGrade(g)}
                        sx={{
                          cursor: "pointer", p: 3, textAlign: "center",
                          bgcolor: active ? "rgba(139, 108, 255, 0.12)" : "background.paper",
                          border: "1px solid",
                          borderColor: active ? "primary.main" : "divider",
                          boxShadow: active ? "0 0 16px rgba(139, 108, 255, 0.2)" : "none",
                          transition: "all 0.25s",
                          "&:hover": { borderColor: "primary.light", transform: "translateY(-2px)" },
                        }}
                      >
                        <Typography variant="h3" fontWeight={800} color={active ? "primary.light" : "text.primary"}>{g}</Typography>
                        <Typography variant="caption" color="text.secondary">Klasse</Typography>
                      </Card>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </AnimatePresence>

        {error && (
          <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card sx={{ p: 1.5, bgcolor: "rgba(255, 107, 122, 0.1)", border: "1px solid", borderColor: "error.main" }}>
              <Typography variant="body2" color="error.main">{error}</Typography>
            </Card>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box component={motion.div} {...motionPresets.itemEnter(0.1)} sx={{ pt: 3 }}>
        <Button
          variant="contained"
          size="large"
          fullWidth
          endIcon={step === 1 ? undefined : <ArrowForwardIcon />}
          onClick={next}
          disabled={submitting}
          sx={{
            height: 56, borderRadius: 999,
            fontSize: "1rem", fontWeight: 700,
            boxShadow: "0 8px 32px rgba(139, 108, 255, 0.3)",
          }}
        >
          {step === 1 ? (submitting ? "Wird erstellt …" : "Los geht's") : "Weiter"}
        </Button>
      </Box>
    </Container>
  );
}
