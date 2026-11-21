/**
 * Dev-only shortcuts (the /dev command). Discord-free so they can be smoke-tested offline.
 * The caller checks isDev() — nothing here does.
 */
import { applyOutcome, type AppliedOutcome } from './character.js';
import { inField } from './expedition.js';
import { attack, forceWin, leaveHunt, startHunt } from './hunt.js';
import { balance } from '../config.js';
import type { Character } from './types.js';

export interface AutoHuntReport {
  wins: number;
  doors: number;
  /** why the run stopped early ('' = finished every hunt) */
  stop: string;
  xp: number;
  levels: number;
  /** items gained (trip bag while out in the field, inventory otherwise) */
  loot: Record<string, number>;
}

const MAX_ROUNDS = 200;

/**
 * Run `count` hunts back to back in the current city. Default = forced win (`forceWin`: real loot/XP, no dice);
 * `real` fights it out instead, always hitting the weakest monster still standing, and stops when you fall.
 */
export function autoHunt(char: Character, count: number, opts: { deep?: boolean; heal?: boolean; real?: boolean } = {}): AutoHuntReport {
  const r: AutoHuntReport = { wins: 0, doors: 0, stop: '', xp: 0, levels: 0, loot: {} };
  const bagBefore = { ...(inField(char) ? char.trip?.loot : char.inventory) };
  const startLv = char.level;
  const startXp = char.xp;
  if (char.hunt && !char.hunt.won) return { ...r, stop: 'ยังติดการล่าค้างอยู่ — จบอันนั้นก่อน' };
  if (char.hunt) leaveHunt(char);

  for (let n = 0; n < count; n++) {
    if (!opts.deep && char.trip) char.trip.streak = 0;
    if (opts.heal) char.hp = char.maxHp;
    const s = startHunt(char);
    if (!s.ok) {
      r.stop = s.error;
      break;
    }
    let ended = opts.real ? undefined : forceWin(char).ended;
    for (let round = 0; round < MAX_ROUNDS && !ended; round++) {
      const h = char.hunt!;
      const idx = h.monsters.reduce((best, m, i) => (m.hp > 0 && (best < 0 || m.hp < h.monsters[best]!.hp) ? i : best), -1);
      ended = attack(char, idx).ended;
    }
    if (ended !== 'won') {
      r.stop = ended === 'dying' ? '🩸 กำลังจะตาย — เปิดการล่าค้างเพื่อเลือก 🥚 / ☠️' : ended ? '💀 ล้มระหว่างการล่า' : 'การล่ายืดเยื้อเกินไป';
      break;
    }
    r.wins++;
    if (char.hunt?.door) r.doors++;
    leaveHunt(char);
  }

  const bagAfter = inField(char) ? (char.trip?.loot ?? {}) : char.inventory;
  for (const [id, q] of Object.entries(bagAfter)) {
    const d = q - (bagBefore[id] ?? 0);
    if (d > 0) r.loot[id] = d;
  }
  r.levels = char.level - startLv;
  r.xp = levelXp(startLv, char.level) - startXp + char.xp;
  return r;
}

/** Total XP from the start of `from` to the start of `to`. */
function levelXp(from: number, to: number): number {
  let s = 0;
  for (let l = from; l < to; l++) s += balance.xpForLevel(l);
  return s;
}

/** Raise to `level` through the normal level-up path (HP/stamina/stat gains, humanity −2 per level). */
export function raiseLevel(char: Character, level: number): AppliedOutcome | null {
  if (level <= char.level) return null;
  return applyOutcome(char, { text: '', xp: levelXp(char.level, level) - char.xp });
}

/** Full HP/stamina/sanity and back on their feet if downed or dying. */
export function fullHeal(char: Character): void {
  char.hp = char.maxHp;
  char.stamina = char.maxStamina;
  char.sanity = 100;
  delete char.downed;
  delete char.dying;
}

