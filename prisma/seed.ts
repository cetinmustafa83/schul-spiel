import { PrismaClient } from "@prisma/client";
import { TOPICS, SUBJECTS, SCHOOL_TYPES, GRADES } from "./curriculum";
import { QUESTIONS } from "./questions.seed";
import { LLM_QUESTIONS } from "./llm-questions.seed";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Wissensgipfel database...");

  // ----- Reference data ---------------------------------------------------
  await seedSchoolTypes();
  await seedGrades();
  await seedSubjects();
  await seedTopics();
  await seedLadderLevels();
  await seedSelectionWeights();
  await seedSettings();
  await seedJokers();
  await seedRanks();
  await seedBadges();
  await seedAvatars();
  await seedPhrases();
  await seedContentPages();
  await seedQuestions();
  await seedQuestionStats();

  console.log("✅ Seeding complete.");
}

async function seedSchoolTypes() {
  for (const s of SCHOOL_TYPES) {
    await prisma.schoolType.upsert({
      where: { code: s.code },
      update: { label: s.label, track: s.track, active: 1, sort: s.sort },
      create: s,
    });
  }
  console.log(`  ✓ school_types (${SCHOOL_TYPES.length})`);
}

async function seedGrades() {
  for (const g of GRADES) {
    await prisma.grade.upsert({
      where: { grade: g.grade },
      update: { label: g.label, selectable: g.selectable, sort: g.sort },
      create: g,
    });
  }
  console.log(`  ✓ grades (${GRADES.length})`);
}

async function seedSubjects() {
  for (const s of SUBJECTS) {
    await prisma.subject.upsert({
      where: { code: s.code },
      update: { label: s.label, icon: s.icon, color: s.color, active: 1, sort: s.sort },
      create: s,
    });
  }
  console.log(`  ✓ subjects (${SUBJECTS.length})`);
}

async function seedTopics() {
  // Reset topic_track_grade cleanly each seed run.
  await prisma.topicTrackGrade.deleteMany({});
  for (const t of TOPICS) {
    const subject = await prisma.subject.findUnique({ where: { code: t.subjectCode } });
    if (!subject) {
      console.warn(`  ! subject ${t.subjectCode} missing — skipping topic ${t.code}`);
      continue;
    }
    const topic = await prisma.topic.upsert({
      where: { code: t.code },
      update: {
        subjectId: subject.id,
        label: t.label,
        curriculumNote: t.curriculumNote ?? null,
      },
      create: {
        code: t.code,
        subjectId: subject.id,
        label: t.label,
        curriculumNote: t.curriculumNote ?? null,
      },
    });
    const trackRows: Array<{ track: string; introGrade: number }> = [];
    if (t.introGradeHs != null) trackRows.push({ track: "basic", introGrade: t.introGradeHs });
    if (t.introGradeRs != null) {
      trackRows.push({ track: "mid", introGrade: t.introGradeRs });
      trackRows.push({ track: "advanced", introGrade: t.introGradeRs }); // GY uses Rs column unless introGradeGy differs
    }
    if (t.introGradeGy != null) {
      // Override advanced track with GY intro grade if it differs from RS.
      const existing = trackRows.findIndex((r) => r.track === "advanced");
      if (existing >= 0) trackRows[existing].introGrade = t.introGradeGy;
      else trackRows.push({ track: "advanced", introGrade: t.introGradeGy });
    }
    for (const tr of trackRows) {
      await prisma.topicTrackGrade.upsert({
        where: { topicId_track: { topicId: topic.id, track: tr.track } },
        update: { introGrade: tr.introGrade },
        create: { topicId: topic.id, track: tr.track, introGrade: tr.introGrade },
      });
    }
  }
  console.log(`  ✓ topics + topic_track_grade (${TOPICS.length})`);
}

