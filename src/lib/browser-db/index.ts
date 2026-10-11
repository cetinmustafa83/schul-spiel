"use client";

import Loki from "lokijs";

/**
 * Wissensgipfel — Browser-side persistence using LokiJS.
 *
 * All player data stays in the browser (localStorage). No server, no auth,
 * no PIN, no email. Data survives page reloads until the user clears browser
 * cache.
 *
 * Collections:
 *   - players: { name, schoolType, grade, avatarId, xp, createdAt, lastActiveAt }
 *   - gameHistory: { playerName, mode, level, winnings, correct, total, date }
 *   - seenQuestions: { playerName, questionId, lastSeen }
 *   - reviewDeck: { playerName, questionId, box, dueAt, answeredCount }
 *   - dailyAnswers: { playerName, day, questionId, correct }
 *   - topicMastery: { playerName, topicId, attempts, correct }
 */

export interface PlayerDoc {
  name: string;
  schoolType: string;
  grade: number;
  avatarId: number | null;
  xp: number;
  createdAt: string;
  lastActiveAt: string;
  $loki?: number;
  meta?: { revision: number; created: number; version: number };
}

export interface GameHistoryDoc {
  playerName: string;
  mode: string;
  level: number;
  winnings: number;
  correct: number;
  total: number;
  date: string;
  $loki?: number;
  meta?: { revision: number; created: number; version: number };
}

export interface SeenQuestionDoc {
  playerName: string;
  questionId: number;
  lastSeen: string;
  $loki?: number;
  meta?: { revision: number; created: number; version: number };
}

export interface ReviewDeckDoc {
  playerName: string;
  questionId: number;
  box: number;
  dueAt: string;
  answeredCount: number;
  $loki?: number;
  meta?: { revision: number; created: number; version: number };
}

export interface DailyAnswerDoc {
  playerName: string;
  day: string;
  questionId: number;
  correct: boolean;
  $loki?: number;
  meta?: { revision: number; created: number; version: number };
}

export interface TopicMasteryDoc {
  playerName: string;
  topicId: number;
  attempts: number;
  correct: number;
  $loki?: number;
  meta?: { revision: number; created: number; version: number };
}

const DB_NAME = "wissensgipfel-db";

let dbInstance: Loki | null = null;
let initPromise: Promise<Loki> | null = null;

/**
 * Initialise the LokiJS database with localStorage persistence.
 * Safe to call multiple times — returns the singleton.
 */
export function getDB(): Promise<Loki> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (initPromise) return initPromise;

  initPromise = new Promise<Loki>((resolve, reject) => {
    const db = new Loki(DB_NAME, {
      // LokiJS uses localStorage by default in browser env
      persistenceMethod: "localStorage",
      autoload: true,
      autoloadCallback: (err: unknown) => {
        if (err) {
          console.warn("[loki] autoload error, falling back to manual init:", err);
        }
        try {
          ensureCollections(db);
          dbInstance = db;
          resolve(db);
        } catch (e) {
          reject(e);
        }
      },
      autosave: true,
      autosaveInterval: 2000,
    });

    // Fallback: if autoload doesn't fire within 2s, manually init
    setTimeout(() => {
      if (!dbInstance) {
        try {
          ensureCollections(db);
          dbInstance = db;
          resolve(db);
        } catch (e) {
          reject(e);
        }
      }
    }, 2000);
  });

  return initPromise;
}

function ensureCollections(db: Loki) {
  if (!db.getCollection("players")) {
    db.addCollection("players", { unique: ["name"] });
  }
  if (!db.getCollection("gameHistory")) {
    db.addCollection("gameHistory");
  }
  if (!db.getCollection("seenQuestions")) {
    db.addCollection("seenQuestions", { unique: ["playerName", "questionId"] });
  }
  if (!db.getCollection("reviewDeck")) {
    db.addCollection("reviewDeck", { unique: ["playerName", "questionId"] });
  }
  if (!db.getCollection("dailyAnswers")) {
    db.addCollection("dailyAnswers", { unique: ["playerName", "day", "questionId"] });
  }
  if (!db.getCollection("topicMastery")) {
    db.addCollection("topicMastery", { unique: ["playerName", "topicId"] });
  }
}

