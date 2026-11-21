import { isDev } from './dev.js';
import { feed } from './feed.js';
/**
 * Zone hunting: spawn 3 monsters, fight turn by turn, collect raw meat / loot / XP.
 * Lucky hunts reveal a dungeon door after victory.
 */
import { balance } from '../config.js';
import { applyOutcome, consume, evadeMod, gainItem, gearAtk, hitMod, hitParts, mergeDmg, removeItem, stopped, type AppliedOutcome } from './character.js';
import { bumpStreak, lootMult, rareBonus, streakLevels, streakMiasma, streakOf } from './expedition.js';
import { chance, rand, startRun } from './engine.js';
import { d20Success, levelDC, rollTag, type DiceRoll } from './dice.js';
import { DECOR_CHANCE, DECOR_STREAK_STEP, KEEPSAKE_CHANCE, LOCAL_DROP_CHANCE, LOCAL_DROPS, RELIC_CHANCE, TIER_GEAR, pickDecor, pickWeighted, prized } from './drops.js';
import { getItem, itemLabel, VINTAGE_IDS } from './items.js';
import type { Character, Hunt, IconDoor, MonsterState, Outcome } from './types.js';
import { DOORS, DUNGEON_RULES, isCrimsonMoon } from './world.js';
import { currentZone, getZone, zoneLevel, type ZoneDef } from './zones.js';

export interface MonsterDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  /** hp / dmg / xp are the Lv 1 numbers — the city's level scales them (`balance.hunt*PerLevel`). */
  hp: number;
  /** Damage range per hit. */
  dmg: [number, number];
  xp: number;
  /** Miasma inflicted per hit. */
  miasma?: number;
  /** Sanity lost per hit. */
  sanity?: number;
  /** What its body gives. */
  drops: { item: string; chance: number; qty?: [number, number] }[];
  /** Room-decoration piece this kind guards (`KEEPSAKE_CHANCE` per kill). */
  keepsake?: string;
}

export const MONSTERS: Record<string, MonsterDef> = {
  starved_remnant: {
    id: 'starved_remnant',
    name: 'เศษเดนเนื้อหิวโหย',
    emoji: '🧟',
    desc: 'ผู้หลงมิติที่ทนความหิวไม่ไหว กัดกินแม้แต่เนื้อตัวเอง',
    hp: 8, dmg: [2, 4], xp: 6, keepsake: 'empty_icebox',
    drops: [{ item: 'raw_meat', chance: 0.9, qty: [1, 2] }, { item: 'bone', chance: 0.3 }, { item: 'pipe', chance: 0.05 }],
  },
  rot_crawler: {
    id: 'rot_crawler',
    name: 'ซากคลานเน่า',
    emoji: '🦠',
    desc: 'ก้อนเนื้อเน่าคลานได้ ทิ้งรอย Miasma ไว้ตามทาง',
    hp: 10, dmg: [1, 3], xp: 7, miasma: 3, keepsake: 'specimen_jar',
    drops: [{ item: 'rotten_flesh', chance: 0.8, qty: [1, 2] }, { item: 'raw_meat', chance: 0.3 }],
  },
  stretched_shade: {
    id: 'stretched_shade',
    name: 'เงายืดยาว',
    emoji: '👤',
    desc: 'เงาของคนจริงที่ถูกยืดจนแขนยาวถึงพื้น มันไม่ควรขยับได้',
    hp: 7, dmg: [2, 3], xp: 8, sanity: 3, keepsake: 'floor_lamp',
    drops: [{ item: 'eye_fruit', chance: 0.4 }, { item: 'raw_meat', chance: 0.4 }, { item: 'pocket_watch', chance: 0.06 }],
  },
  maw_hound: {
    id: 'maw_hound',
    name: 'หมาร้อยปาก',
    emoji: '🐕',
    desc: 'สุนัขที่ผิวหนังเต็มไปด้วยปาก — ผลงานของ Beelzebub',
    hp: 12, dmg: [3, 5], xp: 10, keepsake: 'dog_house',
    drops: [{ item: 'raw_meat', chance: 1, qty: [2, 3] }, { item: 'bone', chance: 0.5 }, { item: 'fiend_fang', chance: 0.15 }],
  },
  heretic: {
    id: 'heretic',
    name: 'สาวกนอกรีต',
    emoji: '🕯️',
    desc: 'ผู้บูชาสิ่งอื่นนอกจาก 7 Icon ท่องบทสวดผิดเพี้ยนไม่หยุด',
    hp: 11, dmg: [2, 5], xp: 12, sanity: 2, keepsake: 'church_pew',
    drops: [{ item: 'raw_meat', chance: 0.6 }, { item: 'sigil', chance: 0.12 }, { item: 'bandage', chance: 0.3 }, { item: 'kris', chance: 0.05 }],
  },
  spore_husk: {
    id: 'spore_husk',
    name: 'เปลือกสปอร์แห้ง',
    emoji: '🍄',
    desc: 'Fiend ของ Thanatos ร่างแห้งกรังพ่นสปอร์ทุกครั้งที่ขยับ',
    hp: 14, dmg: [2, 4], xp: 14, miasma: 5, keepsake: 'glass_terrarium',
    drops: [{ item: 'rotten_flesh', chance: 0.7, qty: [1, 3] }, { item: 'alchemy_salve', chance: 0.15 }, { item: 'fiend_fang', chance: 0.2 }],
  },
  shifting_fiend: {
    id: 'shifting_fiend',
    name: 'Fiend เรขาคณิต',
    emoji: '🔷',
    desc: 'Fiend ของ Loki รูปร่างหักมุมเปลี่ยนไปทุกครั้งที่กะพริบตา',
    hp: 18, dmg: [3, 6], xp: 22, sanity: 4, keepsake: 'stained_glass',
    drops: [{ item: 'raw_meat', chance: 0.8, qty: [2, 4] }, { item: 'fiend_fang', chance: 0.4 }, { item: 'sigil', chance: 0.2 }, { item: 'rusted_armor', chance: 0.04 }],
  },
};