async function seedLadderLevels() {
  const ladder = [
    { level: 1, amount: 50, isSafe: 0, tier: "A", label: null },
    { level: 2, amount: 100, isSafe: 0, tier: "A", label: null },
    { level: 3, amount: 200, isSafe: 0, tier: "A", label: null },
    { level: 4, amount: 300, isSafe: 0, tier: "A", label: null },
    { level: 5, amount: 500, isSafe: 1, tier: "A", label: "Sicherheitsstufe 1" },
    { level: 6, amount: 1000, isSafe: 0, tier: "B", label: null },
    { level: 7, amount: 2000, isSafe: 0, tier: "B", label: null },
    { level: 8, amount: 4000, isSafe: 0, tier: "B", label: null },
    { level: 9, amount: 8000, isSafe: 0, tier: "B", label: null },
    { level: 10, amount: 16000, isSafe: 1, tier: "B", label: "Sicherheitsstufe 2" },
    { level: 11, amount: 32000, isSafe: 0, tier: "C", label: null },
    { level: 12, amount: 64000, isSafe: 0, tier: "C", label: null },
    { level: 13, amount: 125000, isSafe: 0, tier: "C", label: null },
    { level: 14, amount: 250000, isSafe: 0, tier: "C", label: null },
    { level: 15, amount: 500000, isSafe: 0, tier: "C", label: "🏔 Gipfel" },
  ];
  for (const l of ladder) {
    await prisma.ladderLevel.upsert({
      where: { level: l.level },
      update: l,
      create: l,
    });
  }
  console.log(`  ✓ ladder_levels (${ladder.length})`);
}

async function seedSelectionWeights() {
  const rows = [
    // Tier A — Warm-up (levels 1-5)
    { tier: "A", kBucket: "k0", weight: 0.10, diffMin: 1, diffMax: 2 },
    { tier: "A", kBucket: "k1", weight: 0.30, diffMin: 1, diffMax: 2 },
    { tier: "A", kBucket: "k2plus", weight: 0.60, diffMin: 1, diffMax: 2 },
    // Tier B — Mixed (levels 6-10)
    { tier: "B", kBucket: "k0", weight: 0.35, diffMin: 2, diffMax: 3 },
    { tier: "B", kBucket: "k1", weight: 0.40, diffMin: 2, diffMax: 3 },
    { tier: "B", kBucket: "k2plus", weight: 0.25, diffMin: 2, diffMax: 3 },
    // Tier C — Challenge (levels 11-15)
    { tier: "C", kBucket: "k0", weight: 0.70, diffMin: 3, diffMax: 5 },
    { tier: "C", kBucket: "k1", weight: 0.25, diffMin: 3, diffMax: 5 },
    { tier: "C", kBucket: "k2plus", weight: 0.05, diffMin: 3, diffMax: 5 },
  ];
  for (const r of rows) {
    await prisma.selectionWeight.upsert({
      where: { tier_kBucket: { tier: r.tier, kBucket: r.kBucket } },
      update: r,
      create: r,
    });
  }
  console.log(`  ✓ selection_weights (${rows.length})`);
}

async function seedSettings() {
  const settings = [
    { key: "pin_length", value: "4", description: "PIN length (digits)" },
    { key: "session_ttl_days", value: "30", description: "Session sliding expiry in days" },
    { key: "inactive_account_delete_months", value: "12", description: "Auto-delete accounts inactive for this many months" },
    { key: "leitner_intervals", value: "[1,3,7,21]", description: "Leitner box intervals in days (boxes 1-4)" },
    { key: "log_retention_days", value: "7", description: "Server log retention in days" },
    { key: "login_rate_limit_per_handle", value: "5", description: "Failed-login attempts before lockout" },
    { key: "login_lock_minutes", value: "5", description: "Initial lockout duration" },
    { key: "login_lock_max_minutes", value: "60", description: "Maximum lockout duration after exponential backoff" },
    { key: "seen_questions_lookback_games", value: "10", description: "Exclude questions answered in the last N games" },
    { key: "seen_questions_lookback_days", value: "60", description: "Exclude questions answered in the last N days" },
    { key: "pool_size_guard", value: "60", description: "Minimum pool size before content-gap flag" },
    { key: "audience_min_real_answers", value: "30", description: "Threshold for using real answer stats in audience joker" },
    { key: "phone_correct_at_level_1", value: "0.95", description: "Lumi phone-joker correctness at level 1" },
    { key: "phone_correct_at_level_15", value: "0.60", description: "Lumi phone-joker correctness at level 15" },
    { key: "timer_relaxed_seconds", value: "60", description: "Entspannt timer duration" },
    { key: "timer_challenge_seconds", value: "30", description: "Challenge timer duration" },
    { key: "leaderboard_min_cohort", value: "50", description: "Minimum players for percentile display" },
    { key: "leaderboard_default_optin", value: "0", description: "Leaderboard opt-in default (privacy by default)" },
    { key: "daily_questions_count", value: "5", description: "Tagesquiz questions per day" },
    { key: "min_subjects_per_game", value: "6", description: "Minimum subjects covered in a Gipfel game (when available)" },
    { key: "max_consecutive_same_subject", value: "2", description: "Max consecutive questions from the same subject" },
    { key: "max_questions_per_subject", value: "4", description: "Max questions per subject in a Gipfel game" },
  ];
  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: s,
      create: s,
    });
  }
  console.log(`  ✓ settings (${settings.length})`);
}