// ============================================================================
// Player operations
// ============================================================================

export async function getOrCreatePlayer(
  name: string,
  schoolType = "GY",
  grade = 5,
  avatarId: number | null = null,
): Promise<PlayerDoc> {
  const db = await getDB();
  const players = db.getCollection<PlayerDoc>("players");
  const existing = players.findOne({ name });
  if (existing) {
    existing.lastActiveAt = new Date().toISOString();
    players.update(existing);
    return existing;
  }
  const now = new Date().toISOString();
  const player: PlayerDoc = {
    name,
    schoolType,
    grade,
    avatarId,
    xp: 0,
    createdAt: now,
    lastActiveAt: now,
  };
  return players.insert(player);
}

export async function getPlayer(name: string): Promise<PlayerDoc | null> {
  const db = await getDB();
  const players = db.getCollection<PlayerDoc>("players");
  return players.findOne({ name }) ?? null;
}

export async function updatePlayer(name: string, updates: Partial<PlayerDoc>): Promise<PlayerDoc | null> {
  const db = await getDB();
  const players = db.getCollection<PlayerDoc>("players");
  const player = players.findOne({ name });
  if (!player) return null;
  Object.assign(player, updates, { lastActiveAt: new Date().toISOString() });
  players.update(player);
  return player;
}

export async function deletePlayer(name: string): Promise<void> {
  const db = await getDB();
  const players = db.getCollection<PlayerDoc>("players");
  players.findAndRemove({ name });
  db.getCollection<GameHistoryDoc>("gameHistory").findAndRemove({ playerName: name });
  db.getCollection<SeenQuestionDoc>("seenQuestions").findAndRemove({ playerName: name });
  db.getCollection<ReviewDeckDoc>("reviewDeck").findAndRemove({ playerName: name });
  db.getCollection<DailyAnswerDoc>("dailyAnswers").findAndRemove({ playerName: name });
  db.getCollection<TopicMasteryDoc>("topicMastery").findAndRemove({ playerName: name });
}

export async function listPlayers(): Promise<PlayerDoc[]> {
  const db = await getDB();
  return db.getCollection<PlayerDoc>("players").find();
}

// ============================================================================
// Game history
// ============================================================================

export async function addGameHistory(entry: Omit<GameHistoryDoc, "$loki" | "meta">): Promise<void> {
  const db = await getDB();
  db.getCollection<GameHistoryDoc>("gameHistory").insert(entry);
}

export async function getGameHistory(name: string, limit = 20): Promise<GameHistoryDoc[]> {
  const db = await getDB();
  return db.getCollection<GameHistoryDoc>("gameHistory")
    .chain()
    .find({ playerName: name })
    .simplesort("date", true)
    .limit(limit)
    .data();
}

// ============================================================================
// Seen questions (freshness)
// ============================================================================

export async function addSeenQuestion(name: string, questionId: number): Promise<void> {
  const db = await getDB();
  const coll = db.getCollection<SeenQuestionDoc>("seenQuestions");
  const existing = coll.findOne({ playerName: name, questionId });
  if (existing) {
    existing.lastSeen = new Date().toISOString();
    coll.update(existing);
  } else {
    coll.insert({ playerName: name, questionId, lastSeen: new Date().toISOString() });
  }
}

export async function getSeenQuestionIds(name: string): Promise<Set<number>> {
  const db = await getDB();
  const rows = db.getCollection<SeenQuestionDoc>("seenQuestions").find({ playerName: name });
  return new Set(rows.map((r) => r.questionId));
}

// ============================================================================
// Review deck (Leitner)
// ============================================================================

const LEITNER_INTERVALS_DAYS = [1, 3, 7, 21];