export const getMonster = (id: string) => MONSTERS[id];

/** Every monster in a hunt is the level of the city it happens in — the hunter's own level never changes them. */
export const huntLevel = (h: Hunt): number => h.lv ?? zoneLevel(getZone(h.zone));

/** Level the next hunt here would be: city level + trip streak. */
export const nextHuntLevel = (char: Character): number => zoneLevel(currentZone(char)) + streakLevels(char);

/** ×1 at Lv 1, growing by `perLevel` for each level above it. */
const scale = (lv: number, perLevel: number) => 1 + perLevel * (lv - 1);

const scaledHp = (def: MonsterDef, lv: number) => Math.round(def.hp * scale(lv, balance.huntHpPerLevel));

/** XP for a kill: farming far below your level pays little, punching up pays a bit more. */
function xpGap(charLv: number, monLv: number): number {
  const d = monLv - charLv;
  if (d <= -6) return 0.2;
  if (d <= -3) return 0.5;
  return d > 0 ? Math.min(1.5, 1 + 0.1 * d) : 1;
}

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
  const pool = zone.monsters.map(getMonster).filter((m): m is MonsterDef => !!m);
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
  const lv = nextHuntLevel(char);
  if (lv > zoneLevel(zone)) log.push(`👹 ยิ่งล่าลึก มอนยิ่งดุ — มอนรอบนี้ Lv ${lv} (เมือง Lv ${zoneLevel(zone)})`);
  const monsters: MonsterState[] = Array.from({ length: 3 }, () => {
    const def = getMonster(pickWeighted(pool.map((m) => [m.id, zone.spawn?.[m.id] ?? 1])))!;
    const hp = scaledHp(def, lv);
    return { id: def.id, hp, maxHp: hp };
  });
  const hunt: Hunt = { zone: zone.id, monsters, lv, door: pickDoor(zone), log, loot: {}, xp: 0 };
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
  const crimson = isCrimsonMoon() && char.location !== 'rouge_land';
  const lv = huntLevel(h);
  const dc = levelDC(lv, char.level) + evadeMod(char);
  for (const m of alive(h)) {
    const def = getMonster(m.id)!;
    const roll = rand(1, 20);
    if (!d20Success(roll, 0, dc)) {
      lines.push(`-# ${nameOf(m)} พลาด \`${rollTag(roll, 0, dc)}\``);
      continue;
    }
    let dmg = Math.round(rand(def.dmg[0], def.dmg[1]) * scale(lv, balance.huntDmgPerLevel));
    if (crimson) dmg = Math.ceil(dmg * 1.3);
    const o: Outcome = { text: '', hp: -dmg };
    const soft = (n: number) => Math.max(1, Math.round(n * balance.huntSanityMult));
    if (def.miasma) o.miasma = soft(def.miasma);
    if (def.sanity) o.sanity = -soft(def.sanity);
    const a = applyOutcome(char, o);
    lines.push(`${nameOf(m)} โจมตี! ${a.lines.join(' ')}`);
    if (stopped(a)) return { lines, applied: a };
  }
  return { lines };
}