async function seedJokers() {
  const jokers = [
    { code: "FIFTY_FIFTY", label: "50:50", enabled: 1, configJson: JSON.stringify({ usesPerGame: 1 }) },
    { code: "AUDIENCE", label: "Klassen-Umfrage", enabled: 1, configJson: JSON.stringify({ usesPerGame: 1, minRealAnswers: 30 }) },
    { code: "PHONE", label: "Lumi fragen", enabled: 1, configJson: JSON.stringify({ usesPerGame: 1, correctAtLevel1: 0.95, correctAtLevel15: 0.60 }) },
    { code: "SWITCH", label: "Frage tauschen", enabled: 1, configJson: JSON.stringify({ usesPerGame: 1 }) },
  ];
  for (const j of jokers) {
    await prisma.joker.upsert({
      where: { code: j.code },
      update: j,
      create: j,
    });
  }
  console.log(`  ✓ jokers (${jokers.length})`);
}

async function seedRanks() {
  const ranks = [
    { label: "Wanderer", minXp: 0 },
    { label: "Kletterer", minXp: 100 },
    { label: "Pfadfinder:in", minXp: 500 },
    { label: "Gipfelstürmer:in", minXp: 1500 },
    { label: "Legende des Gipfels", minXp: 4000 },
  ];
  for (let i = 0; i < ranks.length; i++) {
    const r = ranks[i];
    await prisma.rank.upsert({
      where: { id: i + 1 },
      update: r,
      create: r,
    });
  }
  console.log(`  ✓ ranks (${ranks.length})`);
}

async function seedBadges() {
  const badges = [
    { code: "erste_5000", label: "Erste 5.000 Taler", description: "Du hast in einem Spiel 5.000 Taler erreicht.", ruleJson: JSON.stringify({ kind: "winnings_gte", amount: 5000 }), icon: "🪙" },
    { code: "gipfel_errreicht", label: "Gipfel erreicht", description: "Du hast die 15. Stufe erklommen — 500.000 Taler!", ruleJson: JSON.stringify({ kind: "level_reached", level: 15 }), icon: "🏔" },
    { code: "mathe_profi_50", label: "Mathe-Profi", description: "Du hast 50 Mathe-Fragen richtig beantwortet.", ruleJson: JSON.stringify({ kind: "subject_correct_count", subject: "MA", count: 50 }), icon: "🔢" },
    { code: "deutsch_profi_50", label: "Deutsch-Profi", description: "Du hast 50 Deutsch-Fragen richtig beantwortet.", ruleJson: JSON.stringify({ kind: "subject_correct_count", subject: "DE", count: 50 }), icon: "📚" },
    { code: "fehler_besieger_20", label: "Fehler-Besieger:in", description: "Du hast 20 Wiederholungsfragen gemeistert.", ruleJson: JSON.stringify({ kind: "review_correct_count", count: 20 }), icon: "⚔️" },
    { code: "taeglich_7", label: "Tagesquiz-Streak", description: "Du hast 7 Tage lang das Tagesquiz gespielt.", ruleJson: JSON.stringify({ kind: "daily_streak", days: 7 }), icon: "🗓️" },
    { code: "training_100", label: "Trainingsfleiß", description: "Du hast 100 Trainingsfragen richtig beantwortet.", ruleJson: JSON.stringify({ kind: "training_correct_total", count: 100 }), icon: "🚆" },
    { code: "allrounder", label: "Allrounder:in", description: "Du hast in allen 13 Fächern mindestens eine Frage richtig.", ruleJson: JSON.stringify({ kind: "all_subjects_correct" }), icon: "🌈" },
    { code: "sicherheitsstufe_2", label: "Sicherheitsstufe 2 erreicht", description: "Du hast die zweite Sicherheitsstufe (16.000 Taler) erreicht.", ruleJson: JSON.stringify({ kind: "level_reached", level: 10 }), icon: "⛺" },
    { code: "aussteiger", label: "Kluger Ausstieg", description: "Du bist mit mindestens 8.000 Talern ausgestiegen.", ruleJson: JSON.stringify({ kind: "walk_away_with_gte", amount: 8000 }), icon: "🚪" },
  ];
  for (let i = 0; i < badges.length; i++) {
    const b = badges[i];
    await prisma.badge.upsert({
      where: { code: b.code },
      update: b,
      create: b,
    });
  }
  console.log(`  ✓ badges (${badges.length})`);
}

