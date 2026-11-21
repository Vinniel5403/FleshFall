/**
 * Expedition round: leave Rouge Land → come back. One inventory.
 * Loot found out there isn't handed over yet — it's this round's pending haul, delivered when you
 * get home. Die before that → you wake up at home and simply don't get this round's haul.
 * The inventory itself is never touched.
 * Every hunt won in the round raises `streak`: better loot, but Miasma thickens and monsters climb levels.
 *
 * Outsiders who haven't reached Rouge Land have no home to return to, so they get loot directly.
 * Pure data helpers — no imports from character.ts (zones.ts uses this on arrival).
 */
import { balance } from '../config.js';
import { getItem, itemLabel } from './items.js';
import { feed } from './feed.js';
import type { Character } from './types.js';

/** Loot bonus per streak step, and where it stops growing. */
const STREAK_LOOT_STEP = 0.15;
const STREAK_CAP = 8;

/** Out on an expedition round (loot pending until home)? */
export function inField(char: Character): boolean {
  return char.reachedRougeLand && char.location !== 'rouge_land';
}

export const streakOf = (char: Character) => char.trip?.streak ?? 0;
export const tripSize = (char: Character) => Object.values(char.trip?.loot ?? {}).reduce((s, n) => s + n, 0);
export const tripLines = (char: Character) => Object.entries(char.trip?.loot ?? {}).map(([id, n]) => itemLabel(id, n));

/** Add to this round's pending haul. */
export function tripGain(char: Character, id: string, qty: number): void {
  if (qty <= 0 || getItem(id)?.retired) return;
  const t = (char.trip ??= { loot: {}, streak: 0 });
  t.loot[id] = (t.loot[id] ?? 0) + qty;
}

// ---------- streak: risk vs reward ----------

export const lootMult = (char: Character) => 1 + STREAK_LOOT_STEP * Math.min(streakOf(char), STREAK_CAP);
/** Extra chance added to rare drops (base chance < 30%). */
export const rareBonus = (char: Character) => 0.03 * Math.min(streakOf(char), STREAK_CAP);
/** Miasma breathed in when starting another hunt this deep into a round. */
export const streakMiasma = (char: Character) => (streakOf(char) >= 2 ? streakOf(char) - 1 : 0);
/** Levels added to the next hunt's monsters (uncapped — the deeper the round, the harder it gets). */
export const streakLevels = (char: Character) => (inField(char) ? streakOf(char) * balance.huntStreakLevels : 0);

export function bumpStreak(char: Character): void {
  if (!inField(char)) return;
  (char.trip ??= { loot: {}, streak: 0 }).streak += 1;
}

/** "🎒 ของรอรับ 12 ชิ้น · 🔥 ล่าติดกัน 3 · ..." — shown on hunt screens. `bag: false` leaves the haul count out (the caller lists the haul itself). */
export function streakText(char: Character, bag = true): string | null {
  if (!inField(char)) return null;
  const s = streakOf(char);
  const parts = bag ? [`🎒 ของรอรับ ${tripSize(char)} ชิ้น`] : [];
  if (s > 0) parts.push(`🔥 ล่าติดกัน ${s} · ของดีขึ้น +${Math.round((lootMult(char) - 1) * 100)}%`);
  if (streakMiasma(char)) parts.push(`🌫️ Miasma ${streakMiasma(char)}/การล่า`);
  if (streakLevels(char)) parts.push(`👹 มอน +${streakLevels(char)} เลเวล`);
  return parts.length ? parts.join(' · ') : null;
}

// ---------- end of round ----------

/** Home: hand over this round's haul. Returns summary lines (empty if nothing). */
export function endTripSafe(char: Character): string[] {
  const t = char.trip;
  delete char.trip;
  const items = Object.entries(t?.loot ?? {});
  for (const [id, n] of items) char.inventory[id] = (char.inventory[id] ?? 0) + n;
  if (!items.length) return [];
  const total = items.reduce((s, [, n]) => s + n, 0);
  feed(char, 'home', `**${char.name}** กลับถึง Rouge Land พร้อมของ ${total} ชิ้น${t!.streak ? ` (ล่าติดกัน ${t!.streak} รอบ)` : ''}`);
  const text = `📦 **กลับถึงบ้าน — ได้ของจากรอบสำรวจนี้ ${items.reduce((s, [, n]) => s + n, 0)} ชิ้น** (ล่าติดกัน ${t!.streak} รอบ): ${items.map(([id, n]) => itemLabel(id, n)).join(', ')}`;
  char.banked = { text, at: Date.now() };
  return [text];
}

/** Died out there: this round's haul is gone (inventory untouched). */
export function loseTrip(char: Character): string[] {
  const lost = tripLines(char);
  delete char.trip;
  return lost.length ? [`🎒 **ไม่ได้ของจากรอบสำรวจนี้** — ${lost.join(', ')}`] : [];
}