/** Meat and supplies come in piles; weapons, armor, relics and decoration one at a time. */
const piles = (item: string) => ['material', 'consumable'].includes(getItem(item)?.type ?? '');

function rollLoot(char: Character, h: Hunt, m: MonsterState): string[] {
  const def = getMonster(m.id)!;
  const z = getZone(h.zone);
  const lv = huntLevel(h);
  const got: string[] = [];
  const give = (item: string, n: number, rare: boolean) => {
    gainItem(char, item, n);
    h.loot[item] = (h.loot[item] ?? 0) + n;
    if (rare) feed(char, 'rare', `**${char.name}** ได้ ${itemLabel(item, n)} จาก ${def.name}!`);
    got.push(itemLabel(item, n));
  };
  // its body: more of it in higher cities and deeper into a streak
  const mult = scale(lv, balance.huntLootPerLevel) * lootMult(char);
  for (const d of [...def.drops, { item: 'hunted_flesh', chance: char.role === 'hound' ? 0.45 : 0.08 }]) {
    const p = d.chance < 0.3 ? d.chance + rareBonus(char) : d.chance;
    if (!chance(p)) continue;
    const n = piles(d.item) ? Math.max(1, Math.round((d.qty ? rand(d.qty[0], d.qty[1]) : 1) * mult)) : 1;
    give(d.item, n, d.chance < 0.1 && d.item !== 'hunted_flesh');
  }
  // what it carried: local goods, gear that fits the city, the piece it guarded — always one
  const carried: string[] = [];
  if (z?.continent && chance(LOCAL_DROP_CHANCE)) carried.push(pickWeighted(LOCAL_DROPS[z.continent]));
  const gear = TIER_GEAR[z?.tier ?? 'easy'];
  if (chance(gear.chance)) carried.push(gear.items[rand(0, gear.items.length - 1)]!);
  if (def.keepsake && chance(KEEPSAKE_CHANCE * lootMult(char))) carried.push(def.keepsake);
  for (const item of carried) give(item, 1, prized(item));
  h.xp += Math.max(1, Math.round(def.xp * scale(lv, balance.huntXpPerLevel) * xpGap(char.level, lv)));
  return got;
}

/** Once per hunt won — search what's left of the place: a small real-world relic, or (rarely) a room-decoration piece. */
function salvage(char: Character, h: Hunt): string[] {
  const z = getZone(h.zone);
  const found: string[] = [];
  if (chance(RELIC_CHANCE)) found.push(VINTAGE_IDS[rand(0, VINTAGE_IDS.length - 1)]!);
  if (chance(DECOR_CHANCE[z?.tier ?? 'easy'] + DECOR_STREAK_STEP * Math.min(streakOf(char), 8))) {
    const id = pickDecor(z?.continent);
    found.push(id);
    feed(char, 'rare', `**${char.name}** เจอ ${itemLabel(id)} ที่ ${z ? `${z.emoji} ${z.name}` : h.zone}!`);
  }
  for (const id of found) {
    gainItem(char, id, 1);
    h.loot[id] = (h.loot[id] ?? 0) + 1;
  }
  return found.map((id) => itemLabel(id));
}