async function seedAvatars() {
  const avatars = [
    { code: "fox", label: "Fuchs", emoji: "🦊" },
    { code: "owl", label: "Eule", emoji: "🦉" },
    { code: "bear", label: "Bär", emoji: "🐻" },
    { code: "panda", label: "Panda", emoji: "🐼" },
    { code: "lion", label: "Löwe", emoji: "🦁" },
    { code: "frog", label: "Frosch", emoji: "🐸" },
    { code: "penguin", label: "Pinguin", emoji: "🐧" },
    { code: "hedgehog", label: "Igel", emoji: "🦔" },
    { code: "bee", label: "Biene", emoji: "🐝" },
    { code: "butterfly", label: "Schmetterling", emoji: "🦋" },
    { code: "rocket", label: "Rakete", emoji: "🚀" },
    { code: "robot", label: "Roboter", emoji: "🤖" },
    { code: "star", label: "Stern", emoji: "⭐" },
    { code: "moon", label: "Mond", emoji: "🌙" },
    { code: "sun", label: "Sonne", emoji: "☀️" },
    { code: "mountain", label: "Berg", emoji: "⛰️" },
    { code: "tree", label: "Baum", emoji: "🌳" },
    { code: "flower", label: "Blume", emoji: "🌸" },
    { code: "wizard", label: "Zauberer", emoji: "🧙" },
    { code: "ghost", label: "Geist", emoji: "👻" },
    { code: "crystal", label: "Kristall", emoji: "💎" },
    { code: "fire", label: "Feuer", emoji: "🔥" },
    { code: "snowflake", label: "Schneeflocke", emoji: "❄️" },
    { code: "leaf", label: "Blatt", emoji: "🍃" },
  ];
  for (let i = 0; i < avatars.length; i++) {
    const a = avatars[i];
    await prisma.avatar.upsert({
      where: { code: a.code },
      update: a,
      create: a,
    });
  }
  console.log(`  ✓ avatars (${avatars.length})`);
}

async function seedPhrases() {
  const phrases = [
    { kind: "phone_high", tone: "encourage", text: "Ich bin mir ziemlich sicher, dass es diese Antwort ist …" },
    { kind: "phone_high", tone: "encourage", text: "Ganz klar! Diese Option würde ich wählen." },
    { kind: "phone_medium", tone: "thinking", text: "Hmm, ich tippe auf diese Option, aber ganz sicher bin ich mir nicht." },
    { kind: "phone_medium", tone: "thinking", text: "Ich glaube, das ist die richtige — aber prüf es selbst nach!" },
    { kind: "phone_low", tone: "thinking", text: "Puh, das ist knifflig. Ich würde sagen … diese hier?" },
    { kind: "phone_low", tone: "thinking", text: "Keine Ahnung, ehrlich. Vielleicht diese? Viel Glück!" },
    { kind: "cheer", tone: "happy", text: "Du schaffst das!" },
    { kind: "cheer", tone: "happy", text: "Super gemacht!" },
    { kind: "cheer", tone: "happy", text: "Wow, das war stark!" },
    { kind: "encourage", tone: "warm", text: "Knapp daneben — kein Problem, Lumi erklärt dir, warum." },
    { kind: "encourage", tone: "warm", text: "Weiter so, Fehler sind Freunde beim Lernen." },
    { kind: "thinking", tone: "neutral", text: "Lass uns das gemeinsam überlegen …" },
  ];
  for (const p of phrases) {
    await prisma.phrase.create({ data: p });
  }
  console.log(`  ✓ phrases (${phrases.length})`);
}