export async function addToReviewDeck(name: string, questionId: number): Promise<void> {
  const db = await getDB();
  const coll = db.getCollection<ReviewDeckDoc>("reviewDeck");
  const existing = coll.findOne({ playerName: name, questionId });
  const dueAt = new Date(Date.now() + LEITNER_INTERVALS_DAYS[0] * 24 * 60 * 60 * 1000).toISOString();
  if (existing) {
    existing.box = 1;
    existing.dueAt = dueAt;
    existing.answeredCount = 0;
    coll.update(existing);
  } else {
    coll.insert({ playerName: name, questionId, box: 1, dueAt, answeredCount: 0 });
  }
}

export async function countDueReview(name: string): Promise<number> {
  const db = await getDB();
  const now = new Date().toISOString();
  return db.getCollection<ReviewDeckDoc>("reviewDeck").count({ playerName: name, dueAt: { $lte: now } });
}

export async function getDueReviewIds(name: string, limit = 20): Promise<number[]> {
  const db = await getDB();
  const now = new Date().toISOString();
  const rows = db.getCollection<ReviewDeckDoc>("reviewDeck")
    .chain()
    .find({ playerName: name, dueAt: { $lte: now } })
    .simplesort("dueAt")
    .limit(limit)
    .data();
  return rows.map((r) => r.questionId);
}

export async function markReviewAnswer(name: string, questionId: number, correct: boolean): Promise<void> {
  const db = await getDB();
  const coll = db.getCollection<ReviewDeckDoc>("reviewDeck");
  const existing = coll.findOne({ playerName: name, questionId });
  if (!existing) return;
  let nextBox: number;
  if (correct) {
    nextBox = Math.min(4, existing.box + 1);
    if (nextBox === 4) {
      coll.remove(existing);
      return;
    }
  } else {
    nextBox = 1;
  }
  existing.box = nextBox;
  existing.dueAt = new Date(Date.now() + LEITNER_INTERVALS_DAYS[nextBox - 1] * 24 * 60 * 60 * 1000).toISOString();
  existing.answeredCount += 1;
  coll.update(existing);
}

// ============================================================================
// Daily answers
// ============================================================================

export async function isDailyAnswered(name: string, day: string, questionId: number): Promise<boolean> {
  const db = await getDB();
  return !!db.getCollection<DailyAnswerDoc>("dailyAnswers").findOne({ playerName: name, day, questionId });
}

export async function addDailyAnswer(name: string, day: string, questionId: number, correct: boolean): Promise<void> {
  const db = await getDB();
  const coll = db.getCollection<DailyAnswerDoc>("dailyAnswers");
  if (coll.findOne({ playerName: name, day, questionId })) return;
  coll.insert({ playerName: name, day, questionId, correct });
}

export async function getDailyAnsweredCount(name: string, day: string): Promise<number> {
  const db = await getDB();
  return db.getCollection<DailyAnswerDoc>("dailyAnswers").count({ playerName: name, day });
}

// ============================================================================
// Topic mastery
// ============================================================================

export async function upsertTopicMastery(name: string, topicId: number, correct: boolean): Promise<void> {
  const db = await getDB();
  const coll = db.getCollection<TopicMasteryDoc>("topicMastery");
  const existing = coll.findOne({ playerName: name, topicId });
  if (existing) {
    existing.attempts += 1;
    existing.correct += correct ? 1 : 0;
    coll.update(existing);
  } else {
    coll.insert({ playerName: name, topicId, attempts: 1, correct: correct ? 1 : 0 });
  }
}

export async function getTopicMastery(name: string): Promise<TopicMasteryDoc[]> {
  const db = await getDB();
  return db.getCollection<TopicMasteryDoc>("topicMastery").find({ playerName: name });
}

// ============================================================================
// Export / delete all data
// ============================================================================

export async function exportPlayerData(name: string): Promise<Record<string, unknown>> {
  const db = await getDB();
  return {
    player: await getPlayer(name),
    gameHistory: await getGameHistory(name, 100),
    seenQuestions: Array.from(await getSeenQuestionIds(name)),
    reviewDeck: db.getCollection<ReviewDeckDoc>("reviewDeck").find({ playerName: name }),
    dailyAnswers: db.getCollection<DailyAnswerDoc>("dailyAnswers").find({ playerName: name }),
    topicMastery: await getTopicMastery(name),
    exportedAt: new Date().toISOString(),
  };
}
