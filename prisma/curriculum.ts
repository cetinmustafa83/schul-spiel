/**
 * Curriculum scaffold — Topic catalog with intro grades per track.
 * (PRD §6.5 — initial seed scaffold. Teachers must validate against NRW
 * Kernlehrpläne before public launch.)
 *
 * introGradeHs/Rs/Gy = the grade in which the topic is first taught on
 *   Hauptschule / Realschule(+SEK+GE) / Gymnasium tracks. null = not part
 *   of that track's curriculum (or not yet verified).
 * grade 4 = Grundschule basics (not player-selectable, but in the pool).
 *
 * Codes are stable identifiers; labels are German UI strings.
 */

export interface TopicSeed {
  subjectCode: string; // DE, MA, EN, ...
  code: string;        // de_wortarten, ma_bruche, ...
  label: string;       // German label
  curriculumNote?: string;
  introGradeHs: number | null;
  introGradeRs: number | null; // also used by SEK and GE (mid track)
  introGradeGy: number | null;
}

export const TOPICS: TopicSeed[] = [
  // === Deutsch ===
  { subjectCode: "DE", code: "de_wortarten", label: "Wortarten", curriculumNote: "Nomen, Verb, Adjektiv",
    introGradeHs: 4, introGradeRs: 4, introGradeGy: 4 },
  { subjectCode: "DE", code: "de_satzarten", label: "Satzarten",
    introGradeHs: 4, introGradeRs: 4, introGradeGy: 4 },
  { subjectCode: "DE", code: "de_gross_klein", label: "Groß- und Kleinschreibung",
    introGradeHs: 4, introGradeRs: 4, introGradeGy: 4 },
  { subjectCode: "DE", code: "de_satzglieder", label: "Satzglieder (Subjekt, Prädikat, Objekt)",
    introGradeHs: 5, introGradeRs: 5, introGradeGy: 5 },
  { subjectCode: "DE", code: "de_zeitformen", label: "Zeitformen (Präsens, Präteritum, Perfekt)",
    introGradeHs: 5, introGradeRs: 5, introGradeGy: 5 },
  { subjectCode: "DE", code: "de_faelle", label: "Die vier Fälle (Nominativ bis Akkusativ/Dativ)",
    introGradeHs: 5, introGradeRs: 5, introGradeGy: 5 },
  { subjectCode: "DE", code: "de_das_dass", label: "das/dass",
    introGradeHs: 6, introGradeRs: 6, introGradeGy: 6 },
  { subjectCode: "DE", code: "de_satzreihe_gefuege", label: "Satzreihe und Satzgefüge",
    introGradeHs: 6, introGradeRs: 6, introGradeGy: 6 },
  { subjectCode: "DE", code: "de_aktiv_passiv", label: "Aktiv und Passiv",
    introGradeHs: 7, introGradeRs: 6, introGradeGy: 6 },
  { subjectCode: "DE", code: "de_aktive_passive_rede", label: "Wörtliche und indirekte Rede",
    introGradeHs: 7, introGradeRs: 6, introGradeGy: 6 },
  { subjectCode: "DE", code: "de_textsorten", label: "Textsorten (Märchen, Fabel, Sage, Ballade)",
    introGradeHs: 6, introGradeRs: 5, introGradeGy: 5 },

  // === Mathematik ===
  { subjectCode: "MA", code: "ma_zahlenraum", label: "Zahlenraum und Rechnen",
    introGradeHs: 4, introGradeRs: 4, introGradeGy: 4 },
  { subjectCode: "MA", code: "ma_einmaleins", label: "Einmaleins",
    introGradeHs: 4, introGradeRs: 4, introGradeGy: 4 },
  { subjectCode: "MA", code: "ma_groessen", label: "Größen (Länge, Zeit, Geld)",
    introGradeHs: 4, introGradeRs: 4, introGradeGy: 4 },
  { subjectCode: "MA", code: "ma_bruche", label: "Bruchrechnen",
    introGradeHs: 6, introGradeRs: 5, introGradeGy: 5 },
  { subjectCode: "MA", code: "ma_dezimalzahlen", label: "Dezimalzahlen",
    introGradeHs: 6, introGradeRs: 5, introGradeGy: 5 },
  { subjectCode: "MA", code: "ma_winkel", label: "Winkel und Geometrie",
    introGradeHs: 5, introGradeRs: 5, introGradeGy: 5 },
  { subjectCode: "MA", code: "ma_symmetrie", label: "Symmetrie und Körper",
    introGradeHs: 5, introGradeRs: 5, introGradeGy: 5 },
  { subjectCode: "MA", code: "ma_umfang_fläche", label: "Umfang und Flächeninhalt",
    introGradeHs: 5, introGradeRs: 5, introGradeGy: 5 },
  { subjectCode: "MA", code: "ma_teilbarkeit", label: "Teilbarkeit und Primzahlen",
    introGradeHs: 7, introGradeRs: 6, introGradeGy: 6 },
  { subjectCode: "MA", code: "ma_dreisatz", label: "Dreisatz und Proportionalität",
    introGradeHs: 7, introGradeRs: 6, introGradeGy: 6 },
  { subjectCode: "MA", code: "ma_prozent_zinsen", label: "Prozent- und Zinsrechnung",
    introGradeHs: 8, introGradeRs: 7, introGradeGy: 7 },
  { subjectCode: "MA", code: "ma_negative_zahlen", label: "Negative und rationale Zahlen",
    introGradeHs: 8, introGradeRs: 7, introGradeGy: 7 },
  { subjectCode: "MA", code: "ma_terme_gleichungen", label: "Terme und Gleichungen",
    introGradeHs: 8, introGradeRs: 7, introGradeGy: 7 },
  { subjectCode: "MA", code: "ma_lineare_funktionen", label: "Lineare Funktionen",
    introGradeHs: null, introGradeRs: 8, introGradeGy: 8 },
  { subjectCode: "MA", code: "ma_wahrscheinlichkeit", label: "Wahrscheinlichkeit (Grundlagen)",
    introGradeHs: 8, introGradeRs: 7, introGradeGy: 7 },

  // === Englisch ===
  { subjectCode: "EN", code: "en_basic_vocab", label: "Basic vocabulary (colours, numbers, family)",
    introGradeHs: 4, introGradeRs: 4, introGradeGy: 4 },
  { subjectCode: "EN", code: "en_present_simple", label: "Present simple, to be, have got",
    introGradeHs: 5, introGradeRs: 5, introGradeGy: 5 },
  { subjectCode: "EN", code: "en_greetings_school", label: "Greetings, school, home, hobbies",
    introGradeHs: 5, introGradeRs: 5, introGradeGy: 5 },
  { subjectCode: "EN", code: "en_past_simple", label: "Past simple",
    introGradeHs: 6, introGradeRs: 6, introGradeGy: 6 },
  { subjectCode: "EN", code: "en_comparatives", label: "Comparatives and superlatives",
    introGradeHs: 6, introGradeRs: 6, introGradeGy: 6 },
  { subjectCode: "EN", code: "en_going_to", label: "going to, prepositions of place/time",
    introGradeHs: 6, introGradeRs: 6, introGradeGy: 6 },
  { subjectCode: "EN", code: "en_present_perfect", label: "Present perfect",
    introGradeHs: 8, introGradeRs: 7, introGradeGy: 7 },
  { subjectCode: "EN", code: "en_will_future", label: "will-future, conditional I",
    introGradeHs: 8, introGradeRs: 7, introGradeGy: 7 },

  // === Biologie ===
  { subjectCode: "BIO", code: "bio_tiere_heimat", label: "Tiere der Heimat",
    introGradeHs: 4, introGradeRs: 4, introGradeGy: 4 },
  { subjectCode: "BIO", code: "bio_pflanzen", label: "Pflanzen und Jahreszeiten",
    introGradeHs: 4, introGradeRs: 4, introGradeGy: 4 },
  { subjectCode: "BIO", code: "bio_wirbeltiere", label: "Wirbeltiere und Säugetiere",
    introGradeHs: 5, introGradeRs: 5, introGradeGy: 5 },
  { subjectCode: "BIO", code: "bio_oekosystem", label: "Ökosystem Wald und Gewässer",
    introGradeHs: 7, introGradeRs: 6, introGradeGy: 6 },
  { subjectCode: "BIO", code: "bio_ernaehrung", label: "Ernährung und Gesundheit",
    introGradeHs: 6, introGradeRs: 6, introGradeGy: 6 },
  { subjectCode: "BIO", code: "bio_zelle", label: "Zelle und Mikroskop",
    introGradeHs: 8, introGradeRs: 7, introGradeGy: 7 },
  { subjectCode: "BIO", code: "bio_verdauung_atmung", label: "Verdauung und Atmung",
    introGradeHs: 8, introGradeRs: 7, introGradeGy: 7 },

  // === Physik ===
  { subjectCode: "PHY", code: "phy_optik", label: "Optik (Licht und Schatten, Spiegel)",
    introGradeHs: 5, introGradeRs: 5, introGradeGy: 5 },
  { subjectCode: "PHY", code: "phy_akustik", label: "Akustik (Schall)",
    introGradeHs: 5, introGradeRs: 5, introGradeGy: 5 },
  { subjectCode: "PHY", code: "phy_waerme", label: "Wärme und Temperatur",
    introGradeHs: 7, introGradeRs: 6, introGradeGy: 6 },
  { subjectCode: "PHY", code: "phy_stromkreis", label: "Einfache Stromkreise",
    introGradeHs: 7, introGradeRs: 6, introGradeGy: 6 },
  { subjectCode: "PHY", code: "phy_kraefte", label: "Kräfte, Druck und Dichte",
    introGradeHs: 8, introGradeRs: 7, introGradeGy: 7 },
  { subjectCode: "PHY", code: "phy_elektrizitaet", label: "Elektrizität und Energieformen",
    introGradeHs: 8, introGradeRs: 8, introGradeGy: 8 },

  // === Chemie ===
  { subjectCode: "CH", code: "ch_stoffe", label: "Stoffe und Eigenschaften",
    introGradeHs: null, introGradeRs: 7, introGradeGy: 7 },
  { subjectCode: "CH", code: "ch_aggregatzustaende", label: "Aggregatzustände",
    introGradeHs: null, introGradeRs: 7, introGradeGy: 7 },
  { subjectCode: "CH", code: "ch_gemische", label: "Gemische und Trennverfahren",
    introGradeHs: null, introGradeRs: 7, introGradeGy: 7 },
  { subjectCode: "CH", code: "ch_verbrennung", label: "Verbrennung, Luft, Atome",
    introGradeHs: null, introGradeRs: 8, introGradeGy: 8 },

  // === Geschichte ===
  { subjectCode: "GE", code: "ge_urgeschichte", label: "Urgeschichte und Steinzeit",
    introGradeHs: 5, introGradeRs: 5, introGradeGy: 5 },
  { subjectCode: "GE", code: "ge_aegypten", label: "Altes Ägypten",
    introGradeHs: 5, introGradeRs: 5, introGradeGy: 5 },
  { subjectCode: "GE", code: "ge_antike", label: "Antike: Griechenland und Rom",
    introGradeHs: 7, introGradeRs: 6, introGradeGy: 6 },
  { subjectCode: "GE", code: "ge_mittelalter", label: "Mittelalter",
    introGradeHs: 8, introGradeRs: 7, introGradeGy: 7 },
  { subjectCode: "GE", code: "ge_entdeckungen", label: "Entdeckungen und Neuzeit",
    introGradeHs: 8, introGradeRs: 7, introGradeGy: 7 },

  // === Erdkunde ===
  { subjectCode: "EK", code: "ek_orientierung", label: "Orientierung und Karten",
    introGradeHs: 4, introGradeRs: 5, introGradeGy: 5 },
  { subjectCode: "EK", code: "ek_deutschland", label: "Deutschland",
    introGradeHs: 5, introGradeRs: 5, introGradeGy: 5 },
  { subjectCode: "EK", code: "ek_europa", label: "Europa",
    introGradeHs: 7, introGradeRs: 6, introGradeGy: 6 },
  { subjectCode: "EK", code: "ek_klima", label: "Klima und Zonen",
    introGradeHs: 7, introGradeRs: 6, introGradeGy: 6 },
  { subjectCode: "EK", code: "ek_kontinente", label: "Kontinente",
    introGradeHs: 8, introGradeRs: 7, introGradeGy: 7 },

  // === Politik / Wirtschaft ===
  { subjectCode: "PW", code: "pw_gemeinschaft", label: "Familie, Schule, Regeln",
    introGradeHs: 5, introGradeRs: 5, introGradeGy: 5 },
  { subjectCode: "PW", code: "pw_gemeinde", label: "Gemeinde und Medien",
    introGradeHs: 6, introGradeRs: 6, introGradeGy: 6 },
  { subjectCode: "PW", code: "pw_demokratie", label: "Demokratie und Grundgesetz",
    introGradeHs: 8, introGradeRs: 7, introGradeGy: 7 },
  { subjectCode: "PW", code: "pw_wirtschaft", label: "Wirtschaft und Markt",
    introGradeHs: 8, introGradeRs: 8, introGradeGy: 8 },

  // === Informatik / Medien ===
  { subjectCode: "INF", code: "inf_passwoerter", label: "Passwörter und Datenschutz-Basics",
    introGradeHs: 5, introGradeRs: 5, introGradeGy: 5 },
  { subjectCode: "INF", code: "inf_algorithmen", label: "Algorithmen (Einführung)",
    introGradeHs: 7, introGradeRs: 6, introGradeGy: 6 },
  { subjectCode: "INF", code: "inf_binaer", label: "Binärsystem und Codierung",
    introGradeHs: 8, introGradeRs: 7, introGradeGy: 7 },

  // === Kunst & Musik ===
  { subjectCode: "KU", code: "ku_farben", label: "Farben und Farbenlehre",
    introGradeHs: 4, introGradeRs: 5, introGradeGy: 5 },
  { subjectCode: "KU", code: "ku_noten", label: "Notenwerte und Rhythmus",
    introGradeHs: 5, introGradeRs: 5, introGradeGy: 5 },
  { subjectCode: "KU", code: "ku_instrumente", label: "Instrumentenfamilien",
    introGradeHs: 5, introGradeRs: 5, introGradeGy: 5 },
  { subjectCode: "KU", code: "ku_perspektive", label: "Perspektive und Takt",
    introGradeHs: 7, introGradeRs: 6, introGradeGy: 6 },

  // === Sport & Gesundheit ===
  { subjectCode: "SP", code: "sp_spielregeln", label: "Spielregeln",
    introGradeHs: 4, introGradeRs: 5, introGradeGy: 5 },
  { subjectCode: "SP", code: "sp_fitness", label: "Fitness und Ernährung",
    introGradeHs: 6, introGradeRs: 5, introGradeGy: 5 },
  { subjectCode: "SP", code: "sp_hygiene", label: "Hygiene und Teamsport",
    introGradeHs: 7, introGradeRs: 6, introGradeGy: 6 },
  { subjectCode: "SP", code: "sp_herz_kreislauf", label: "Herz-Kreislauf und Erste Hilfe",
    introGradeHs: 8, introGradeRs: 7, introGradeGy: 7 },

  // === Allgemeinwissen / Natur & Technik ===
  { subjectCode: "AW", code: "aw_alltag", label: "Alltag und Natur",
    introGradeHs: 4, introGradeRs: 4, introGradeGy: 4 },
  { subjectCode: "AW", code: "aw_weltall", label: "Weltall (Grundlagen)",
    introGradeHs: 7, introGradeRs: 6, introGradeGy: 6 },
  { subjectCode: "AW", code: "aw_technik", label: "Technik und Erfindungen",
    introGradeHs: 8, introGradeRs: 7, introGradeGy: 7 },
  { subjectCode: "AW", code: "aw_umwelt", label: "Umwelt und Nachhaltigkeit",
    introGradeHs: 8, introGradeRs: 8, introGradeGy: 8 },
];