async function seedContentPages() {
  const now = new Date().toISOString();
  const pages = [
    {
      slug: "datenschutz_kids",
      title: "Deine Daten — verständlich erklärt",
      audience: "kids",
      updatedAt: now,
      bodyMd: `# Deine Daten bei Wissensgipfel

Hallo! Hier erfährst du, was wir von dir wissen — und was **nicht**.

## Was wir speichern
- Dein **Spielname** und deine **4-stellige Nummer** (der Tag).
- Deine **Schulform** und **Klasse**, damit wir dir passende Fragen geben.
- Deine **PIN** (verschlüsselt, das können wir nicht lesen).
- Deine **Spielstände**: welche Fragen du richtig oder falsch beantwortet hast.

## Was wir NICHT speichern
- Keine E-Mail-Adresse.
- Keine Telefonnummer.
- Kein Foto von dir.
- Kein echter Name.
- Keine Handynummer.

## Wie lange?
Wenn du 12 Monate lang nicht spielst, löschen wir deinen Zugang komplett.

## Du hast Rechte
- **Löschen**: In den Einstellungen kannst du deinen Zugang sofort löschen.
- **Herausgeben**: In den Einstellungen kannst du alle deine Daten herunterladen.
- **Ändern**: Klasse oder Schulform kannst du jederzeit in den Einstellungen ändern.

Bei Fragen kannst du eine erwachsene Person bitten, die Eltern-Info-Seite zu lesen.`,
    },
    {
      slug: "datenschutz_full",
      title: "Datenschutzerklärung (Vollversion)",
      audience: "parents",
      updatedAt: now,
      bodyMd: `# Datenschutzerklärung

Stand: ${now.slice(0, 10)}

## 1. Verantwortlicher
DFM Solutions, Oberhausen (NRW). Kontaktweg: Impressum.

## 2. Verarbeitungsbasis und Datenminimierung
Wissensgipfel arbeitet nach dem Prinzip der Datenminimierung (Art. 5 und 25 DSGVO). Wir verarbeiten ausschließlich die folgenden pseudonymen Daten, die zur Bereitstellung der Lern-App notwendig sind:

- **Spielname** (frei wählbares Pseudonym), **Tag** (4-stellige Systemnummer) — Identifikation in der App
- **Schulform** und **Klasse** (5–8) — Auswahl passender Fragen
- **PIN** (als argon2id-/scrypt-Hash, nicht reversibel) — Authentifizierung
- **Rettungscode** (als Hash) — Wiederherstellung der PIN
- **Avatar** (aus vorgegebenen Icons) — Darstellung
- **Spielhistorie**: beantwortete Fragen, XP, Abzeichen, Wiederholungsstapel, gesehene Fragen — Spiel- und Lernfunktionen

**Nicht erhoben**: E-Mail, Telefonnummer, echter Name, Adresse, Geräte-Kennung, Standort, IP-Adresse in der App-Datenbank (Server-Logs ohne IP oder gekürzt, 7 Tage Aufbewahrung), Cookies außer der strikt notwendigen Sitzungs-Cookie.

## 3. Rechtsgrundlage
Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung zur Bereitstellung der App) bzw. Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse, eine kindgerechte Lern-App anzubieten). Bei Features, die auf freiwilliger Einwilligung beruhen (z. B. optionale Bestenliste), wird die Einwilligung gesondert eingeholt (Art. 6 Abs. 1 lit. a, Art. 7 DSGVO).

## 4. Kinder und Jugendliche
Wissensgipfel richtet sich an Schüler:innen der Klassen 5–8 (ca. 10–14 Jahre). Die Altersgrenze für die digitale Einwilligung nach Art. 8 DSGVO ist in Deutschland 16 Jahre. Da keine verifizierbare elterliche Einwilligung digital eingeholt werden kann (keine E-Mail), wird auf Datenminimierung gesetzt; zudem wird vor der Registrierung eine **Eltern-Info**-Seite eingeblendet. ⚖️ Die finale rechtliche Bewertung erfolgt vor Launch durch den Datenschutzbeauftragten.

## 5. Speicherdauer und Löschung
- Spiele: bis zur Löschung des Spielerkontos.
- Inaktive Konten: automatische Löschung nach 12 Monaten Inaktivität.
- Sitzungs-Cookie: 30 Tage, gleitend.
- Server-Logs: 7 Tage, IP anonymisiert oder nicht erfasst.
- Backups: bis zu 30 Tage Aufbewahrung; gelöschte Daten sind aus Backups nach Ablauf der Aufbewahrungsfrist endgültig entfernt (in der Datenschutzerklärung dokumentiert).

## 6. Ihre Rechte
Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20), Widerspruch (Art. 21), Widerruf bei Einwilligung (Art. 7 Abs. 3). Da der Verantwortliche die Identität der betroffenen Person ohne Kontozugang nicht feststellen kann (Art. 11 DSGVO), werden Auskunfts-, Lösch- und Änderungsersuchen per Selbstbedienung in der App erfüllt (Login + PIN bzw. Rettungscode).

## 7. Technische Maßnahmen (TOMs, Art. 32)
HTTPS (HSTS), strikte CSP, Referrer-Policy no-referrer, Permissions-Policy ohne Kamera/Mikro/Geo, X-Content-Type-Options. Keine US-Cloud-Dienste, keine CDNs, keine externen Schriftarten/Skripte. SQLite-Datenbank auf verschlüsseltem Volume, verschlüsselte Off-site-Backups in der EU.

## 8. Aktualität
Diese Erklärung ist eine Vorab-Version. Vor dem öffentlichen Launch wird sie durch den Datenschutzbeauftragten geprüft (gekennzeichnet mit ⚖️).`,
    },
    {
      slug: "eltern_info",
      title: "Eltern-Info",
      audience: "parents",
      updatedAt: now,
      bodyMd: `# Eltern-Info zu Wissensgipfel

Liebe Eltern,

Wissensgipfel ist eine **DSGVO-konforme, kostenlose Lern-App** für Schüler:innen der Klassen 5–8. Sie verbindet das Spielprinzip einer Taler-Leiter mit der Wiederholung echten Schulstoffs.

## Was wir sammeln
- Einen **frei wählbaren Spielnamen** (Pseudonym) plus eine automatisch erzeugte 4-stellige Nummer (Tag).
- Die **Schulform** und **Klasse** Ihres Kindes.
- Eine **PIN** (4 Ziffern, gehasht gespeichert) und einen **Rettungscode** (3 Wörter + 2 Ziffern, gehasht).

## Was wir **nicht** sammeln
- Keine E-Mail-Adresse, keine Telefonnummer.
- Keinen echten Namen, keine Adresse, keine Fotos.
- Keine IP-Adresse in der App-Datenbank, keine Werbung, kein Tracking, keine Analyse-Tools.
- Keine externen Skripte, Fonts oder Cloud-Dienste (alles selbst gehostet).

## Sicherheit
- PINs und Rettungscodes werden nur als kryptografischer Hash gespeichert (wir können sie nicht lesen).
- Login-Versuche werden begrenzt (5 Fehlversuche → 5 Min Sperre, dann exponentiell bis zu 1 Stunde).
- Alle Daten liegen auf einem Server in Deutschland/EU.
- Backups sind verschlüsselt und werden nach 30 Tagen überschrieben.

## Rechte Ihres Kindes
- **Konto löschen** (in den Einstellungen, mit PIN).
- **Daten exportieren** (in den Einstellungen).
- **PIN ändern** (mit Rettungscode, in den Einstellungen).

## Was tun bei verlorener PIN?
Mit dem **Rettungscode** kann Ihr Kind die PIN in den Einstellungen zurücksetzen. Ohne Rettungscode ist eine Wiederherstellung nicht möglich — bewahren Sie den Code am besten gemeinsam mit Ihrem Kind auf (z. B. auf Papier).

## Kommunikation
Wissensgipfel hat keine Chat-Funktion, keine Freundesliste, keine Kommentare. Nur das pseudo-anonyme Pseudonym wird angezeigt.

## Spielprinzip und Kinderschutz
- Keine echten Preise, keine In-App-Käufe, keine Werbung, keine Lootboxen.
- Timer ist standardmäßig aus.
- Bestenliste ist standardmäßig aus; optionale Aktivierung erfordert eine erneute Bestätigung.
- Alle Fragen sind kindgerecht und orientieren sich an den NRW-Kernlehrplänen.

## Vollständige Datenschutzerklärung
Siehe „Datenschutz (Vollversion)".

⚠️ Diese Informationen sind eine Vorab-Version. Vor dem öffentlichen Launch erfolgt eine Überprüfung durch den Datenschutzbeauftragten.`,
    },
    {
      slug: "impressum",
      title: "Impressum",
      audience: "all",
      updatedAt: now,
      bodyMd: `# Impressum

Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz, ehemals TMG):

**Verantwortlich für den Inhalt:**
DFM Solutions
Musterstraße 1
46047 Oberhausen
Nordrhein-Westfalen
Deutschland

**Vertreten durch:**
Geschäftsführung DFM Solutions

**Kontakt:**
E-Mail: impressum@wissensgipfel.example ⚠️ (Beispiel-Adresse — vor Launch durch echte Adresse ersetzen)

**Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:**
DFM Solutions, Oberhausen (Anschrift wie oben).

**Haftungsausschluss:**
Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Richtigkeit der in den Quiz-Fragen enthaltenen Lehrinhalte. Bei Hinweisen auf fehlerhafte Fragen nutzen Sie bitte die „Frage melden"-Funktion in der App.

⚠️ Dies ist eine Platzhalter-Adresse. Vor dem öffentlichen Launch muss das Impressum durch die korrekte Rechtsform, Vertretungsberechtigte, USt-ID und Kontaktdaten ersetzt werden.`,
    },
    {
      slug: "hilfe",
      title: "Hilfe",
      audience: "all",
      updatedAt: now,
      bodyMd: `# Hilfe — häufige Fragen

## Wie melde ich mich an?
Du brauchst deinen **Spielnamen**, die **4-stellige Nummer (Tag)** und deine **PIN**. Tippe sie einfach ein — fertig.

## Ich habe meine PIN vergessen.
Mit dem **Rettungscode**, den du bei der Registrierung erhalten hast, kannst du die PIN unter „PIN vergessen?" zurücksetzen. Ohne Rettungscode ist das leider nicht möglich — dann musst du ein neues Konto erstellen (alte Daten gehen verloren).

## Wie funktioniert die Taler-Leiter?
Es gibt 15 Stufen. Auf jeder Stufe kannst du Taler verdienen. Bei den Stufen 5 (500 Taler) und 10 (16.000 Taler) gibt es eine Sicherheitsstufe — dort landest du, falls du eine Frage falsch beantwortest. Auf der höchsten Stufe (15) warten 500.000 Taler Spielgeld.

## Was sind Joker?
- **50:50** — entfernt zwei falsche Antworten.
- **Klassen-Umfrage** — zeigt, wie andere gespielt haben.
- **Lumi fragen** — unsere Eule Lumi gibt dir einen Tipp (sie kann sich auch irren!).
- **Frage tauschen** — tauscht die aktuelle Frage gegen eine neue.

Jeden Joker kannst du pro Spiel einmal benutzen.

## Wie komme ich auf die Sicherheitsstufe?
Du erreichst eine Sicherheitsstufe, sobald du die Fragen 5 bzw. 10 richtig beantwortest. Ab dann landest du mindestens dort, auch wenn später etwas schiefgeht.

## Wie kann ich mein Konto löschen?
Gehe zu **Profil → Einstellungen → Konto löschen**. Du brauchst deine PIN. Alle deine Daten werden sofort und unwiderruflich gelöscht.

## Wie kann ich meine Daten herunterladen?
Gehe zu **Profil → Einstellungen → Meine Daten herunterladen**. Du erhältst eine JSON-Datei mit allem, was wir über dich gespeichert haben.

## Braucht ihr meine E-Mail-Adresse?
Nein! Wir speichern **keine** E-Mail-Adresse, keine Telefonnummer, keinen echten Namen. Nur dein Pseudonym, deine Schulform und deine Klasse.`,
    },
    {
      slug: "parent_gate_info",
      title: "Eltern-Gate",
      audience: "parents",
      updatedAt: now,
      bodyMd: `# Eltern-Gate

Bestimmte Funktionen (z. B. die optionale Bestenliste oder erweiterte Einstellungen) sind durch ein Eltern-Gate geschützt, um sicherzustellen, dass eine erwachsene Person zustimmt.

Das Eltern-Gate besteht aus einer kleinen Rechenaufgabe, die für Erwachsene leicht, für jüngere Kinder aber nicht offensichtlich lösbar ist.

Wissensgipfel sammelt keine Identitätsdaten — das Eltern-Gate ist eine informatorische Hürde, kein juristischer Nachweis elterlicher Einwilligung. ⚖️`,
    },
  ];
  for (const p of pages) {
    await prisma.contentPage.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    });
  }
  console.log(`  ✓ content_pages (${pages.length})`);
}

