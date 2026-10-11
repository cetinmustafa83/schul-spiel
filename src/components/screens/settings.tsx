"use client";

import { useEffect, useState } from "react";
import { useApp, type SessionPlayer } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, LogOut, Download, Trash2, User, Eye, Shield } from "lucide-react";
import { SCHOOL_TYPE_LABELS } from "@/lib/german";

interface Avatar {
  id: number;
  code: string;
  label: string;
  emoji: string;
}
interface SchoolType {
  code: string;
  label: string;
}
interface Grade {
  grade: number;
  label: string;
}
interface Prefs {
  sound?: boolean;
  music?: boolean;
  reducedMotion?: boolean;
  textScale?: number;
  dyslexia?: boolean;
  timer?: "off" | "relaxed" | "challenge";
}
interface MeResponse {
  id: string;
  displayName: string;
  tag: string;
  schoolType: string;
  grade: number;
  avatarId: number | null;
  xp: number;
  leaderboardOptin: boolean;
  prefs: Prefs;
  createdAt: string;
}

const DEFAULT_PREFS: Required<Prefs> = {
  sound: true,
  music: false,
  reducedMotion: false,
  textScale: 100,
  dyslexia: false,
  timer: "off",
};

// Module-level caches for meta data (cheap to reuse on tab switches).
let schoolTypeCache: SchoolType[] | null = null;
let gradeCache: Grade[] | null = null;
let avatarCache: Avatar[] | null = null;

