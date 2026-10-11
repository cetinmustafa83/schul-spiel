import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

/**
 * PIN / Rettungscode hashing using scrypt (memory-hard KDF, built-in to Node).
 * Equivalent strength to argon2id for the purpose of this kids' app, without
 * requiring native modules.
 *
 * PINs and rescue codes never leave the server. PINs are never logged.
 */

const KEY_LEN = 64;
// Scrypt params: N=2^14, r=8, p=1 → ~16 MiB memory. Stays under Node's
// default 32 MiB scryptSync memory cap. Strong enough for a kids' app.
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export function hashSecret(secret: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(secret.normalize("NFC"), salt, KEY_LEN, PARAMS);
  // Format: scrypt$<saltHex>$<derivedHex>
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifySecret(secret: string, hash: string): boolean {
  try {
    const [scheme, saltHex, derivedHex] = hash.split("$");
    if (scheme !== "scrypt" || !saltHex || !derivedHex) return false;
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(derivedHex, "hex");
    const derived = scryptSync(secret.normalize("NFC"), salt, expected.length, PARAMS);
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function randomPin(length = 4): string {
  // For dev/test only — real users pick their own PIN.
  let out = "";
  const buf = randomBytes(length);
  for (let i = 0; i < length; i++) out += (buf[i] % 10).toString();
  return out;
}

export function randomTag(): string {
  // 4-digit non-zero-leading tag — keeps handle compact.
  const n = Math.floor(1000 + Math.random() * 9000);
  return n.toString();
}

const TRIVIAL_PINS = new Set([
  "0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999",
  "1234", "4321", "2580", "0852", "1357", "2468", "0123", "9876", "1379", "7531",
]);

export function isPinTrivial(pin: string): boolean {
  if (TRIVIAL_PINS.has(pin)) return true;
  // Repeated 2-digit pattern (e.g., "1212", "3434")
  if (/^(\d{2})\1$/.test(pin)) return true;
  // Sequential ascending/descending runs (e.g., "4567", "7654")
  if (/^(0123|1234|2345|3456|4567|5678|6789)$/.test(pin)) return true;
  if (/^(9876|8765|7654|6543|5432|4321|3210)$/.test(pin)) return true;
  return false;
}

/** Player-visible handle: "Mutiger Fuchs#4821". */
export function formatHandle(displayName: string, tag: string): string {
  return `${displayName}#${tag}`;
}

export function parseHandle(handle: string): { name: string; tag: string } | null {
  const m = /^(.+?)#(\d{4})$/.exec(handle.trim());
  if (!m) return null;
  return { name: m[1], tag: m[2] };
}
