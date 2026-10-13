/**
 * Wissensgipfel — LLM-based question generation script.
 *
 * Uses z-ai-web-dev-sdk to generate original, NRW-curriculum-aligned
 * German quiz questions following the PRD §7.4 content pipeline:
 *   GLM generates -> schema validation -> length/dedup check -> save to seed file.
 *
 * Output: prisma/llm-questions.seed.ts (consumed by the main seed script).
 */
import ZAI from "z-ai-web-dev-sdk";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { TOPICS } from "./curriculum";

interface RawQuestion {
  text: string;
  options: [string, string, string, string];
  correct_index: 0 | 1 | 2 | 3;
  explanation: string;
  topic: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  suggested_intro_grade: number;
  curriculum_note?: string;
}

interface SeedQuestion {
  topicCode: string;
  subjectCode: string;
  text: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  clusterId?: string;
  sourceNote: string;
}

const GENERATED_FILE = `${import.meta.dir}/llm-questions.seed.ts`;

// Load already-generated questions to skip duplicates
function loadExisting(): SeedQuestion[] {
  if (!existsSync(GENERATED_FILE)) return [];
  const content = readFileSync(GENERATED_FILE, "utf-8");
  // Match any interface name (SeedQuestion or LLMSeedQuestion) for forward-compat.
  const match = content.match(/export const LLM_QUESTIONS:\s*\w+\[\]\s*=\s*(\[[\s\S]*\]);/);
  if (!match) return [];
  try {
    return JSON.parse(match[1]) as SeedQuestion[];
  } catch {
    return [];
  }
}

// Topic catalog grouped by (subject, intro-grade on the mid track = RS column).
// We'll generate questions for each topic at its intro grade level.
type TopicKey = string; // topicCode
const TOPIC_BY_SUBJECT: Record<string, typeof TOPICS> = {};
for (const t of TOPICS) {
  if (!TOPIC_BY_SUBJECT[t.subjectCode]) TOPIC_BY_SUBJECT[t.subjectCode] = [];
  TOPIC_BY_SUBJECT[t.subjectCode].push(t);
}

const SUBJECT_LABELS_DE: Record<string, string> = {
  DE: "Deutsch",
  MA: "Mathematik",
  EN: "Englisch",
  BIO: "Biologie",
  PHY: "Physik",
  CH: "Chemie",
  GE: "Geschichte",
  EK: "Erdkunde",
  PW: "Politik und Wirtschaft",
  INF: "Informatik und Medien",
  KU: "Kunst und Musik",
  SP: "Sport und Gesundheit",
  AW: "Allgemeinwissen",
};

const SCHOOLFORM_LABELS_DE: Record<string, string> = {
  HS: "Hauptschule",
  RS: "Realschule",
  SEK: "Sekundarschule",
  GE: "Gesamtschule",
  GY: "Gymnasium",
};

// Build prompt per PRD §7.4 — exactly as specified.
function buildPrompt(fach: string, schulform: string, klasse: number, thema: string, difficulty: number, n: number): string {
  return `Du bist Fachlehrer:in für ${fach} an einer ${schulform} in Nordrhein-Westfalen.
Erstelle ${n} Multiple-Choice-Fragen für Klasse ${klasse}, Thema "${thema}", Schwierigkeit ${difficulty}/5
(1 = sehr leicht für diese Klasse, 5 = sehr schwer für diese Klasse).
Regeln:
- Genau 4 Antwortoptionen, genau 1 richtige. Plausible, aber eindeutig falsche Distraktoren.
- Keine Verneinungsfragen bei Schwierigkeit <= 2. Kein "alle/keine der Antworten".
- Sprachniveau: Klasse ${klasse}. Frage <= 180 Zeichen, Option <= 50 Zeichen.
- Erklärung (<= 240 Zeichen) in kindgerechtem Deutsch: warum ist die Antwort richtig?
- Nur Wissen, das laut Lehrplan bis einschließlich Klasse ${klasse} behandelt wird. Nichts aus höheren Klassen.
- Keine tagesaktuellen Fakten, keine Marken, keine kontroversen politischen Themen.
- Verwende gender-faire, neutrale Namen in Beispielen (Mia, Can, Jonas, Aylin).
- Verwende korrekte deutsche Rechtschreibung (Duden).
Gib ausschließlich gültiges JSON zurück, ohne Markdown-Codeblöcke:
[{"text":"...","options":["...","...","...","..."],"correct_index":0,"explanation":"...","topic":"${thema}","difficulty":${difficulty},"suggested_intro_grade":${klasse},"curriculum_note":"..."}]`;
}

