"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Container, Box, Typography, Button, Card, CardContent,
  Switch, Select, MenuItem, Slider, TextField, IconButton, Divider,
  FormControl, InputLabel, Dialog, DialogTitle, DialogContent, DialogActions,
  Avatar, LinearProgress, Chip, Collapse, Tooltip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VisibilityIcon from "@mui/icons-material/Visibility";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import LogoutIcon from "@mui/icons-material/Logout";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import TopicIcon from "@mui/icons-material/Topic";
import { useApp } from "@/lib/store";
import { SCHOOL_TYPE_LABELS } from "@/lib/german";
import { updatePlayer, deletePlayer, exportPlayerData, getDailyStats, type DailyStatDoc } from "@/lib/browser-db";
import { motionPresets } from "@/lib/theme";

const SCHOOL_TYPES = [
  { code: "HS", label: "Hauptschule" },
  { code: "RS", label: "Realschule" },
  { code: "SEK", label: "Sekundarschule" },
  { code: "GE", label: "Gesamtschule" },
  { code: "GY", label: "Gymnasium" },
];
const GRADES = [5, 6, 7, 8];
const ADMIN_PIN = "1234";

export function SettingsScreen() {
  const { navigate, player, setPlayer, prefs, setPrefs, pushToast } = useApp();
  const [schoolType, setSchoolType] = useState(player?.schoolType ?? "GY");
  const [grade, setGrade] = useState(player?.grade ?? 5);
  const [glmApiKey, setGlmApiKey] = useState("");
  const [glmModel, setGlmModel] = useState("glm-4.7");
  const [showApiKey, setShowApiKey] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dailyStats, setDailyStats] = useState<DailyStatDoc[]>([]);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    const key = localStorage.getItem("glm-api-key");
    const model = localStorage.getItem("glm-model");
    if (key) setGlmApiKey(key);
    if (model) setGlmModel(model);
  }, []);

  useEffect(() => {
    if (!player?.name) return;
    void (async () => {
      try {
        const stats = await getDailyStats(player.name);
        setDailyStats(stats);
      } catch { /* ignore */ }
    })();
  }, [player?.name]);

  function saveGlmKey() {
    localStorage.setItem("glm-api-key", glmApiKey);
    localStorage.setItem("glm-model", glmModel);
    pushToast("GLM API-Key gespeichert.", "success");
  }

  async function updateSchoolType(v: string) {
    setSchoolType(v);
    if (player?.name) {
      await updatePlayer(player.name, { schoolType: v });
      setPlayer({ ...player, schoolType: v });
      pushToast("Gespeichert.", "success");
    }
  }

  async function updateGrade(v: number) {
    setGrade(v);
    if (player?.name) {
      await updatePlayer(player.name, { grade: v });
      setPlayer({ ...player, grade: v });
      pushToast("Gespeichert.", "success");
    }
  }

  async function downloadData() {
    if (!player?.name) return;
    try {
      const data = await exportPlayerData(player.name);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wissensgipfel-${player.name}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      pushToast("Daten heruntergeladen.", "success");
    } catch {
      pushToast("Export fehlgeschlagen.", "error");
    }
  }

  async function deleteAccount() {
    if (!player?.name) return;
    setDeleting(true);
    try {
      await deletePlayer(player.name);
      if (typeof window !== "undefined") localStorage.removeItem("wissensgipfel-last-player");
      setPlayer(null);
      pushToast("Dein Konto wurde gelöscht.", "success");
      navigate("landing");
    } catch {
      pushToast("Löschung fehlgeschlagen.", "error");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  }

  function switchPlayer() {
    if (typeof window !== "undefined") localStorage.removeItem("wissensgipfel-last-player");
    setPlayer(null);
    navigate("landing");
  }

  function submitPin() {
    if (pinInput === ADMIN_PIN) {
      setAdminUnlocked(true);
      setPinDialogOpen(false);
      setPinInput("");
      setPinError(false);
      pushToast("Admin-Modus freigeschaltet.", "success");
    } else {
      setPinError(true);
    }
  }

  function formatDay(day: string): string {
    try {
      const d = new Date(day);
      return d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" });
    } catch {
      return day;
    }
  }

  return (
    <Container maxWidth="sm" sx={{ minHeight: "100vh", py: 4 }}>
      {/* Header */}
      <Box component={motion.div} {...motionPresets.itemEnter(0)} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("home")} sx={{ color: "text.secondary" }}>
          Zurück
        </Button>
        <Typography variant="overline" fontWeight={600} color="text.secondary">Einstellungen</Typography>
      </Box>

      {/* Account section */}
      <Box component={motion.div} {...motionPresets.cardEnter(0.1)} sx={{ mb: 3 }}>
        <Card sx={{ p: 3, bgcolor: "background.paper" }}>
          <Typography variant="overline" color="text.secondary" fontWeight={600} sx={{ display: "block", mb: 2 }}>Konto</Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box>
              <Typography variant="body2" fontWeight={500} color="text.primary" sx={{ mb: 0.5 }}>Name</Typography>
              <Box sx={{ px: 2, py: 1.5, borderRadius: 1.5, border: "1px solid", borderColor: "divider", bgcolor: "rgba(245, 243, 255, 0.03)" }}>
                <Typography variant="body2">{player?.name}</Typography>
              </Box>
            </Box>
            <FormControl fullWidth size="small">
              <InputLabel>Schulform</InputLabel>
              <Select value={schoolType} label="Schulform" onChange={(e) => void updateSchoolType(e.target.value)}>
                {SCHOOL_TYPES.map((st) => <MenuItem key={st.code} value={st.code}>{st.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Klasse</InputLabel>
              <Select value={String(grade)} label="Klasse" onChange={(e) => void updateGrade(Number(e.target.value))}>
                {GRADES.map((g) => <MenuItem key={g} value={String(g)}>Klasse {g}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        </Card>
      </Box>

      {/* Sound & Display section */}
      <Box component={motion.div} {...motionPresets.cardEnter(0.15)} sx={{ mb: 3 }}>
        <Card sx={{ p: 3, bgcolor: "background.paper" }}>
          <Typography variant="overline" color="text.secondary" fontWeight={600} sx={{ display: "block", mb: 2 }}>Anzeige & Sound</Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <ToggleRow icon={<VolumeUpIcon />} label="Sound-Effekte" description="Kurze Töne bei Antworten und Aktionen." checked={prefs.sound} onChange={(v) => setPrefs({ sound: v })} />
            <Divider />
            <ToggleRow icon={<VisibilityIcon />} label="Reduzierte Bewegung" description="Weniger Animationen." checked={prefs.reducedMotion} onChange={(v) => setPrefs({ reducedMotion: v })} />
            <Divider />
            <ToggleRow icon={<TextFieldsIcon />} label="Legasthenie-Modus" description="Deutlichere Schriften und mehr Zeilenabstand." checked={prefs.dyslexia} onChange={(v) => setPrefs({ dyslexia: v })} />
            <Divider />
            <Box sx={{ py: 1.5 }}>
              <Typography variant="body2" fontWeight={500} color="text.primary" sx={{ mb: 1 }}>Textgröße: {prefs.textScale}%</Typography>
              <Slider
                value={prefs.textScale}
                min={100} max={150} step={25}
                onChange={(_, v) => setPrefs({ textScale: v as number })}
                marks={[
                  { value: 100, label: "100%" },
                  { value: 125, label: "125%" },
                  { value: 150, label: "150%" },
                ]}
                sx={{ color: "primary.main" }}
              />
            </Box>
          </Box>
        </Card>
      </Box>

      {/* Daily report section */}
      <Box component={motion.div} {...motionPresets.cardEnter(0.2)} sx={{ mb: 3 }}>
        <Card sx={{ p: 3, bgcolor: "background.paper" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <AssessmentIcon sx={{ color: "primary.light" }} />
            <Typography variant="overline" color="text.secondary" fontWeight={600}>Tagesbericht (max. 5 Tage)</Typography>
          </Box>
          {dailyStats.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Noch keine Daten. Starte eine Klassenarbeit, um deinen Fortschritt zu sehen!
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {dailyStats.map((stat, idx) => {
                const pct = stat.questionsAnswered > 0 ? Math.round((stat.correctCount / stat.questionsAnswered) * 100) : 0;
                return (
                  <Box key={stat.day} component={motion.div} {...motionPresets.itemEnter(0.03 * idx)}>
                    <Card sx={{ p: 2, bgcolor: "rgba(245, 243, 255, 0.03)", border: "1px solid", borderColor: "divider" }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                        <Typography variant="body2" fontWeight={600} color="text.primary">
                          {formatDay(stat.day)}
                        </Typography>
                        <Chip
                          label={`${pct}%`}
                          size="small"
                          sx={{
                            bgcolor: pct >= 50 ? "rgba(61, 219, 164, 0.15)" : "rgba(255, 107, 122, 0.15)",
                            color: pct >= 50 ? "success.main" : "error.main",
                            fontWeight: 700,
                          }}
                        />
                      </Box>
                      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                        <StatItem icon={<AssessmentIcon />} label="Fragen" value={String(stat.questionsAnswered)} />
                        <StatItem icon={<TopicIcon />} label="Themen" value={String(stat.topicsCovered.length)} />
                        <StatItem icon={<CheckCircleIcon />} label="Richtig" value={String(stat.correctCount)} color="success.main" />
                        <StatItem icon={<CancelIcon />} label="Falsch" value={String(stat.wrongCount)} color="error.main" />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{
                          mt: 1.5, height: 6, borderRadius: 3,
                          bgcolor: "rgba(245, 243, 255, 0.08)",
                          "& .MuiLinearProgress-bar": {
                            bgcolor: pct >= 50 ? "success.main" : "error.main",
                            borderRadius: 3,
                          },
                        }}
                      />
                    </Card>
                  </Box>
                );
              })}
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", mt: 1, opacity: 0.6 }}>
                Berichte werden nach 5 Tagen automatisch gelöscht.
              </Typography>
            </Box>
          )}
        </Card>
      </Box>

      {/* Admin section (PIN-protected) */}
      <Box component={motion.div} {...motionPresets.cardEnter(0.25)} sx={{ mb: 3 }}>
        <Card sx={{ p: 3, bgcolor: "background.paper" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: adminUnlocked ? 2 : 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <AdminPanelSettingsIcon sx={{ color: adminUnlocked ? "primary.main" : "text.secondary" }} />
              <Typography variant="overline" color="text.secondary" fontWeight={600}>Admin-Bereich</Typography>
            </Box>
            {!adminUnlocked && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<VpnKeyIcon />}
                onClick={() => { setPinDialogOpen(true); setPinInput(""); setPinError(false); }}
              >
                PIN eingeben
              </Button>
            )}
          </Box>

          <Collapse in={adminUnlocked}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 2 }}>
              {/* GLM AI */}
              <Box>
                <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ mb: 1 }}>KI-Analyse (GLM)</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                  Optional: API-Key bleibt lokal in deinem Browser.
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <TextField
                      type={showApiKey ? "text" : "password"}
                      value={glmApiKey}
                      onChange={(e) => setGlmApiKey(e.target.value)}
                      placeholder="API-Key eingeben"
                      size="small"
                      fullWidth
                      sx={{ fontFamily: "monospace" }}
                    />
                    <IconButton onClick={() => setShowApiKey((s) => !s)} size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
                      {showApiKey ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </Box>
                  <FormControl fullWidth size="small">
                    <InputLabel>Modell</InputLabel>
                    <Select value={glmModel} label="Modell" onChange={(e) => setGlmModel(e.target.value)}>
                      <MenuItem value="glm-4.7">GLM-4.7 (Empfohlen)</MenuItem>
                      <MenuItem value="glm-4.6">GLM-4.6</MenuItem>
                      <MenuItem value="glm-4-flash">GLM-4-Flash (Kostenlos)</MenuItem>
                      <MenuItem value="glm-4v">GLM-4V (Vision)</MenuItem>
                    </Select>
                  </FormControl>
                  <Button variant="contained" startIcon={<VpnKeyIcon />} onClick={saveGlmKey} fullWidth>
                    API-Key speichern
                  </Button>
                </Box>
              </Box>

              <Divider />

              {/* Data management */}
              <Box>
                <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ mb: 1 }}>Daten</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                  Alle Daten werden lokal gespeichert. Du kannst sie herunterladen oder löschen.
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => void downloadData()} fullWidth>
                    Meine Daten herunterladen (JSON)
                  </Button>
                  <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteDialogOpen(true)} fullWidth>
                    Konto löschen
                  </Button>
                </Box>
              </Box>
            </Box>
          </Collapse>
        </Card>
      </Box>

      {/* Player switch */}
      <Box component={motion.div} {...motionPresets.cardEnter(0.3)}>
        <Card sx={{ p: 3, bgcolor: "background.paper" }}>
          <Button variant="outlined" startIcon={<LogoutIcon />} onClick={switchPlayer} fullWidth>
            Spieler wechseln
          </Button>
        </Card>
      </Box>

      {/* PIN dialog */}
      <Dialog open={pinDialogOpen} onClose={() => setPinDialogOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { bgcolor: "background.paper" } } }}>
        <DialogTitle>Admin-PIN</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Bitte gib die Admin-PIN ein, um den Admin-Bereich freizuschalten.
          </Typography>
          <TextField
            type="password"
            value={pinInput}
            onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") submitPin(); }}
            placeholder="PIN"
            fullWidth
            autoFocus
            error={pinError}
            helperText={pinError ? "Falsche PIN" : undefined}
            slotProps={{ htmlInput: { maxLength: 4, inputMode: "numeric" as const } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPinDialogOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={submitPin}>Freischalten</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} slotProps={{ paper: { sx: { bgcolor: "background.paper" } } }}>
        <DialogTitle>Wirklich löschen?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Alle Spielstände und Statistiken werden gelöscht. Nicht rückgängig.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Abbrechen</Button>
          <Button color="error" variant="contained" onClick={() => void deleteAccount()} disabled={deleting}>
            {deleting ? "Lösche …" : "Endgültig löschen"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Footer */}
      {player && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 3, opacity: 0.5 }}>
          {SCHOOL_TYPE_LABELS[player.schoolType] ?? player.schoolType} · Klasse {player.grade} · {prefs.sound ? "Sound an" : "Sound aus"}
        </Typography>
      )}
    </Container>
  );
}

function ToggleRow({
  icon, label, description, checked, onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, py: 1.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, minWidth: 0 }}>
        <Avatar variant="rounded" sx={{ width: 32, height: 32, bgcolor: "rgba(245, 243, 255, 0.06)", color: "text.secondary" }}>
          {icon}
        </Avatar>
        <Box>
          <Typography variant="body2" fontWeight={500} color="text.primary">{label}</Typography>
          <Typography variant="caption" color="text.secondary">{description}</Typography>
        </Box>
      </Box>
      <Switch checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </Box>
  );
}

function StatItem({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color?: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Box sx={{ color: color ?? "text.secondary", display: "flex" }}>{icon}</Box>
      <Typography variant="body2" fontWeight={700} sx={{ color: color ?? "text.primary" }}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Box>
  );
}
