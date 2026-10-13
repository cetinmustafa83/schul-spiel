"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Container, Box, Typography, Button, Card, CardContent,
  ToggleButtonGroup, ToggleButton, Chip, Skeleton, IconButton, Avatar,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import QuizIcon from "@mui/icons-material/Quiz";
import CheckIcon from "@mui/icons-material/Check";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import InfoIcon from "@mui/icons-material/Info";
import { useApp } from "@/lib/store";
import { motionPresets } from "@/lib/theme";

interface Topic {
  id: number;
  code: string;
  label: string;
}
interface Subject {
  id: number;
  code: string;
  label: string;
  icon: string | null;
  color: string | null;
  topics: Topic[];
}

const EXAM_LENGTHS = [20, 30, 45] as const;

export function KlassenarbeitSetupScreen() {
  const { navigate, setPayload, player, pushToast } = useApp();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [length, setLength] = useState<number>(20);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/meta/subjects", { cache: "no-store" });
        const data = await res.json();
        setSubjects(data.items ?? []);
      } catch {
        pushToast("Fächer konnten nicht geladen werden.", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [pushToast]);

  function toggleSubject(code: string) {
    setSelectedSubject((prev) => {
      const next = code === prev ? null : code;
      setSelectedTopics(new Set());
      return next;
    });
  }

  function toggleTopic(code: string) {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  const activeSubject = subjects.find((s) => s.code === selectedSubject);

  async function startExam() {
    if (!selectedSubject) {
      pushToast("Bitte wähle ein Fach.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/klassenarbeit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: player?.name,
          schoolType: player?.schoolType,
          grade: player?.grade,
          subjectCode: selectedSubject,
          topicFilter: selectedTopics.size > 0 ? Array.from(selectedTopics) : undefined,
          length,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        pushToast(data.message ?? "Klassenarbeit konnte nicht gestartet werden.", "error");
        setSubmitting(false);
        return;
      }
      setPayload({
        sessionId: data.sessionId,
        questions: data.questions,
        length: data.length,
        subjectCode: data.subjectCode,
      });
      navigate("klassenarbeit-run");
    } catch {
      pushToast("Etwas ist schiefgelaufen.", "error");
      setSubmitting(false);
    }
  }

  return (
    <Container maxWidth="md" sx={{ minHeight: "100vh", py: 4, pb: 12 }}>
      {/* Header */}
      <Box component={motion.div} {...motionPresets.itemEnter(0)} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("home")}
          sx={{ color: "text.secondary", borderRadius: 999 }}
        >
          Zurück
        </Button>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
          <QuizIcon fontSize="small" />
          <Typography variant="overline" fontWeight={600}>Klassenarbeit</Typography>
        </Box>
      </Box>

      {/* Title */}
      <Box component={motion.div} {...motionPresets.pageEnter} sx={{ textAlign: "center", mb: 5 }}>
        <Typography variant="h4" fontWeight={800} color="text.primary">
          Klassenarbeit simulieren
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 480, mx: "auto" }}>
          Wähle ein Fach und beantworte alle Fragen ohne sofortiges Feedback.
          Am Ende erhältst du deine Note und kannst jede Frage überprüfen.
        </Typography>
      </Box>

      {/* Subject selection */}
      <Box component={motion.div} {...motionPresets.itemEnter(0.15)} sx={{ mb: 4 }}>
        <Typography variant="overline" color="text.secondary" fontWeight={600} sx={{ display: "block", mb: 2 }}>
          Fach wählen
        </Typography>
        {loading ? (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr" }, gap: 1.5 }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={110} />
            ))}
          </Box>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr" }, gap: 1.5 }}>
            {subjects.map((s, idx) => {
              const active = selectedSubject === s.code;
              return (
                <Box key={s.id} component={motion.div} {...motionPresets.cardEnter(0.05 * idx)}>
                  <Card
                    onClick={() => toggleSubject(s.code)}
                    sx={{
                      cursor: "pointer",
                      p: 2,
                      height: "100%",
                      bgcolor: active ? "rgba(139, 108, 255, 0.12)" : "background.paper",
                      border: "1px solid",
                      borderColor: active ? "primary.main" : "divider",
                      boxShadow: active ? "0 0 20px rgba(139, 108, 255, 0.25)" : "none",
                      transition: "all 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
                      "&:hover": {
                        borderColor: "primary.light",
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    <CardContent sx={{ p: 0, "&:last-child": { pb: 0 }, textAlign: "center" }}>
                      <Typography sx={{ fontSize: 32, mb: 1 }} aria-hidden>{s.icon ?? "📚"}</Typography>
                      <Typography variant="body2" fontWeight={600} color="text.primary">{s.label}</Typography>
                    </CardContent>
                  </Card>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Topic selection */}
      <AnimatePresence>
        {activeSubject && activeSubject.topics.length > 0 && (
          <Box component={motion.div} {...motionPresets.pageEnter} sx={{ mb: 4 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="overline" color="text.secondary" fontWeight={600}>
                Themen
              </Typography>
              <Typography variant="caption" color="text.secondary">
                (optional — leer = alle)
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {activeSubject.topics.map((t, idx) => {
                const active = selectedTopics.has(t.code);
                return (
                  <Box key={t.code} component={motion.div} {...motionPresets.pop} transition={{ ...motionPresets.pop.transition, delay: 0.03 * idx }}>
                    <Chip
                      label={t.label}
                      onClick={() => toggleTopic(t.code)}
                      deleteIcon={active ? <CheckIcon /> : undefined}
                      onDelete={active ? () => toggleTopic(t.code) : undefined}
                      variant={active ? "filled" : "outlined"}
                      sx={{
                        borderColor: active ? "primary.main" : "divider",
                        bgcolor: active ? "rgba(139, 108, 255, 0.15)" : "transparent",
                        color: active ? "primary.light" : "text.secondary",
                        "&:hover": { borderColor: "primary.light" },
                      }}
                    />
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </AnimatePresence>

      {/* Exam length */}
      <Box component={motion.div} {...motionPresets.itemEnter(0.3)} sx={{ mb: 4 }}>
        <Typography variant="overline" color="text.secondary" fontWeight={600} sx={{ display: "block", mb: 2 }}>
          Anzahl Fragen
        </Typography>
        <ToggleButtonGroup
          value={length}
          exclusive
          onChange={(_, v) => v && setLength(v)}
          sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1.5, width: "100%" }}
        >
          {EXAM_LENGTHS.map((n) => (
            <ToggleButton
              key={n}
              value={n}
              sx={{
                flexDirection: "column",
                borderColor: "divider",
                py: 2,
                borderRadius: "16px !important",
                border: "1px solid",
                color: "text.secondary",
                "&.Mui-selected": {
                  bgcolor: "rgba(139, 108, 255, 0.12)",
                  borderColor: "primary.main",
                  color: "primary.light",
                },
              }}
            >
              <Typography variant="h5" fontWeight={800}>{n}</Typography>
              <Typography variant="caption">Fragen</Typography>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Info banner */}
      <Box component={motion.div} {...motionPresets.itemEnter(0.4)}>
        <Card sx={{ p: 2, bgcolor: "background.paper", borderLeft: "3px solid", borderColor: "primary.main" }}>
          <CardContent sx={{ p: 0, "&:last-child": { pb: 0 }, display: "flex", gap: 2 }}>
            <InfoIcon sx={{ color: "text.secondary", mt: 0.5 }} />
            <Box>
              <Typography variant="body2" fontWeight={600} color="text.primary">
                So funktioniert die Klassenarbeit
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.6 }}>
                Du erhältst alle Fragen auf einmal und kannst frei zwischen ihnen navigieren.
                Es gibt kein sofortiges Feedback — erst am Ende siehst du, was richtig und falsch war.
                Die Fragen gehen von leicht nach schwer.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Sticky footer */}
      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          backdropFilter: "blur(16px)",
          bgcolor: "rgba(14, 10, 40, 0.85)",
          borderTop: "1px solid",
          borderColor: "divider",
          p: 2,
        }}
      >
        <Container maxWidth="md" sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ flex: 1, display: { xs: "none", sm: "block" } }}>
            <Typography variant="overline" color="text.secondary">Prüfung</Typography>
            <Typography variant="body2" fontWeight={600} color="text.primary">
              {length} Fragen · {selectedSubject ? subjects.find((s) => s.code === selectedSubject)?.label : "Fach wählen"}
              {selectedTopics.size > 0 && ` · ${selectedTopics.size} Themen`}
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            color="primary"
            disabled={submitting || !selectedSubject}
            onClick={startExam}
            endIcon={<ChevronRightIcon />}
            sx={{ flex: { xs: 1, sm: "none" }, px: 5, borderRadius: 999 }}
          >
            {submitting ? "Wird vorbereitet …" : "Klassenarbeit starten"}
          </Button>
        </Container>
      </Box>
    </Container>
  );
}
