"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Container, Box, Typography, Button, Card, CardContent, IconButton,
  Avatar, LinearProgress, Dialog, Chip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CheckIcon from "@mui/icons-material/Check";
import TimerIcon from "@mui/icons-material/Timer";
import PauseIcon from "@mui/icons-material/Pause";
import PlayIcon from "@mui/icons-material/PlayArrow";
import HomeIcon from "@mui/icons-material/Home";
import RefreshIcon from "@mui/icons-material/Refresh";
import QuizIcon from "@mui/icons-material/Quiz";
import BrainIcon from "@mui/icons-material/Psychology";
import ClockIcon from "@mui/icons-material/Schedule";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import WarningIcon from "@mui/icons-material/Warning";
import { useApp, type Screen } from "@/lib/store";
import { motionPresets } from "@/lib/theme";
import { sfxCorrect, sfxWrong, sfxSelect, sfxTickTack, sfxTimeUp } from "@/lib/audio/sfx";

interface ExamQuestion {
  ref: string;
  level: number;
  subject: { code: string; label: string; icon?: string | null; color?: string | null };
  topic: { code: string; label: string };
  difficulty: number;
  text: string;
  options: string[];
}

interface ExamResult {
  results: Array<{
    ref: string; level: number; text: string; options: string[];
    correctIndex: number; answeredIndex: number | null; correct: boolean;
    explanation: string; topic: { code: string; label: string };
    difficulty: number; questionId: number; topicId: number;
  }>;
  correctCount: number;
  total: number;
  percentage: number;
  grade: string;
}

const EXAM_DURATION = 40 * 60;
const LETTERS = ["A", "B", "C", "D"];

