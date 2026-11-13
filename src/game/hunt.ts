import { isDev } from './dev.js';
/**
 * Zone hunting: spawn 3 monsters, fight turn by turn, collect raw meat / loot / XP.
 * Lucky hunts reveal a dungeon door after victory.
 */
import { balance } from '../config.js';
import { applyOutcome, gainItem, gearAtk, statMod, stopped, type AppliedOutcome } from './character.js';
import { bumpStreak, lootMult, rareBonus, streakDmg, streakMiasma } from './expedition.js';
import { chance, rand, startRun } from './engine.js';
import { d20Success, type DiceRoll } from './dice.js';
import { itemLabel } from './items.js';
import type { Character, Hunt, IconDoor, MonsterState, Outcome } from './types.js';
import { DOORS, DUNGEON_RULES, isCrimsonMoon } from './world.js';
import { currentZone, getZone, zoneTier, type TierDef, type ZoneDef } from './zones.js';

export interface MonsterDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  hp: number;
  /** Armor class the player's d20 must meet. */
  ac: number;
  /** Damage range per hit. */
  dmg: [number, number];
  /** Monster's chance to hit per attack (before agility). */
  hit: number;
  xp: number;
  minLevel?: number;
  /** Miasma inflicted per hit. */
  miasma?: number;
  /** Sanity lost per hit. */
  sanity?: number;
  drops: { item: string; chance: number; qty?: [number, number] }[];
}

export const MONSTERS: Record<string, MonsterDef> = {
  starved_remnant: {
    id: 'starved_remnant',
    name: 'เศษเดนเนื้อหิวโหย',
    emoji: '🧟',
    desc: 'ผู้หลงมิติที่ทนความหิวไม่ไหว กัดกินแม้แต่เนื้อตัวเอง',
    hp: 8, ac: 9, dmg: [2, 4], hit: 0.55, xp: 6,
    drops: [{ item: 'raw_meat', chance: 0.9, qty: [1, 2] }, { item: 'bone', chance: 0.3 }, { item: 'pipe', chance: 0.05 }],
  },
  rot_crawler: {
    id: 'rot_crawler',
    name: 'ซากคลานเน่า',
    emoji: '🦠',
    desc: 'ก้อนเนื้อเน่าคลานได้ ทิ้งรอย Miasma ไว้ตามทาง',
    hp: 10, ac: 8, dmg: [1, 3], hit: 0.5, xp: 7, miasma: 3,
    drops: [{ item: 'rotten_flesh', chance: 0.8, qty: [1, 2] }, { item: 'raw_meat', chance: 0.3 }],
  },
  stretched_shade: {
    id: 'stretched_shade',
    name: 'เงายืดยาว',
    emoji: '👤',
    desc: 'เงาของคนจริงที่ถูกยืดจนแขนยาวถึงพื้น มันไม่ควรขยับได้',
    hp: 7, ac: 12, dmg: [2, 3], hit: 0.6, xp: 8, sanity: 3,
    drops: [{ item: 'eye_fruit', chance: 0.4 }, { item: 'raw_meat', chance: 0.4 }, { item: 'pocket_watch', chance: 0.06 }],
  },
  maw_hound: {
    id: 'maw_hound',
    name: 'หมาร้อยปาก',
    emoji: '🐕',
    desc: 'สุนัขที่ผิวหนังเต็มไปด้วยปาก — ผลงานของ Beelzebub',
    hp: 12, ac: 10, dmg: [3, 5], hit: 0.6, xp: 10, minLevel: 2,
    drops: [{ item: 'raw_meat', chance: 1, qty: [2, 3] }, { item: 'bone', chance: 0.5 }, { item: 'fiend_fang', chance: 0.15 }],
  },
  heretic: {
    id: 'heretic',
    name: 'สาวกนอกรีต',
    emoji: '🕯️',
    desc: 'ผู้บูชาสิ่งอื่นนอกจาก 7 Icon ท่องบทสวดผิดเพี้ยนไม่หยุด',
    hp: 11, ac: 11, dmg: [2, 5], hit: 0.55, xp: 12, minLevel: 2, sanity: 2,
    drops: [{ item: 'raw_meat', chance: 0.6 }, { item: 'sigil', chance: 0.12 }, { item: 'bandage', chance: 0.3 }, { item: 'kris', chance: 0.05 }],
  },
  spore_husk: {
    id: 'spore_husk',
    name: 'เปลือกสปอร์แห้ง',
    emoji: '🍄',
    desc: 'Fiend ของ Thanatos ร่างแห้งกรังพ่นสปอร์ทุกครั้งที่ขยับ',
    hp: 14, ac: 10, dmg: [2, 4], hit: 0.5, xp: 14, minLevel: 3, miasma: 5,
    drops: [{ item: 'rotten_flesh', chance: 0.7, qty: [1, 3] }, { item: 'alchemy_salve', chance: 0.15 }, { item: 'fiend_fang', chance: 0.2 }],
  },
  shifting_fiend: {
    id: 'shifting_fiend',
    name: 'Fiend เรขาคณิต',
    emoji: '🔷',
    desc: 'Fiend ของ Loki รูปร่างหักมุมเปลี่ยนไปทุกครั้งที่กะพริบตา',
    hp: 18, ac: 13, dmg: [3, 6], hit: 0.6, xp: 22, minLevel: 5, sanity: 4,
    drops: [{ item: 'raw_meat', chance: 0.8, qty: [2, 4] }, { item: 'fiend_fang', chance: 0.4 }, { item: 'sigil', chance: 0.2 }, { item: 'rusted_armor', chance: 0.04 }],
  },
};