// Validate a single question
function validateQuestion(q: unknown): q is RawQuestion {
  if (typeof q !== "object" || q === null) return false;
  const r = q as Record<string, unknown>;
  if (typeof r.text !== "string" || r.text.length === 0 || r.text.length > 200) return false;
  if (!Array.isArray(r.options) || r.options.length !== 4) return false;
  if (!r.options.every((o) => typeof o === "string" && o.length > 0 && o.length <= 60)) return false;
  if (typeof r.correct_index !== "number" || r.correct_index < 0 || r.correct_index > 3) return false;
  if (typeof r.explanation !== "string" || r.explanation.length === 0 || r.explanation.length > 260) return false;
  if (typeof r.difficulty !== "number" || r.difficulty < 1 || r.difficulty > 5) return false;
  return true;
}

// Parse LLM JSON response — strips markdown code fences if present
function parseLLMJson(content: string): unknown[] {
  let s = content.trim();
  // Strip ```json ... ``` fences if present
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }
  // Find the first [ ... ] block
  const start = s.indexOf("[");
  const end = s.lastIndexOf("]");
  if (start < 0 || end < 0 || end <= start) return [];
  const json = s.slice(start, end + 1);
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

const PROFANITY = ["arsch", "scheiß", "fuck", "shit", "idiot", "nazi", "hitler", "porn", "hure", "nutte", "neger", "schlitze"];

function isProfane(text: string): boolean {
  const lower = text.toLowerCase();
  return PROFANITY.some((p) => lower.includes(p));
}