export function SettingsScreen() {
  const { navigate, setPlayer, setPrefs, pushToast, player } = useApp();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [schoolTypes, setSchoolTypes] = useState<SchoolType[]>(schoolTypeCache ?? []);
  const [grades, setGrades] = useState<Grade[]>(gradeCache ?? []);
  const [avatars, setAvatars] = useState<Avatar[]>(avatarCache ?? []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletePin, setDeletePin] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [meRes, stRes, gRes, aRes] = await Promise.all([
          fetch("/api/me", { cache: "no-store" }).then((r) => r.json()) as Promise<MeResponse>,
          schoolTypeCache
            ? Promise.resolve(schoolTypeCache)
            : fetch("/api/meta/school-types", { cache: "no-store" }).then((r) => r.json() as Promise<{ items: SchoolType[] }>).then((d) => d.items),
          gradeCache
            ? Promise.resolve(gradeCache)
            : fetch("/api/meta/grades", { cache: "no-store" }).then((r) => r.json() as Promise<{ items: Grade[] }>).then((d) => d.items),
          avatarCache
            ? Promise.resolve(avatarCache)
            : fetch("/api/meta/avatars", { cache: "no-store" }).then((r) => r.json() as Promise<{ items: Avatar[] }>).then((d) => d.items),
        ]);
        setMe(meRes);
        setSchoolTypes(stRes ?? []);
        setGrades(gRes ?? []);
        setAvatars(aRes ?? []);
        schoolTypeCache = stRes ?? [];
        gradeCache = gRes ?? [];
        avatarCache = aRes ?? [];
        // Sync prefs into the global store so the rest of the app reflects them.
        setPrefs({ ...DEFAULT_PREFS, ...meRes.prefs });
      } catch {
        setError("Einstellungen konnten nicht geladen werden. Bitte versuche es später nochmal.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function patch(body: Record<string, unknown>) {
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        pushToast(data.message ?? "Speichern fehlgeschlagen.", "error");
        return false;
      }
      return true;
    } catch {
      pushToast("Netzwerkfehler beim Speichern.", "error");
      return false;
    }
  }

  async function updateField<K extends keyof MeResponse>(key: K, value: MeResponse[K]) {
    if (!me) return;
    setMe({ ...me, [key]: value });
    const ok = await patch({ [key]: value });
    if (ok) pushToast("Gespeichert.", "success");
  }

  async function updatePref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    if (!me) return;
    const newPrefs = { ...me.prefs, [key]: value };
    setMe({ ...me, prefs: newPrefs });
    setPrefs({ [key]: value } as never);
    const ok = await patch({ prefs: { [key]: value } });
    if (ok) pushToast("Gespeichert.", "success");
  }

  async function downloadData() {
    try {
      const res = await fetch("/api/me/export", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        pushToast(data.message ?? "Export fehlgeschlagen.", "error");
        return;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wissensgipfel-export-${new Date().toISOString().slice(0, 10)}.json`;
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
    if (deletePin.length !== 4) {
      pushToast("Bitte gib deine 4-stellige PIN ein.", "error");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: deletePin }),
      });
      const data = await res.json();
      if (!res.ok) {
        pushToast(data.message ?? "Löschung fehlgeschlagen.", "error");
        setDeleting(false);
        return;
      }
      pushToast("Dein Konto wurde gelöscht.", "success");
      setPlayer(null);
      navigate("landing");
    } catch {
      pushToast("Netzwerkfehler beim Löschen.", "error");
    } finally {
      setDeleting(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setPlayer(null);
    navigate("landing");
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6">
        <div className="mb-6 h-7 w-32 animate-pulse rounded bg-bg2/60" />
        <div className="h-48 w-full animate-pulse rounded-2xl bg-bg2/40" />
      </div>
    );
  }

  if (error || !me) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-8 text-center">
        <div className="text-4xl">😶</div>
        <h1 className="mt-3 font-display text-xl font-bold text-ink">Hm</h1>
        <p className="mt-2 text-sm text-ink-dim">{error ?? "Etwas ist schiefgelaufen."}</p>
        <Button className="mt-6" variant="outline" onClick={() => navigate("home")}>
          Zurück zum Menü
        </Button>
      </div>
    );
  }

  const prefs: Required<Prefs> = { ...DEFAULT_PREFS, ...me.prefs };

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("home")}
          className="tap-target inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-ink-dim hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Zurück
        </button>
        <span className="font-display text-sm font-semibold text-gold">Einstellungen</span>
      </header>

      <Tabs defaultValue="account" className="flex-1">
        <TabsList className="mb-4 grid w-full grid-cols-4">
          <TabsTrigger value="account"><User className="h-3.5 w-3.5" /> Konto</TabsTrigger>
          <TabsTrigger value="display"><Eye className="h-3.5 w-3.5" /> Anzeige</TabsTrigger>
          <TabsTrigger value="privacy"><Shield className="h-3.5 w-3.5" /> Datenschutz</TabsTrigger>
          <TabsTrigger value="logout"><LogOut className="h-3.5 w-3.5" /> Abmelden</TabsTrigger>
        </TabsList>

        {/* Account */}
        <TabsContent value="account">
          <div className="flex flex-col gap-4">
            <Section title="Account">
              <Row label="Spielname">
                <div className="flex items-center gap-2">
                  <Input value={me.displayName} readOnly className="bg-bg2/40" />
                  <Badge variant="secondary">#{me.tag}</Badge>
                </div>
                <p className="text-xs text-ink-dim">Dein Spielname und Tag bleiben gleich.</p>
              </Row>
              <Row label="Schulform">
                <Select
                  value={me.schoolType}
                  onValueChange={(v) => void updateField("schoolType", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {schoolTypes.map((st) => (
                      <SelectItem key={st.code} value={st.code}>
                        {st.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>
              <Row label="Klasse">
                <Select
                  value={String(me.grade)}
                  onValueChange={(v) => void updateField("grade", Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map((g) => (
                      <SelectItem key={g.grade} value={String(g.grade)}>
                        Klasse {g.grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>
            </Section>

            <Section title="Avatar">
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
                {avatars.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => void updateField("avatarId", a.id)}
                    aria-pressed={me.avatarId === a.id}
                    className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 text-2xl transition-all ${
                      me.avatarId === a.id
                        ? "border-gold bg-gold/15"
                        : "border-border bg-bg2/40 hover:border-gold/40"
                    }`}
                    aria-label={a.label}
                    title={a.label}
                  >
                    {a.emoji}
                  </button>
                ))}
              </div>
            </Section>
          </div>
        </TabsContent>

        {/* Display & accessibility */}
        <TabsContent value="display">
          <Section title="Anzeige & Barrierefreiheit">
            <ToggleRow
              label="Sound-Effekte"
              description="Kurze Töne bei Antworten."
              checked={prefs.sound}
              onCheckedChange={(v) => void updatePref("sound", v)}
            />
            <ToggleRow
              label="Musik"
              description="Hintergrundmusik im Menü."
              checked={prefs.music}
              onCheckedChange={(v) => void updatePref("music", v)}
            />
            <ToggleRow
              label="Reduzierte Bewegung"
              description="Weniger Animationen."
              checked={prefs.reducedMotion}
              onCheckedChange={(v) => void updatePref("reducedMotion", v)}
            />
            <ToggleRow
              label="Legasthenie-Modus"
              description="Deutlichere Schriften und mehr Zeilenabstand."
              checked={prefs.dyslexia}
              onCheckedChange={(v) => void updatePref("dyslexia", v)}
            />
            <Row label={`Textgröße: ${prefs.textScale}%`}>
              <Slider
                value={[prefs.textScale]}
                min={100}
                max={150}
                step={25}
                onValueChange={(arr) => {
                  const v = arr[0];
                  if (typeof v === "number") void updatePref("textScale", v);
                }}
              />
              <div className="flex justify-between text-xs text-ink-dim">
                <span>100%</span><span>125%</span><span>150%</span>
              </div>
            </Row>
            <Row label="Timer-Modus">
              <Select
                value={prefs.timer}
                onValueChange={(v) => void updatePref("timer", v as Prefs["timer"])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Aus</SelectItem>
                  <SelectItem value="relaxed">Entspannt (mehr Zeit)</SelectItem>
                  <SelectItem value="challenge">Herausfordernd (wenig Zeit)</SelectItem>
                </SelectContent>
              </Select>
            </Row>
          </Section>
        </TabsContent>

        {/* Privacy */}
        <TabsContent value="privacy">
          <Section title="Datenschutz">
            <div className="flex flex-col gap-3">
              <p className="text-sm text-ink-dim">
                Du kannst jederzeit alle deine Daten als JSON-Datei herunterladen oder dein
                Konto vollständig löschen. Nach der Löschung sind alle Daten unwiderruflich weg.
              </p>
              <Button variant="outline" className="w-full" onClick={() => void downloadData()}>
                <Download className="h-4 w-4" /> Meine Daten herunterladen
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="h-4 w-4" /> Konto löschen
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Wirklich löschen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Diese Aktion kann nicht rückgängig gemacht werden. Alle deine
                      Spielstände, Abzeichen und Statistiken werden gelöscht. Bitte gib
                      zur Bestätigung deine PIN ein.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Input
                    value={deletePin}
                    onChange={(e) => setDeletePin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="PIN"
                    className="text-center font-display tracking-widest"
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeletePin("")}>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-coral text-white hover:bg-coral/90"
                      onClick={() => void deleteAccount()}
                      disabled={deleting || deletePin.length !== 4}
                    >
                      {deleting ? "Lösche …" : "Endgültig löschen"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </Section>
        </TabsContent>

        {/* Logout */}
        <TabsContent value="logout">
          <Section title="Abmelden">
            <div className="flex flex-col gap-3 text-center">
              <p className="text-sm text-ink-dim">
                Du kannst dich jederzeit wieder mit Spielname, Tag und PIN anmelden.
              </p>
              <Button variant="outline" className="w-full" onClick={() => void logout()}>
                <LogOut className="h-4 w-4" /> Abmelden
              </Button>
            </div>
          </Section>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <footer className="mt-6 flex flex-wrap items-center justify-center gap-3 border-t border-border pt-4 text-xs text-ink-dim">
        <button className="hover:text-ink" onClick={() => navigate("legal")}>Datenschutz</button>
        <span aria-hidden>·</span>
        <button className="hover:text-ink" onClick={() => navigate("parent-info")}>Eltern-Info</button>
        <span aria-hidden>·</span>
        <button className="hover:text-ink" onClick={() => navigate("imprint")}>Impressum</button>
        <span aria-hidden>·</span>
        <button className="hover:text-ink" onClick={() => navigate("help")}>Hilfe</button>
      </footer>
      {player && (
        <p className="mt-3 text-center text-[11px] text-ink-dim">
          {SCHOOL_TYPE_LABELS[player.schoolType] ?? player.schoolType} · Klasse {player.grade}
        </p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-bg1/60 p-4">
      <h2 className="mb-3 font-display text-sm font-semibold text-gold">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-ink">{label}</div>
        {description && <div className="text-xs text-ink-dim">{description}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
