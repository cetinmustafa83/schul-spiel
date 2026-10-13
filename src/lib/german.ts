/**
 * German-language helpers used across the app.
 *  - Spielername suggestions (adjective + animal, kid-friendly, pseudonymous)
 *  - Rettungscode generation (three kid-friendly German words + 2 digits)
 *  - Display-name validation (no digits strings, no e-mail/URL patterns)
 */

const ADJEKTIVE = [
  "Mutiger", "Kluger", "Schneller", "Stiller", "Fröhlicher", "Tapsiger", "Witziger",
  "Trauter", "Stiller", "Weiser", "Kleiner", "Großer", "Flinker", "Stolzer",
  "Sanfter", "Wagemutiger", "Wachsamer", "Wunderlicher", "Stürmischer", "Lauter",
  "Stiller", "Träumerischer", "Forscher", "Wilder", "Friedlicher",
];

const TIERE = [
  "Fuchs", "Dachs", "Adler", "Bär", "Wolf", "Hase", "Eule", "Delfin", "Biber",
  "Igel", "Marder", "Luchs", "Otter", "Fischotter", "Hirsch", "Reh", "Maus",
  "Falke", "Specht", "Schmetterling", "Maulwurf", "Eichhörnchen", "Waschbär",
];

const RETTUNGS_WOERTER = [
  "Mond", "Stern", "Berg", "Baum", "Fluss", "Wolke", "Stein", "Blatt", "Nest",
  "Tiger", "Fuchs", "Bär", "Adler", "Hirsch", "Wolf", "Eule", "Dachs", "Igel",
  "Brot", "Apfel", "Kuchen", "Milch", "Honig", "Suppe", "Tee", "Saft",
  "Rose", "Tulpe", "Löwenzahn", "Sonnenblume", "Vergissmeinnicht", "Klee",
  "Schiff", "Buch", "Ball", "Tuch", "Ring", "Stab", "Schlüssel", "Tasse",
  "Wind", "Regen", "Schnee", "Sonne", "Nebel", "Donner", "Blitz", "Tau",
  "Frieden", "Mut", "Glück", "Lachen", "Stille", "Traum",
];

export function suggestSpielername(): string {
  const a = ADJEKTIVE[Math.floor(Math.random() * ADJEKTIVE.length)];
  const t = TIERE[Math.floor(Math.random() * TIERE.length)];
  return `${a} ${t}`;
}

export function generateRettungscode(): string {
  const w1 = RETTUNGS_WOERTER[Math.floor(Math.random() * RETTUNGS_WOERTER.length)];
  const w2 = RETTUNGS_WOERTER[Math.floor(Math.random() * RETTUNGS_WOERTER.length)];
  const w3 = RETTUNGS_WOERTER[Math.floor(Math.random() * RETTUNGS_WOERTER.length)];
  const n = Math.floor(10 + Math.random() * 90);
  return `${w1}-${w2}-${w3}-${n}`;
}

const NAME_RE = /^[A-Za-zÄÖÜäöüß \-]{3,20}$/;

const FORBIDDEN_PATTERNS = [
  /\d{4,}/, // looks like a phone number
  /@/, // e-mail
  /https?:/i, // URL
  /www\./i,
  /\b(admin|support|mod|team|dfm|wissensgipfel)\b/i, // impersonation
];

const PROFANITY = [
  "arsch", "scheiß", "fuck", "shit", "idiot", "nazi", "hitler", "porn", "sex",
  "xxx", "hitler", "hure", "nutte", "schwuchtel", "neger", "schlitze",
];

export interface NameCheck {
  ok: boolean;
  reason?: string;
}

export function checkSpielername(name: string): NameCheck {
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 20) {
    return { ok: false, reason: "Der Name muss 3–20 Zeichen lang sein." };
  }
  if (!NAME_RE.test(trimmed)) {
    return {
      ok: false,
      reason: "Bitte nur Buchstaben (A–Z, Ä, Ö, Ü), Leerzeichen oder Bindestrich.",
    };
  }
  for (const p of FORBIDDEN_PATTERNS) {
    if (p.test(trimmed)) {
      return { ok: false, reason: "Das sieht wie eine Nummer, E-Mail oder Webseite aus. Nimm lieber einen Fantasienamen." };
    }
  }
  const lower = trimmed.toLowerCase();
  for (const bad of PROFANITY) {
    if (lower.includes(bad)) {
      return { ok: false, reason: "Dieser Name passt nicht zu Wissensgipfel. Bitte wähle einen freundlicheren Namen." };
    }
  }
  // Heuristic: 4+ repeated characters
  if (/(.)\1{4,}/i.test(trimmed)) {
    return { ok: false, reason: "Bitte nicht so viele gleiche Zeichen." };
  }
  return { ok: true };
}

export const SUBJECT_LABELS: Record<string, string> = {
  DE: "Deutsch",
  MA: "Mathematik",
  EN: "Englisch",
  BIO: "Biologie",
  PHY: "Physik",
  CH: "Chemie",
  GE: "Geschichte",
  EK: "Erdkunde",
  PW: "Politik/Wirtschaft",
  INF: "Informatik/Medien",
  AW: "Allgemeinwissen",
};

export const SCHOOL_TYPE_LABELS: Record<string, string> = {
  HS: "Hauptschule",
  RS: "Realschule",
  SEK: "Sekundarschule",
  GE: "Gesamtschule",
  GY: "Gymnasium",
};

export function formatTaler(amount: number): string {
  return new Intl.NumberFormat("de-DE").format(amount);
}

export function gradeLabel(grade: number): string {
  return `Klasse ${grade}`;
}

/** Format XP as "Bergsteiger-Rang" — these come from DB, but here's the fallback. */
export function fallbackRankLabel(xp: number): string {
  if (xp < 100) return "Wanderer";
  if (xp < 500) return "Kletterer";
  if (xp < 1500) return "Pfadfinder";
  if (xp < 4000) return "Gipfelstürmer";
  return "Legende des Gipfels";
}