// Main generation
async function main() {
  const subjects = process.argv.slice(2);
  const targetSubjects = subjects.length > 0 ? subjects : ["DE", "MA", "EN", "BIO"];
  console.log(`🎯 Generating LLM questions for subjects: ${targetSubjects.join(", ")}`);

  const zai = await ZAI.create();
  const existing = loadExisting();
  const existingTexts = new Set(existing.map((q) => q.text.toLowerCase().trim()));
  let allQuestions: SeedQuestion[] = [...existing];
  let totalGenerated = 0;
  let totalSkipped = 0;

  // Strategy: for each subject, generate 5 questions per (topic, difficulty) for grades 5-8
  // — but only for topics whose intro grade on the GY track is ≤ the target grade.
  for (const subjectCode of targetSubjects) {
    const topics = TOPIC_BY_SUBJECT[subjectCode] ?? [];
    if (topics.length === 0) {
      console.log(`  ! No topics for ${subjectCode}, skipping.`);
      continue;
    }
    console.log(`\n📚 ${subjectCode} — ${SUBJECT_LABELS_DE[subjectCode]} (${topics.length} topics)`);

    for (const topic of topics) {
      // Generate at each intro grade the topic appears (use GY column as canonical)
      // Cap to grades 4-8 (intro_grade_gy may be null = not part of GY curriculum → skip)
      const introGy = topic.introGradeGy ?? topic.introGradeRs;
      if (introGy == null) continue;
      // Generate at 3 grade levels: the intro grade +1 +2 (within bounds 4-8)
      const grades = [introGy, Math.min(8, introGy + 1), Math.min(8, introGy + 2)].filter((g, i, arr) => arr.indexOf(g) === i);

      for (const grade of grades) {
        // For each grade, generate 2 difficulties: easy (1-2) and medium (3)
        const difficulties: number[] = grade === introGy ? [1, 2] : [2, 3];
        for (const difficulty of difficulties) {
          const prompt = buildPrompt(
            SUBJECT_LABELS_DE[subjectCode],
            SCHOOLFORM_LABELS_DE.GY,
            grade,
            topic.label,
            difficulty,
            5
          );

          let lastErr = "";
          let success = false;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              const completion = await zai.chat.completions.create({
                messages: [
                  { role: "assistant", content: "Du bist ein erfahrener Lehrer und erstellst kindgerechte,Original-Fragen für eine Lern-App. Antworte NUR mit gültigem JSON, ohne Markdown oder Erklärungen." },
                  { role: "user", content: prompt },
                ],
                thinking: { type: "disabled" },
              });

              const rawContent = completion.choices[0]?.message?.content ?? "";
              const parsed = parseLLMJson(rawContent);

              let batchAdded = 0;
              for (const q of parsed) {
                if (!validateQuestion(q)) {
                  totalSkipped++;
                  continue;
                }
                const rq = q as RawQuestion;
                const text = rq.text.trim();
                if (existingTexts.has(text.toLowerCase())) {
                  totalSkipped++;
                  continue;
                }
                if (isProfane(text) || rq.options.some(isProfane) || isProfane(rq.explanation)) {
                  totalSkipped++;
                  continue;
                }
                existingTexts.add(text.toLowerCase());
                allQuestions.push({
                  topicCode: topic.code,
                  subjectCode,
                  text,
                  options: rq.options.map((o) => o.trim()) as [string, string, string, string],
                  correctIndex: rq.correct_index,
                  explanation: rq.explanation.trim(),
                  difficulty: rq.difficulty as 1 | 2 | 3 | 4 | 5,
                  clusterId: `${topic.code}_${grade}_${difficulty}`,
                  sourceNote: `NRW KLP ${subjectCode} (LLM-generiert)`,
                });
                batchAdded++;
                totalGenerated++;
              }
              process.stdout.write(`  ✓ ${topic.code} K${grade} D${difficulty}: +${batchAdded}\n`);
              success = true;
              break; // exit retry loop
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              lastErr = msg;
              console.error(`  ! ${topic.code} K${grade} D${difficulty} (attempt ${attempt}/3): ${msg}`);
              await new Promise((r) => setTimeout(r, 1500 * attempt));
            }
          }
          if (!success) {
            console.error(`  ✗ ${topic.code} K${grade} D${difficulty} FAILED after 3 attempts: ${lastErr}`);
          }

          // Small delay to avoid rate-limit
          await new Promise((r) => setTimeout(r, 500));

          // Periodic save (every 20 generations)
          if (totalGenerated > 0 && totalGenerated % 20 === 0) {
            writeSeedFile(allQuestions);
            console.log(`  💾 Saved ${allQuestions.length} questions so far.`);
          }
        }
      }
    }
  }

  // Final write
  writeSeedFile(allQuestions);
  console.log(`\n✅ Done. Generated ${totalGenerated} new questions (skipped ${totalSkipped}). Total in seed: ${allQuestions.length}`);
}

function writeSeedFile(questions: SeedQuestion[]): void {
  const header = `// AUTO-GENERATED by prisma/generate-questions.ts (LLM-based, GLM via z-ai-web-dev-sdk).
// Do not edit by hand — re-run the generator to update.
// All questions are original works generated by the LLM and follow PRD §7.4.
//
// Stats:
//   Total questions: ${questions.length}
//   Generated at: ${new Date().toISOString()}

export interface LLMSeedQuestion {
  topicCode: string;
  subjectCode: string;
  text: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  clusterId?: string;
  sourceNote: string;
}

export const LLM_QUESTIONS: LLMSeedQuestion[] = `;
  const body = JSON.stringify(questions, null, 2);
  writeFileSync(GENERATED_FILE, header + body + ";\n", "utf-8");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
}).finally(() => {
  console.error("[done]");
  process.exit(0);
});