export function KlassenarbeitRunScreen() {
  const { payload, navigate, player, pushToast } = useApp();
  const sessionId = payload?.sessionId as string;
  const questions = (payload?.questions as ExamQuestion[]) ?? [];
  const total = questions.length;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [answerChanges, setAnswerChanges] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);

  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseUsed, setPauseUsed] = useState(false);
  const pauseStartRef = useRef<number | null>(null);

  const [questionTimes, setQuestionTimes] = useState<Record<number, number>>({});
  const questionEnterRef = useRef<number>(Date.now());
  const lastQIdxRef = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  function goToQuestion(idx: number) {
    const now = Date.now();
    const elapsed = Math.floor((now - questionEnterRef.current) / 1000);
    setQuestionTimes((prev) => ({
      ...prev,
      [lastQIdxRef.current]: (prev[lastQIdxRef.current] ?? 0) + elapsed,
    }));
    questionEnterRef.current = now;
    lastQIdxRef.current = idx;
    setCurrentIdx(idx);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectAnswer(qIdx: number, optIdx: number) {
    sfxSelect();
    setAnswers((prev) => {
      const wasAnswered = prev[qIdx] != null;
      if (wasAnswered && prev[qIdx] !== optIdx) {
        setAnswerChanges((p) => ({ ...p, [qIdx]: (p[qIdx] ?? 0) + 1 }));
      }
      return { ...prev, [qIdx]: optIdx };
    });
  }

  useEffect(() => {
    if (isPaused || result) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 10 && next > 0) sfxTickTack(next <= 3);
        if (next <= 0) {
          sfxTimeUp();
          void submitExam(true);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, result]);

  useEffect(() => {
    return () => {
      const now = Date.now();
      const elapsed = Math.floor((now - questionEnterRef.current) / 1000);
      setQuestionTimes((prev) => ({
        ...prev,
        [lastQIdxRef.current]: (prev[lastQIdxRef.current] ?? 0) + elapsed,
      }));
    };
  }, []);

  function togglePause() {
    if (isPaused) {
      setIsPaused(false);
    } else {
      if (pauseUsed) {
        pushToast("Du hast deine Pause bereits verwendet.", "info");
        return;
      }
      pauseStartRef.current = Date.now();
      setIsPaused(true);
      setPauseUsed(true);
      pushToast("Pause gestartet. Klicke zum Fortsetzen.", "info");
    }
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  async function submitExam(autoSubmit = false) {
    if (!autoSubmit) {
      const unanswered = total - Object.keys(answers).length;
      if (unanswered > 0) {
        if (!confirm(`Du hast ${unanswered} Frage(n) nicht beantwortet. Trotzdem abgeben?`)) return;
      }
    }
    const now = Date.now();
    const elapsed = Math.floor((now - questionEnterRef.current) / 1000);
    setQuestionTimes((prev) => ({
      ...prev,
      [lastQIdxRef.current]: (prev[lastQIdxRef.current] ?? 0) + elapsed,
    }));

    setSubmitting(true);
    try {
      for (let i = 0; i < total; i++) {
        if (answers[i] != null) {
          await fetch(`/api/klassenarbeit/${sessionId}/answer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questionRef: questions[i].ref, optionIndex: answers[i] }),
          });
        }
      }
      const res = await fetch(`/api/klassenarbeit?sessionId=${sessionId}`);
      const data: ExamResult = await res.json();
      setResult(data);
      if (data.percentage >= 50) sfxCorrect(); else sfxWrong();

      if (player?.name) {
        const { addGameHistory, addSeenQuestion, addToReviewDeck, upsertTopicMastery, updatePlayer } = await import("@/lib/browser-db");
        await updatePlayer(player.name, { xp: (player.xp ?? 0) + data.correctCount * 8 });
        for (const r of data.results) {
          if (r.questionId) await addSeenQuestion(player.name, r.questionId);
          if (r.topicId != null) await upsertTopicMastery(player.name, r.topicId, r.correct);
          if (!r.correct && r.questionId) await addToReviewDeck(player.name, r.questionId);
        }
        await addGameHistory({
          playerName: player.name, mode: "KLASSENARBEIT", level: 0, winnings: 0,
          correct: data.correctCount, total, date: new Date().toISOString(),
        });
      }
    } catch {
      pushToast("Die Klassenarbeit konnte nicht ausgewertet werden.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return <ExamReport
      result={result}
      questionTimes={questionTimes}
      answerChanges={answerChanges}
      totalTime={EXAM_DURATION - timeLeft}
      navigate={navigate}
    />;
  }

  if (questions.length === 0) {
    return (
      <Container maxWidth="sm" sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <QuizIcon sx={{ fontSize: 56, color: "text.secondary", mb: 2 }} />
        <Typography variant="h6" fontWeight={700}>Keine Fragen</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Die Klassenarbeit konnte nicht geladen werden.</Typography>
        <Button variant="outlined" onClick={() => navigate("home")} sx={{ mt: 3 }}>Zum Menü</Button>
      </Container>
    );
  }

  const currentQuestion = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const timeUrgent = timeLeft <= 60;

  return (
    <Container maxWidth="md" sx={{ minHeight: "100vh", py: 3, display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <Box component={motion.div} {...motionPresets.itemEnter(0)} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 2 }}>
        <Button
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => {
            if (confirm("Klassenarbeit wirklich verlassen? Dein Fortschritt geht verloren.")) navigate("home");
          }}
          sx={{ color: "text.secondary" }}
        >
          Verlassen
        </Button>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Chip
            icon={<TimerIcon sx={{ fontSize: 16 }} />}
            label={isPaused ? "PAUSE" : formatTime(timeLeft)}
            size="small"
            sx={{
              bgcolor: isPaused ? "rgba(92, 200, 255, 0.15)" : timeUrgent ? "rgba(255, 107, 122, 0.15)" : "rgba(245, 243, 255, 0.05)",
              color: isPaused ? "info.main" : timeUrgent ? "error.main" : "text.secondary",
              fontWeight: 600,
              animation: timeUrgent && !isPaused ? "pulse 1s infinite" : "none",
              "@keyframes pulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.6 } },
            }}
          />
          <IconButton
            onClick={togglePause}
            disabled={!isPaused && pauseUsed}
            size="small"
            sx={{
              bgcolor: isPaused ? "rgba(61, 219, 164, 0.15)" : "rgba(245, 243, 255, 0.05)",
              color: isPaused ? "success.main" : "text.secondary",
              "&:hover": { bgcolor: "rgba(139, 108, 255, 0.15)" },
            }}
          >
            {isPaused ? <PlayIcon /> : <PauseIcon />}
          </IconButton>
          <Chip label={`${answeredCount}/${total}`} size="small" sx={{ bgcolor: "rgba(245, 243, 255, 0.05)", color: "text.secondary", fontWeight: 600 }} />
        </Box>
      </Box>

      {/* Question navigation dots */}
      <Box component={motion.div} {...motionPresets.itemEnter(0.05)} sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 2 }}>
        {questions.map((_, idx) => {
          const isCurrent = idx === currentIdx;
          const isAnswered = answers[idx] != null;
          return (
            <Box
              key={idx}
              onClick={() => goToQuestion(idx)}
              sx={{
                cursor: "pointer",
                width: 28, height: 28,
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 1,
                fontSize: 10,
                fontFamily: "monospace",
                border: "1px solid",
                borderColor: isCurrent ? "primary.main" : isAnswered ? "success.main" : "divider",
                bgcolor: isCurrent ? "rgba(139, 108, 255, 0.12)" : isAnswered ? "rgba(61, 219, 164, 0.1)" : "transparent",
                color: isCurrent ? "primary.light" : isAnswered ? "success.main" : "text.secondary",
                transition: "all 0.2s",
                "&:hover": { transform: "scale(1.1)" },
              }}
            >
              {idx + 1}
            </Box>
          );
        })}
      </Box>

      {/* Pause overlay */}
      <Dialog open={isPaused} fullWidth maxWidth="xs" PaperProps={{ sx: { bgcolor: "background.paper", backdropFilter: "blur(20px)" } }}>
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Avatar sx={{ width: 64, height: 64, mx: "auto", mb: 2, bgcolor: "rgba(92, 200, 255, 0.15)" }}>
            <PauseIcon sx={{ fontSize: 32, color: "info.main" }} />
          </Avatar>
          <Typography variant="h5" fontWeight={800}>Pause</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Der Timer ist gestoppt. Klicke zum Fortsetzen.</Typography>
          <Button variant="contained" startIcon={<PlayIcon />} onClick={togglePause} sx={{ mt: 3, px: 4, borderRadius: 999 }}>
            Fortsetzen
          </Button>
        </Box>
      </Dialog>

      {/* Question card */}
      <Box ref={scrollRef} component="main" sx={{ flex: 1, overflowY: "auto" }}>
        <AnimatePresence mode="wait">
          <Box
            key={currentIdx}
            component={motion.div}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <Card sx={{ p: 3, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
              <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                  <Chip
                    label={`${currentQuestion.subject.icon ?? "📚"} ${currentQuestion.subject.label}`}
                    size="small"
                    sx={{ bgcolor: "rgba(245, 243, 255, 0.06)", color: "text.primary", fontWeight: 500 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {currentQuestion.topic.label}
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight={600} color="text.primary" sx={{ lineHeight: 1.4, fontSize: "clamp(1.1rem, 1.5vw + 0.6rem, 1.5rem)" }}>
                  {currentQuestion.text}
                </Typography>
                <Box sx={{ mt: 3, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                  {currentQuestion.options.map((opt, optIdx) => {
                    const isSelected = answers[currentIdx] === optIdx;
                    return (
                      <Box
                        key={optIdx}
                        onClick={() => selectAnswer(currentIdx, optIdx)}
                        sx={{
                          cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 1.5,
                          p: 1.5, borderRadius: 2,
                          border: "2px solid",
                          borderColor: isSelected ? "primary.main" : "divider",
                          bgcolor: isSelected ? "rgba(139, 108, 255, 0.1)" : "rgba(245, 243, 255, 0.03)",
                          boxShadow: isSelected ? "0 0 12px rgba(139, 108, 255, 0.2)" : "none",
                          transition: "all 0.2s",
                          "&:hover": { borderColor: "primary.light" },
                        }}
                      >
                        <Box sx={{
                          width: 32, height: 32, shrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          borderRadius: "50%",
                          bgcolor: isSelected ? "primary.main" : "rgba(245, 243, 255, 0.08)",
                          color: isSelected ? "#0E0A28" : "text.secondary",
                          fontSize: 13, fontWeight: 700,
                        }}>
                          {LETTERS[optIdx]}
                        </Box>
                        <Typography variant="body2" sx={{ flex: 1, color: "text.primary" }}>{opt}</Typography>
                        {isSelected && <CheckIcon sx={{ color: "primary.light", fontSize: 18 }} />}
                      </Box>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          </Box>
        </AnimatePresence>
      </Box>

      {/* Footer navigation */}
      <Box component={motion.div} {...motionPresets.itemEnter(0.1)} sx={{ display: "flex", gap: 1, mt: 2 }}>
        <IconButton onClick={() => goToQuestion(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, px: 1.5 }}>
          <ChevronLeftIcon />
        </IconButton>
        {currentIdx < total - 1 ? (
          <Button variant="contained" fullWidth onClick={() => goToQuestion(currentIdx + 1)} endIcon={<ChevronRightIcon />} sx={{ borderRadius: 2 }}>
            Weiter
          </Button>
        ) : (
          <Button variant="contained" fullWidth onClick={() => void submitExam()} disabled={submitting} sx={{ borderRadius: 2 }}>
            {submitting ? "Wird ausgewertet …" : `Abgeben (${answeredCount}/${total})`}
          </Button>
        )}
        <IconButton onClick={() => goToQuestion(Math.min(total - 1, currentIdx + 1))} disabled={currentIdx === total - 1} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, px: 1.5 }}>
          <ChevronRightIcon />
        </IconButton>
      </Box>
    </Container>
  );
}

// ============================================================================
// EXAM REPORT
// ============================================================================

interface ExamReportProps {
  result: ExamResult;
  questionTimes: Record<number, number>;
  answerChanges: Record<number, number>;
  totalTime: number;
  navigate: (s: Screen) => void;
}

function ExamReport({ result, questionTimes, answerChanges, totalTime, navigate }: ExamReportProps) {
  const { results, correctCount, total, percentage, grade } = result;

  const avgTimePerQuestion = total > 0 ? Math.round(totalTime / total) : 0;
  const slowestQuestion = results.reduce((max, _r, idx) => {
    const t = questionTimes[idx] ?? 0;
    return t > (questionTimes[max] ?? 0) ? idx : max;
  }, 0);
  const fastestQuestion = results.reduce((min, _r, idx) => {
    const t = questionTimes[idx] ?? Infinity;
    return t < (questionTimes[min] ?? Infinity) ? idx : min;
  }, 0);
  const changedAnswers = Object.entries(answerChanges).filter(([, count]) => count > 0);
  const changedCount = changedAnswers.length;
  const correctAfterChange = changedAnswers.filter(([idx]) => results[Number(idx)]?.correct).length;
  const wrongAfterChange = changedCount - correctAfterChange;

  const dilemmas = results.filter((_r, idx) => {
    const t = questionTimes[idx] ?? 0;
    return t > avgTimePerQuestion * 2 && (answerChanges[idx] ?? 0) > 0;
  });

  const topicStats: Record<string, { correct: number; total: number; time: number }> = {};
  results.forEach((r, idx) => {
    const key = r.topic.label;
    if (!topicStats[key]) topicStats[key] = { correct: 0, total: 0, time: 0 };
    topicStats[key].total++;
    if (r.correct) topicStats[key].correct++;
    topicStats[key].time += questionTimes[idx] ?? 0;
  });

  const confidence = changedCount === 0 ? "Sehr selbstsicher — du hast keine Antwort geändert." :
    correctAfterChange > wrongAfterChange ? "Gute Selbstkontrolle — Änderungen waren meist richtig." :
    "Unsicherheit erkannt — Änderungen waren oft falsch. Vertraue deinem ersten Instinkt mehr.";

  const pace = avgTimePerQuestion < 30 ? "Sehr schnell — nimm dir mehr Zeit für schwierige Fragen." :
    avgTimePerQuestion > 120 ? "Sehr gründlich — versuche, bei leichten Fragen schneller zu sein." :
    "Gutes Tempo — du balancierst Geschwindigkeit und Genauigkeit gut.";

  const focus = dilemmas.length === 0 ? "Keine offensichtlichen Unsicherheitsmomente — fokussierte Leistung." :
    `${dilemmas.length} Frage(n) mit langem Zögern und Antwortänderung erkannt. Diese Themen solltest du wiederholen.`;

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  }

  const statCards = [
    { icon: <CheckIcon />, label: "Richtig", value: String(correctCount), color: "success.main" as const },
    { icon: <WarningIcon />, label: "Falsch", value: String(total - correctCount), color: "error.main" as const },
    { icon: <ClockIcon />, label: "Ø Zeit/Frage", value: formatTime(avgTimePerQuestion), color: "info.main" as const },
    { icon: <TrendingUpIcon />, label: "Antwort geändert", value: String(changedCount), color: "primary.main" as const },
  ];

  const assessments = [
    { icon: <BrainIcon />, title: "Selbstvertrauen", text: confidence },
    { icon: <ClockIcon />, title: "Tempo", text: pace },
    { icon: <LightbulbIcon />, title: "Fokus", text: focus },
  ];

  return (
    <Container maxWidth="md" sx={{ minHeight: "100vh", py: 4 }}>
      {/* Header */}
      <Box component={motion.div} {...motionPresets.pageEnter} sx={{ textAlign: "center", mb: 4 }}>
        <Avatar sx={{ width: 64, height: 64, mx: "auto", mb: 2, bgcolor: "rgba(139, 108, 255, 0.15)" }}>
          <QuizIcon sx={{ color: "primary.light" }} />
        </Avatar>
        <Typography variant="h3" fontWeight={800} color="text.primary">
          {correctCount} / {total}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Note: <Box component="span" fontWeight={700} color="text.primary">{grade}</Box> · {percentage}%
        </Typography>
      </Box>

      {/* Stats grid */}
      <Box component={motion.div} {...motionPresets.itemEnter(0.1)} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr 1fr" }, gap: 1.5, mb: 4 }}>
        {statCards.map((s, idx) => (
          <Box key={idx} component={motion.div} {...motionPresets.cardEnter(0.05 * idx)}>
            <Card sx={{ p: 2, textAlign: "center", bgcolor: "background.paper" }}>
              <Box sx={{ color: s.color, mb: 0.5, display: "flex", justifyContent: "center" }}>{s.icon}</Box>
              <Typography variant="h5" fontWeight={800} sx={{ color: s.color }}>{s.value}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</Typography>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Psychological assessment */}
      <Box component={motion.div} {...motionPresets.itemEnter(0.2)} sx={{ mb: 4 }}>
        <Typography variant="overline" color="text.secondary" fontWeight={600} sx={{ display: "block", mb: 2 }}>Auswertung</Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {assessments.map((a, idx) => (
            <Box key={idx} component={motion.div} {...motionPresets.itemEnter(0.05 * idx)}>
              <Card sx={{ p: 2, display: "flex", gap: 2, bgcolor: "background.paper" }}>
                <Avatar variant="rounded" sx={{ width: 36, height: 36, bgcolor: "rgba(245, 243, 255, 0.06)", color: "text.secondary" }}>
                  {a.icon}
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={600} color="text.primary">{a.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.6 }}>{a.text}</Typography>
                </Box>
              </Card>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Dilemma detection */}
      {dilemmas.length > 0 && (
        <Box component={motion.div} {...motionPresets.itemEnter(0.3)} sx={{ mb: 4 }}>
          <Typography variant="overline" color="error.main" fontWeight={600} sx={{ display: "block", mb: 2 }}>
            Ikilem Tespiti ({dilemmas.length})
          </Typography>
          <Card sx={{ p: 2, bgcolor: "rgba(255, 107, 122, 0.05)", border: "1px solid", borderColor: "error.main" }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {dilemmas.map((r) => {
                const realIdx = results.indexOf(r);
                return (
                  <Box key={r.ref} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" color="text.secondary">
                      Frage {realIdx + 1}: <Box component="span" color="text.primary">{r.topic.label}</Box>
                    </Typography>
                    <Typography variant="body2" color="error.main" fontWeight={600}>
                      {formatTime(questionTimes[realIdx] ?? 0)} · {answerChanges[realIdx] ?? 0}× geändert
                    </Typography>
                  </Box>
                );
              })}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontSize: 12, lineHeight: 1.6 }}>
              Diese Fragen haben dich besonders lange beschäftigt und du hast deine Antwort geändert.
              Das deutet auf Unsicherheit hin — wiederhole diese Themen!
            </Typography>
          </Card>
        </Box>
      )}

      {/* Topic breakdown */}
      <Box component={motion.div} {...motionPresets.itemEnter(0.35)} sx={{ mb: 4 }}>
        <Typography variant="overline" color="text.secondary" fontWeight={600} sx={{ display: "block", mb: 2 }}>Themen-Übersicht</Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {Object.entries(topicStats).map(([topic, stats], idx) => {
            const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
            return (
              <Box key={topic} component={motion.div} {...motionPresets.itemEnter(0.03 * idx)}>
                <Card sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 2, bgcolor: "background.paper" }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={500} color="text.primary">{topic}</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{
                        mt: 0.75, height: 8, borderRadius: 4,
                        bgcolor: "rgba(245, 243, 255, 0.08)",
                        "& .MuiLinearProgress-bar": {
                          bgcolor: pct >= 50 ? "success.main" : "error.main",
                          borderRadius: 4,
                        },
                      }}
                    />
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="body2" fontWeight={700} color="text.primary">{stats.correct}/{stats.total}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatTime(stats.time)}</Typography>
                  </Box>
                </Card>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Per-question detail */}
      <Box component={motion.div} {...motionPresets.itemEnter(0.4)} sx={{ mb: 4 }}>
        <Typography variant="overline" color="text.secondary" fontWeight={600} sx={{ display: "block", mb: 2 }}>Frage-Detail</Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {results.map((r, idx) => {
            const time = questionTimes[idx] ?? 0;
            const changes = answerChanges[idx] ?? 0;
            const isSlow = time > avgTimePerQuestion * 1.5;
            return (
              <Box key={r.ref} component={motion.div} {...motionPresets.itemEnter(0.02 * idx)}>
                <Card sx={{ p: 2, bgcolor: r.correct ? "rgba(61, 219, 164, 0.03)" : "rgba(255, 107, 122, 0.03)", border: "1px solid", borderColor: r.correct ? "success.main" : "error.main" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Frage {idx + 1} · {r.topic.label}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      {changes > 0 && <Chip label={`${changes}× geändert`} size="small" sx={{ bgcolor: "rgba(255, 107, 122, 0.15)", color: "error.main", fontSize: 10, height: 20 }} />}
                      {isSlow && <Chip label="langsam" size="small" sx={{ bgcolor: "rgba(92, 200, 255, 0.15)", color: "info.main", fontSize: 10, height: 20 }} />}
                      <Typography variant="body2" fontWeight={700} color={r.correct ? "success.main" : "error.main"}>
                        {r.correct ? "✓" : "✕"}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.6, mb: 1 }}>{r.text}</Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    {r.options.map((opt, optIdx) => {
                      const isCorrect = optIdx === r.correctIndex;
                      const isAnswered = optIdx === r.answeredIndex;
                      return (
                        <Box key={optIdx} sx={{
                          display: "flex", alignItems: "center", gap: 1,
                          px: 1.5, py: 0.5, borderRadius: 1,
                          bgcolor: isCorrect ? "rgba(61, 219, 164, 0.15)" : isAnswered ? "rgba(255, 107, 122, 0.15)" : "transparent",
                        }}>
                          <Typography variant="caption" fontFamily="monospace" color={isCorrect ? "success.main" : isAnswered ? "error.main" : "text.secondary"}>{LETTERS[optIdx]}</Typography>
                          <Typography variant="body2" color={isCorrect ? "success.main" : isAnswered ? "error.main" : "text.secondary"}>{opt}</Typography>
                          {isCorrect && <CheckIcon sx={{ ml: "auto", color: "success.main", fontSize: 16 }} />}
                        </Box>
                      );
                    })}
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderTop: "1px solid", borderColor: "divider", pt: 1, mt: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1, fontSize: 12, lineHeight: 1.6 }}>{r.explanation}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 2, whiteSpace: "nowrap" }}>{formatTime(time)}</Typography>
                  </Box>
                </Card>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Actions */}
      <Box component={motion.div} {...motionPresets.itemEnter(0.5)} sx={{ display: "flex", gap: 1.5, mt: 2 }}>
        <Button variant="outlined" fullWidth startIcon={<RefreshIcon />} onClick={() => navigate("klassenarbeit-setup")} sx={{ borderRadius: 2, py: 1.5 }}>
          Neue Klassenarbeit
        </Button>
        <Button variant="outlined" fullWidth startIcon={<HomeIcon />} onClick={() => navigate("home")} sx={{ borderRadius: 2, py: 1.5 }}>
          Zum Menü
        </Button>
      </Box>
    </Container>
  );
}