export const getMonster = (id: string) => MONSTERS[id];

/** Monster hp grows a little with the hunter's level. */
const scaledHp = (def: MonsterDef, level: number, t: TierDef) => Math.round((def.hp + Math.floor((level - 1) * 1.5)) * t.hpMul);

/** Difficulty of the zone this hunt happens in. */
const huntTier = (h: Hunt): TierDef => zoneTier(getZone(h.zone));

function pickDoor(zone: ZoneDef): IconDoor | undefined {
  const w = zone.doorWeights;
  if (!w || !chance(balance.huntDoorChance)) return undefined;
  const entries = Object.entries(w) as [IconDoor, number][];
  let r = Math.random() * entries.reduce((s, [, n]) => s + n, 0);
  for (const [c, n] of entries) if ((r -= n) < 0) return c;
  return entries[0]![0];
}

export type HuntStart = { ok: true; hunt: Hunt } | { ok: false; error: string };

export function startHunt(char: Character): HuntStart {
  const zone = currentZone(char);
  const pool = zone.monsters.map(getMonster).filter((m): m is MonsterDef => !!m && (m.minLevel ?? 1) <= char.level + zoneTier(zone).lvlBonus);
  if (pool.length === 0) return { ok: false, error: `ไม่มีอะไรให้ล่าที่ ${zone.name}` };
  if (!isDev(char) && char.stamina < balance.huntStaminaCost) {
    return { ok: false, error: `หมดแรง ⚡ ${char.stamina}/${char.maxStamina} — พักก่อน (ฟื้น +1 ทุก 5 นาที)` };
  }
  if (!isDev(char)) char.stamina -= balance.huntStaminaCost;
  const log = ['ความเคลื่อนไหวรอบตัว... มีบางอย่างพุ่งออกมา!'];
  const miasma = streakMiasma(char);
  if (miasma) {
    // deeper into the trip, the air itself is rotting
    const a = applyOutcome(char, { text: '', miasma });
    const line = `🌫️ อยู่ข้างนอกนานเกินไป Miasma หนาขึ้นทุกที — ${a.lines.join(' ')}`;
    if (stopped(a)) return { ok: false, error: line };
    log.unshift(`-# ${line}`);
  }
  const monsters: MonsterState[] = Array.from({ length: 3 }, () => {
    const def = pool[rand(0, pool.length - 1)]!;
    const hp = scaledHp(def, char.level, zoneTier(zone));
    return { id: def.id, hp, maxHp: hp };
  });
  const hunt: Hunt = { zone: zone.id, monsters, door: pickDoor(zone), log, loot: {}, xp: 0 };
  char.hunt = hunt;
  return { ok: true, hunt };
}

export interface RoundResult {
  lines: string[];
  applied?: AppliedOutcome;
  /** Hunt ended: won / died (or downed/broke/Fiend) — or paused: dying = placenta-or-give-up choice, hunt kept. */
  ended?: 'won' | 'died' | 'dying';
  /** The player's d20 this round (for the dice animation). */
  dice?: DiceRoll;
}

const alive = (h: Hunt) => h.monsters.filter((m) => m.hp > 0);
const nameOf = (m: MonsterState) => {
  const d = getMonster(m.id);
  return d ? `${d.emoji} ${d.name}` : m.id;
};

/** Each living monster takes a swing. Returns lines; stops early if the hunter falls. */
function monstersAttack(char: Character, h: Hunt): { lines: string[]; applied?: AppliedOutcome } {
  const lines: string[] = [];
  const dodge = Math.min(0.25, Math.max(0, statMod(char, 'agi')) * 0.03);
  const crimson = isCrimsonMoon() && char.location !== 'rouge_land';
  const t = huntTier(h);
  for (const m of alive(h)) {
    const def = getMonster(m.id)!;
    if (!chance(def.hit + t.hitAdd - dodge)) {
      lines.push(`-# ${nameOf(m)} พลาด`);
      continue;
    }
    let dmg = rand(def.dmg[0], def.dmg[1]) + t.dmgAdd + streakDmg(char);
    if (crimson) dmg = Math.ceil(dmg * 1.3);
    const o: Outcome = { text: '', hp: -dmg };
    if (def.miasma) o.miasma = def.miasma;
    if (def.sanity) o.sanity = -def.sanity;
    const a = applyOutcome(char, o);
    lines.push(`${nameOf(m)} โจมตี! ${a.lines.join(' ')}`);
    if (stopped(a)) return { lines, applied: a };
  }
  return { lines };
}