function finishIfWon(char: Character, h: Hunt, lines: string[]): RoundResult['ended'] {
  if (alive(h).length > 0) return undefined;
  h.won = true;
  const found = salvage(char, h);
  bumpStreak(char);
  {
    const z = getZone(h.zone);
    const names = [...new Set(h.monsters.map((m) => getMonster(m.id)?.name ?? m.id))].join(', ');
    const streak = char.trip?.streak ?? 0;
    feed(char, 'hunt', `**${char.name}** ล่า ${names} ที่ ${z ? `${z.emoji} ${z.name}` : h.zone} สำเร็จ${streak > 1 ? ` (ติดกัน ${streak})` : ''}`, h.zone);
  }
  const a = applyOutcome(char, { text: '', xp: h.xp });
  lines.push('', `🏆 **กำจัดได้ทั้งหมด!**`, ...(found.length ? [`🧳 ค้นซากเจอ ${found.join(', ')}`] : []), ...a.lines);
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
  const foeLv = huntLevel(h);
  const ac = levelDC(char.level, foeLv);
  const lines: string[] = [];

  const roll = rand(1, 20);
  const mod = hitMod(char);
  const hit = d20Success(roll, mod, ac);
  const dice: DiceRoll = {
    label: `โจมตี ${def.name}`,
    mod,
    modLabel: 'พละ',
    parts: hitParts(char),
    target: ac,
    targetNote: `คุณ Lv ${char.level} · มอน Lv ${foeLv}`,
    rolls: [roll],
    success: hit,
    win: roll === 20 ? 'คริติคอล!' : 'โดน!',
    lose: 'พลาด',
  };
  if (hit) {
    let dmg = rand(1, 6) + Math.floor(char.level / 2) + gearAtk(char) + mergeDmg(char) + Math.floor(char.stats.str / 2);
    if (roll === 20) dmg *= 2;
    target.hp = Math.max(0, target.hp - dmg);
    lines.push(`⚔️ \`${rollTag(roll, mod, ac)}\` ${roll === 20 ? '**คริติคอล!** ' : ''}ฟาด ${nameOf(target)} **-${dmg}**`);
    if (target.hp === 0) {
      const got = rollLoot(char, h, target);
      lines.push(`💀 ${nameOf(target)} ล้มลง${got.length ? ` — ได้ ${got.join(', ')}` : ''}`);
    }
  } else {
    lines.push(`⚔️ \`${rollTag(roll, mod, ac)}\` ฟาดพลาด ${nameOf(target)}`);
  }

  const won = finishIfWon(char, h, lines);
  if (won) return { lines, ended: won, dice };
  const back = monstersAttack(char, h);
  lines.push(...back.lines);
  return { lines, applied: back.applied, ended: endIfFallen(char, back.applied), dice };
}

/** Consumables in the inventory that can be used mid-fight (trip loot isn't usable until home). */
export function huntUsable(char: Character): { id: string; qty: number }[] {
  return Object.entries(char.inventory)
    .filter(([id, n]) => n > 0 && getItem(id)?.type === 'consumable')
    .map(([id, qty]) => ({ id, qty }));
}

/** Thrown item (`ItemDef.blast`): hits every monster still standing — no roll, it can't miss. Kills pay out like any other. */
function throwBomb(char: Character, h: Hunt, itemId: string, [lo, hi]: [number, number]): RoundResult {
  if (!removeItem(char, itemId)) return { lines: ['ใช้ไม่ได้ หรือไม่มีของชิ้นนี้ในกระเป๋า'] };
  const lines = [`💥 ขว้าง ${itemLabel(itemId)} แทนการโจมตี!`];
  for (const m of alive(h)) {
    const dmg = rand(lo, hi) + Math.floor(char.level / 2);
    m.hp = Math.max(0, m.hp - dmg);
    if (m.hp > 0) {
      lines.push(`💥 ${nameOf(m)} **-${dmg}**`);
      continue;
    }
    const got = rollLoot(char, h, m);
    lines.push(`💀 ${nameOf(m)} **-${dmg}** ล้มลง${got.length ? ` — ได้ ${got.join(', ')}` : ''}`);
  }
  const won = finishIfWon(char, h, lines);
  if (won) return { lines, ended: won };
  const back = monstersAttack(char, h);
  lines.push(...back.lines);
  return { lines, applied: back.applied, ended: endIfFallen(char, back.applied) };
}

/** Spend the turn on an item instead of attacking (heal / stamina / sanity / timed buff, or a thrown bomb), then survivors strike back. */
export function useInHunt(char: Character, itemId: string): RoundResult {
  const h = char.hunt;
  if (char.dying) return { lines: ['🩸 คุณกำลังจะตาย — เลือก 🥚 ใช้รกคืนชีพ หรือ ☠️ ยอมตาย ก่อน'], ended: 'dying' };
  if (!h || h.won || alive(h).length === 0) return { lines: ['การต่อสู้จบไปแล้ว'] };
  const blast = getItem(itemId)?.blast;
  if (blast) return throwBomb(char, h, itemId, blast);
  const got = consume(char, itemId);
  if (!got) return { lines: ['ใช้ไม่ได้ หรือไม่มีของชิ้นนี้ในกระเป๋า'] };
  const lines = [`🎒 ใช้ ${itemLabel(itemId)} แทนการโจมตี${got.length ? ` — ${got.join(' ')}` : ''}`];
  if (char.fiend) {
    // e.g. raw flesh at rock-bottom humanity: the hunt is over, you are the monster now
    delete char.hunt;
    return { lines, ended: 'died' };
  }
  const back = monstersAttack(char, h);
  lines.push(...back.lines);
  return { lines, applied: back.applied, ended: endIfFallen(char, back.applied) };
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