async function seedQuestions() {
  // Wipe questions (and dependent rows) so re-seeding stays clean.
  await prisma.questionReport.deleteMany({});
  await prisma.questionStat.deleteMany({});
  await prisma.gameQuestion.deleteMany({});
  await prisma.reviewDeckItem.deleteMany({});
  await prisma.seenQuestion.deleteMany({});
  await prisma.question.deleteMany({});

  let inserted = 0;
  // Hand-curated seed
  for (const q of QUESTIONS) {
    const topic = await prisma.topic.findUnique({ where: { code: q.topicCode } });
    if (!topic) {
      console.warn(`  ! topic ${q.topicCode} not found — skipping question`);
      continue;
    }
    const t = TOPICS.find((x) => x.code === q.topicCode);
    if (!t) {
      console.warn(`  ! topic ${q.topicCode} not in curriculum.ts — skipping`);
      continue;
    }
    await prisma.question.create({
      data: {
        topicId: topic.id,
        subjectId: topic.subjectId,
        text: q.text,
        optA: q.options[0],
        optB: q.options[1],
        optC: q.options[2],
        optD: q.options[3],
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        difficulty: q.difficulty,
        introGradeHs: t.introGradeHs,
        introGradeRs: t.introGradeRs,
        introGradeGy: t.introGradeGy,
        clusterId: q.clusterId ?? null,
        sourceNote: `NRW KLP ${t.subjectCode}`,
        status: "published",
        createdBy: "seed",
        version: 1,
      },
    });
    inserted++;
  }
  // LLM-generated questions
  let llmInserted = 0;
  for (const q of LLM_QUESTIONS) {
    const topic = await prisma.topic.findUnique({ where: { code: q.topicCode } });
    if (!topic) continue;
    const t = TOPICS.find((x) => x.code === q.topicCode);
    if (!t) continue;
    await prisma.question.create({
      data: {
        topicId: topic.id,
        subjectId: topic.subjectId,
        text: q.text,
        optA: q.options[0],
        optB: q.options[1],
        optC: q.options[2],
        optD: q.options[3],
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        difficulty: q.difficulty,
        introGradeHs: t.introGradeHs,
        introGradeRs: t.introGradeRs,
        introGradeGy: t.introGradeGy,
        clusterId: q.clusterId ?? null,
        sourceNote: q.sourceNote,
        status: "published",
        createdBy: "llm",
        version: 1,
      },
    });
    llmInserted++;
    inserted++;
  }
  console.log(`  ✓ questions (${inserted} total: seed=${QUESTIONS.length}, llm=${llmInserted})`);
}

async function seedQuestionStats() {
  // Create an empty stats row for each question.
  const questions = await prisma.question.findMany({ select: { id: true } });
  for (const q of questions) {
    await prisma.questionStat.create({
      data: { questionId: q.id, answered: 0, correct: 0, optCountsJson: "{}" },
    });
  }
  console.log(`  ✓ question_stats (${questions.length})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