/** Subject codes + German labels (PRD §6.5 subject list). */
export const SUBJECTS = [
  { code: "DE", label: "Deutsch", icon: "📚", color: "#7C6CFF", sort: 1 },
  { code: "MA", label: "Mathematik", icon: "🔢", color: "#31B7E6", sort: 2 },
  { code: "EN", label: "Englisch", icon: "🇬🇧", color: "#3DDBA4", sort: 3 },
  { code: "BIO", label: "Biologie", icon: "🌱", color: "#7FBE3D", sort: 4 },
  { code: "PHY", label: "Physik", icon: "⚡", color: "#F2A93B", sort: 5 },
  { code: "CH", label: "Chemie", icon: "⚗️", color: "#E86CB5", sort: 6 },
  { code: "GE", label: "Geschichte", icon: "🏛️", color: "#C98A4B", sort: 7 },
  { code: "EK", label: "Erdkunde", icon: "🗺️", color: "#5CC8FF", sort: 8 },
  { code: "PW", label: "Politik & Wirtschaft", icon: "🗳️", color: "#8B6CFF", sort: 9 },
  { code: "INF", label: "Informatik & Medien", icon: "💻", color: "#31B7E6", sort: 10 },
  { code: "KU", label: "Kunst & Musik", icon: "🎨", color: "#E86CB5", sort: 11 },
  { code: "SP", label: "Sport & Gesundheit", icon: "⚽", color: "#3DDBA4", sort: 12 },
  { code: "AW", label: "Allgemeinwissen", icon: "🌍", color: "#F2A93B", sort: 13 },
];

export const SCHOOL_TYPES = [
  { code: "HS", label: "Hauptschule", track: "basic", sort: 1 },
  { code: "RS", label: "Realschule", track: "mid", sort: 2 },
  { code: "SEK", label: "Sekundarschule", track: "mid", sort: 3 },
  { code: "GE", label: "Gesamtschule", track: "mid", sort: 4 },
  { code: "GY", label: "Gymnasium", track: "advanced", sort: 5 },
];

export const GRADES = [
  { grade: 4, label: "Klasse 4 (Grundlagen)", selectable: 0, sort: 1 },
  { grade: 5, label: "Klasse 5", selectable: 1, sort: 2 },
  { grade: 6, label: "Klasse 6", selectable: 1, sort: 3 },
  { grade: 7, label: "Klasse 7", selectable: 1, sort: 4 },
  { grade: 8, label: "Klasse 8", selectable: 1, sort: 5 },
];