function rollLoot(char: Character, h: Hunt, m: MonsterState): string[] {
  const def = getMonster(m.id)!;
  const t = huntTier(h);
  const got: string[] = [];
  const mult = t.lootMul * lootMult(char);
  const drops = [...def.drops, { item: 'hunted_flesh', chance: char.role === 'hound' ? 0.45 : 0.08 }];
  for (const d of drops) {
    const p = d.chance < 0.3 ? d.chance + rareBonus(char) : d.chance;
    if (!chance(p)) continue;
    const n = Math.max(1, Math.round((d.qty ? rand(d.qty[0], d.qty[1]) : 1) * mult));
    gainItem(char, d.item, n);
    h.loot[d.item] = (h.loot[d.item] ?? 0) + n;
    got.push(itemLabel(d.item, n));
  }
  h.xp += Math.round(def.xp * t.xpMul);
  return got;
}

function finishIfWon(char: Character, h: Hunt, lines: string[]): RoundResult['ended'] {
  if (alive(h).length > 0) return undefined;
  h.won = true;
  bumpStreak(char);
  const a = applyOutcome(char, { text: '', xp: h.xp });
  lines.push('', `🏆 **กำจัดได้ทั้งหมด!**`, ...a.lines);
  if (h.door) lines.push(`\n${DOORS[h.door].emoji} **ท่ามกลางซากศพ มี${DOORS[h.door].name}ปรากฏขึ้น...**`);
  return 'won';
}

function endIfFallen(char: Character, a: AppliedOutcome | undefined): RoundResult['ended'] {
  if (!a) return undefined;
  if (a.dying && !a.becameFiend) return 'dying'; // hunt stays: placenta revive resumes the fight
  if (!(a.died || a.downed || a.brokeDown || a.becameFiend)) return undefined;
  delete char.hunt;
  return 'died';
}

/** Attack monster at index, then survivors strike back. */
export function attack(char: Character, idx: number): RoundResult {
  const h = char.hunt;
  const target = h?.monsters[idx];
  if (char.dying) return { lines: ['🩸 คุณกำลังจะตาย — เลือก 🥚 ใช้รกคืนชีพ หรือ ☠️ ยอมตาย ก่อน'], ended: 'dying' };
  if (!h || h.won || !target || target.hp <= 0) return { lines: ['เป้าหมายไม่อยู่แล้ว'] };
  const def = getMonster(target.id)!;
  const ac = def.ac + huntTier(h).acAdd;
  const lines: string[] = [];

  const roll = rand(1, 20);
  const mod = statMod(char, 'str');
  const hit = d20Success(roll, mod, ac);
  const dice: DiceRoll = { label: `โจมตี ${def.name}`, mod, target: ac, rolls: [roll], success: hit, win: roll === 20 ? 'คริติคอล!' : 'โดน!', lose: 'พลาด' };
  if (hit) {
    let dmg = rand(1, 6) + Math.floor(char.level / 4) + gearAtk(char) + Math.floor(char.stats.str / 2);
    if (roll === 20) dmg *= 2;
    target.hp = Math.max(0, target.hp - dmg);
    lines.push(`⚔️ \`🎲 ${roll + mod}/${ac}\` ${roll === 20 ? '**คริติคอล!** ' : ''}ฟาด ${nameOf(target)} **-${dmg}**`);
    if (target.hp === 0) {
      const got = rollLoot(char, h, target);
      lines.push(`💀 ${nameOf(target)} ล้มลง${got.length ? ` — ได้ ${got.join(', ')}` : ''}`);
    }
  } else {
    lines.push(`⚔️ \`🎲 ${roll + mod}/${ac}\` ฟาดพลาด ${nameOf(target)}`);
  }

  const won = finishIfWon(char, h, lines);
  if (won) return { lines, ended: won, dice };
  const back = monstersAttack(char, h);
  lines.push(...back.lines);
  return { lines, applied: back.applied, ended: endIfFallen(char, back.applied), dice };
}

// No fleeing: a hunt ends when every monster is dead — or you are.

/** After a lucky victory: step through the door into a dungeon run. */
export function enterHuntDoor(char: Character): boolean {
  const h = char.hunt;
  if (!h?.won || !h.door || char.location !== 'old_realm') return false;
  startRun(char, h.door);
  delete char.hunt;
  return true;
}

export function leaveHunt(char: Character): void {
  delete char.hunt;
}
