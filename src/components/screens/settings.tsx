"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Download, Trash2, Volume2, Eye, LogOut, Key, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SCHOOL_TYPE_LABELS } from "@/lib/german";
import { updatePlayer, deletePlayer, exportPlayerData } from "@/lib/browser-db";
import { useScreenTransition } from "@/lib/animations/gsap-hooks";

const SCHOOL_TYPES = [
  { code: "HS", label: "Hauptschule" },
  { code: "RS", label: "Realschule" },
  { code: "SEK", label: "Sekundarschule" },
  { code: "GE", label: "Gesamtschule" },
  { code: "GY", label: "Gymnasium" },
];
const GRADES = [5, 6, 7, 8];

export function SettingsScreen() {
  const { navigate, player, setPlayer, prefs, setPrefs, pushToast } = useApp();
  const ref = useScreenTransition<HTMLDivElement>();
  const [schoolType, setSchoolType] = useState(player?.schoolType ?? "GY");
  const [grade, setGrade] = useState(player?.grade ?? 5);
  const [glmApiKey, setGlmApiKey] = useState("");
  const [glmModel, setGlmModel] = useState("glm-4.7");
  const [showApiKey, setShowApiKey] = useState(false);

  // Load GLM API key from localStorage
  useEffect(() => {
    const key = localStorage.getItem("glm-api-key");
    const model = localStorage.getItem("glm-model");
    if (key) setGlmApiKey(key);
    if (model) setGlmModel(model);
  }, []);

  function saveGlmKey() {
    localStorage.setItem("glm-api-key", glmApiKey);
    localStorage.setItem("glm-model", glmModel);
    pushToast("GLM API-Key gespeichert.", "success");
  }
  const [deleting, setDeleting] = useState(false);

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
      if (typeof window !== "undefined") {
        localStorage.removeItem("wissensgipfel-last-player");
      }
      setPlayer(null);
      pushToast("Dein Konto wurde gelöscht.", "success");
      navigate("landing");
    } catch {
      pushToast("Löschung fehlgeschlagen.", "error");
    } finally {
      setDeleting(false);
    }
  }

  function switchPlayer() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("wissensgipfel-last-player");
    }
    setPlayer(null);
    navigate("landing");
  }

  return (
    <div ref={ref} className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("home")}
          className="tap-target inline-flex items-center gap-1.5 rounded-full border border-border bg-bg1/40 px-3 py-1.5 text-sm text-ink-dim backdrop-blur hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Zurück
        </button>
        <span className="font-display text-sm font-semibold uppercase tracking-wider text-ink-dim">
          Einstellungen
        </span>
      </header>

      <main className="flex flex-col gap-6">
        {/* Account section */}
        <Section title="Konto">
          <Row label="Name">
            <div className="rounded-lg border border-border bg-bg2/30 px-3 py-2 font-display text-sm text-ink">
              {player?.name}
            </div>
          </Row>
          <Row label="Schulform">
            <Select value={schoolType} onValueChange={(v) => void updateSchoolType(v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCHOOL_TYPES.map((st) => (
                  <SelectItem key={st.code} value={st.code}>{st.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Klasse">
            <Select value={String(grade)} onValueChange={(v) => void updateGrade(Number(v))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GRADES.map((g) => (
                  <SelectItem key={g} value={String(g)}>Klasse {g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
        </Section>

        {/* Sound & Display section */}
        <Section title="Anzeige & Sound">
          <ToggleRow
            icon={<Volume2 className="h-4 w-4 text-ink-dim" />}
            label="Sound-Effekte"
            description="Kurze Töne bei Antworten, Jokern und Aktionen."
            checked={prefs.sound}
            onCheckedChange={(v) => setPrefs({ sound: v })}
          />
          <ToggleRow
            icon={<Eye className="h-4 w-4 text-ink-dim" />}
            label="Reduzierte Bewegung"
            description="Weniger Animationen, keine Bildschirm-Erschütterung."
            checked={prefs.reducedMotion}
            onCheckedChange={(v) => setPrefs({ reducedMotion: v })}
          />
          <ToggleRow
            label="Legasthenie-Modus"
            description="Deutlichere Schriften und mehr Zeilenabstand."
            checked={prefs.dyslexia}
            onCheckedChange={(v) => setPrefs({ dyslexia: v })}
          />
          <Row label={`Textgröße: ${prefs.textScale}%`}>
            <Slider
              value={[prefs.textScale]}
              min={100}
              max={150}
              step={25}
              onValueChange={(arr) => {
                const v = arr[0];
                if (typeof v === "number") setPrefs({ textScale: v });
              }}
            />
            <div className="flex justify-between text-xs text-ink-dim">
              <span>100%</span><span>125%</span><span>150%</span>
            </div>
          </Row>
        </Section>

        {/* Data & Privacy section */}
        <Section title="Daten & Datenschutz">
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-ink-dim">
              Alle deine Daten werden lokal in deinem Browser gespeichert. Nichts wird an einen Server gesendet.
              Du kannst deine Daten jederzeit herunterladen oder vollständig löschen.
            </p>
            <Button variant="outline" className="w-full justify-start" onClick={() => void downloadData()}>
              <Download className="mr-2 h-4 w-4" /> Meine Daten herunterladen (JSON)
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full justify-start">
                  <Trash2 className="mr-2 h-4 w-4" /> Konto löschen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-bg1 border-border backdrop-blur-xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Wirklich löschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Diese Aktion kann nicht rückgängig gemacht werden. Alle deine
                    Spielstände, Statistiken und der Wiederholungsstapel werden gelöscht.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-coral text-white hover:bg-coral/90"
                    onClick={() => void deleteAccount()}
                    disabled={deleting}
                  >
                    {deleting ? "Lösche …" : "Endgültig löschen"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Section>

        {/* GLM AI section */}
        <Section title="KI-Analyse (GLM)">
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-ink-dim">
              Optional: Verbinde ein GLM-Modell für KI-gestützte Auswertungen,
              automatisierte Empfehlungen und personalisierte Lernpfade.
              Der API-Key bleibt lokal in deinem Browser — er wird nicht an einen Server gesendet.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label>GLM API-Key</Label>
              <div className="flex gap-2">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={glmApiKey}
                  onChange={(e) => setGlmApiKey(e.target.value)}
                  placeholder="API-Key eingeben"
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 px-3"
                  onClick={() => setShowApiKey((s) => !s)}
                >
                  {showApiKey ? "Verbergen" : "Zeigen"}
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Modell</Label>
              <Select value={glmModel} onValueChange={setGlmModel}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="glm-4.7">GLM-4.7 (Empfohlen)</SelectItem>
                  <SelectItem value="glm-4.6">GLM-4.6</SelectItem>
                  <SelectItem value="glm-4-flash">GLM-4-Flash (Kostenlos)</SelectItem>
                  <SelectItem value="glm-4v">GLM-4V (Vision)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-bg2/20 p-3">
              <Sparkles className="h-4 w-4 shrink-0 text-ink-dim" />
              <p className="text-xs leading-relaxed text-ink-dim">
                Mit GLM erhältst du detaillierte Klassenarbeits-Auswertungen mit
                psychologischer Einschätzung, Lernpfad-Empfehlungen und
                automatisierten Themenvorschlägen. Bilder über Perchance werden
                für visuelle Illustrationen im Bericht generiert.
              </p>
            </div>
            <Button onClick={saveGlmKey} className="w-full">
              <Key className="mr-2 h-4 w-4" /> API-Key speichern
            </Button>
          </div>
        </Section>

        {/* Player switch section */}
        <Section title="Spieler wechseln">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink-dim">
              Wechsle zu einem anderen Spieler. Dein aktueller Fortschritt bleibt erhalten.
            </p>
            <Button variant="outline" className="w-full justify-start" onClick={switchPlayer}>
              <LogOut className="mr-2 h-4 w-4" /> Spieler wechseln
            </Button>
          </div>
        </Section>
      </main>

      {player && (
        <p className="mt-6 text-center text-[11px] text-ink-dim/50">
          {SCHOOL_TYPE_LABELS[player.schoolType] ?? player.schoolType} · Klasse {player.grade} · {prefs.sound ? "Sound an" : "Sound aus"}
        </p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-bg1/60 p-5 backdrop-blur">
      <h2 className="mb-4 font-display text-xs font-semibold uppercase tracking-wider text-ink-dim">
        {title}
      </h2>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  icon?: React.ReactNode;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {icon}
        <div>
          <div className="text-sm font-medium text-ink">{label}</div>
          {description && <div className="text-xs text-ink-dim">{description}</div>}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
