import { isGod } from './god.js';
import { balance } from '../config.js';
import { db } from '../db/index.js';
import { ICONS, mods } from './icons.js';
import { getItem, itemLabel } from './items.js';
import { ROLES } from './roles.js';
import { CHAR_VERSION, type Character, type IconId, type Outcome, type RoleId, type StatKey } from './types.js';
import { isCrimsonMoon, LOCATIONS } from './world.js';
import { resolveTravel } from './zones.js';

/** Build a fresh character without saving it (web demo, sims). */
export function newCharacter(userId: string, name: string, role: RoleId, icon: IconId): Character {
  const r = ROLES[role];
  const m = mods(icon);
  const now = Date.now();
  const maxHp = r.maxHp + (m.maxHpMod ?? 0);
  const maxStamina = r.maxStamina + (m.maxStaminaMod ?? 0);
  const char: Character = {
    version: CHAR_VERSION,
    userId,
    name,
    role,
    icon,
    location: r.start,
    reachedRougeLand: r.reachedRougeLand,
    level: 1,
    xp: 0,
    hp: maxHp,
    maxHp,
    stamina: maxStamina,
    maxStamina,
    humanity: r.humanity,
    sanity: r.sanity,
    flesh: r.flesh,
    stats: { ...r.stats },
    inventory: { ...r.startItems },
    equipped: {},
    mutations: [],
    cooldowns: {},
    fiend: false,
    lastRegenAt: now,
    createdAt: now,
    deaths: 0,
    breakdowns: 0,
    eventsCompleted: 0,
    dungeonsCleared: 0,
  };
  if (r.weapon) addItem(char, r.weapon), (char.equipped.weapon = r.weapon);
  if (r.armor) addItem(char, r.armor), (char.equipped.armor = r.armor);
  return char;
}

export function createCharacter(userId: string, name: string, role: RoleId, icon: IconId): Character {
  const char = newCharacter(userId, name, role, icon);
  db.saveCharacter(char);
  return char;
}

/** Load a character and apply passive regen. Old-schema characters are discarded. */
export function loadCharacter(userId: string): Character | undefined {
  const char = db.getCharacter(userId);
  if (!char) return undefined;
  if (char.version !== CHAR_VERSION) {
    db.deleteCharacter(userId);
    return undefined;
  }
  regen(char);
  resolveTravel(char);
  return char;
}

export function saveCharacter(char: Character): void {
  db.saveCharacter(char);
}

export function regen(char: Character, now = Date.now()): void {
  const ticks = Math.floor((now - char.lastRegenAt) / balance.staminaRegenMs);
  if (ticks <= 0) return;
  char.lastRegenAt += ticks * balance.staminaRegenMs;
  if (char.fiend) return;
  const m = mods(char.icon);
  char.stamina = Math.min(char.maxStamina, char.stamina + ticks * (m.staminaRegenMult ?? 1));
  if (m.hpRegenPerTick) char.hp = Math.min(char.maxHp, char.hp + ticks * m.hpRegenPerTick);
}

// ---------- inventory ----------

export function itemCount(char: Character, id: string): number {
  return char.inventory[id] ?? 0;
}

export function addItem(char: Character, id: string, qty = 1): void {
  const n = itemCount(char, id) + qty;
  if (n <= 0) {
    delete char.inventory[id];
    if (char.equipped.weapon === id) delete char.equipped.weapon;
    if (char.equipped.armor === id) delete char.equipped.armor;
  } else char.inventory[id] = n;
}

export function removeItem(char: Character, id: string, qty = 1): boolean {
  if (itemCount(char, id) < qty) return false;
  addItem(char, id, -qty);
  return true;
}

// ---------- stats ----------

export function gearAtk(char: Character): number {
  const w = char.equipped.weapon;
  return w ? (getItem(w)?.atk ?? 0) + (char.gearLevels?.[w] ?? 0) : 0;
}

export function gearDef(char: Character): number {
  const a = char.equipped.armor;
  return (a ? (getItem(a)?.def ?? 0) + (char.gearLevels?.[a] ?? 0) : 0) + (mods(char.icon).dmgReduction ?? 0);
}

export function statMod(char: Character, stat: StatKey): number {
  const m = mods(char.icon);
  let v = char.stats[stat] + Math.floor(char.level / 3);
  if (stat === 'str') v += gearAtk(char);
  v += m.checkBonus?.[stat] ?? 0;
  if (m.lowHpBonus && char.hp < char.maxHp * 0.3) v += m.lowHpBonus;
  if (char.role === 'hound' && stat === 'str' && char.location !== 'rouge_land') v += 1;
  if (char.sanity < 30) v -= 2; // hallucinations
  return v;
}

export function seesHints(char: Character): boolean {
  return char.role === 'survivor' || !!mods(char.icon).seesHints;
}

export function humanityTier(h: number): string {
  if (h > 70) return 'มนุษย์';
  if (h > 40) return 'เริ่มกลายพันธุ์';
  if (h > 15) return 'Flesh Remnant';
  return 'ใกล้กลายเป็น Fiend';
}

// ---------- outcome application ----------

export interface AppliedOutcome {
  lines: string[];
  leveledUp: boolean;
  died: boolean;
  brokeDown: boolean;
  becameFiend: boolean;
}

const MUTATIONS = [
  'ดวงตาดวงที่สามงอกบนหน้าผาก',
  'ปากเล็ก ๆ บนฝ่ามือซ้าย',
  'ก้อนเนื้องอกเต้นตุบ ๆ ที่ไหล่',
  'นิ้วที่เจ็ดงอกออกมา',
  'สายรกงอกจากแผ่นหลัง',
  'ดอกไม้เนื้อบานที่ข้อศอก',
  'ฟันซี่ใหม่ขึ้นที่ต้นคอ',
];

export function applyOutcome(char: Character, o: Outcome): AppliedOutcome {
  const m = mods(char.icon);
  const lines: string[] = [];
  const res: AppliedOutcome = { lines, leveledUp: false, died: false, brokeDown: false, becameFiend: false };
  const crimson = isCrimsonMoon() && char.location !== 'rouge_land';

  if (o.hp) {
    let delta = o.hp;
    if (delta < 0) delta = Math.min(-1, delta + gearDef(char));
    const before = char.hp;
    char.hp = Math.max(0, Math.min(char.maxHp, char.hp + delta));
    const real = char.hp - before;
    if (real !== 0) lines.push(real > 0 ? `🩸 +${real} เนื้อกาย` : `💔 ${real} เนื้อกาย`);
  }
  if (o.stamina) {
    const before = char.stamina;
    char.stamina = Math.max(0, Math.min(char.maxStamina, char.stamina + o.stamina));
    const real = char.stamina - before;
    if (real !== 0) lines.push(`⚡ ${real > 0 ? '+' : ''}${real} แรง`);
  }
  if (o.flesh) {
    let f = o.flesh;
    if (f > 0 && char.role === 'hound' && char.location !== 'rouge_land') f = Math.round(f * 1.25);
    char.flesh = Math.max(0, char.flesh + f);
    lines.push(`🥩 ${f > 0 ? '+' : ''}${f} เนื้อสด`);
  }
  if (o.items) {
    for (const [id, qty] of Object.entries(o.items)) {
      if (!qty) continue;
      if (qty > 0) addItem(char, id, qty);
      else removeItem(char, id, Math.min(-qty, itemCount(char, id)));
      lines.push(`${qty > 0 ? '📦 +' : '🗑️ -'}${itemLabel(id, Math.abs(qty))}`);
    }
  }
  if (o.miasma && o.miasma > 0) {
    if (m.miasmaImmune) {
      lines.push(`💀 Thanatos ปกป้อง — ไม่ได้รับผลจาก Miasma`);
    } else {
      const mult = char.role === 'survivor' ? 0.5 : 1;
      changeSanity(char, -Math.round(o.miasma * mult), crimson, lines, '🌫️ Miasma');
      changeHumanity(char, -Math.ceil((o.miasma * mult) / 3), lines);
    }
  }
  if (o.sanity) changeSanity(char, o.sanity, crimson, lines);
  if (o.humanity) changeHumanity(char, o.humanity, lines);
  if (o.mutation) {
    char.mutations.push(o.mutation);
    lines.push(`🧬 กลายพันธุ์: ${o.mutation}`);
  }
  if (o.xp) {
    char.xp += o.xp;
    lines.push(`✨ +${o.xp} XP`);
    while (char.xp >= balance.xpForLevel(char.level)) {
      char.xp -= balance.xpForLevel(char.level);
      levelUp(char, lines);
      res.leveledUp = true;
    }
  }
  if (o.unlockRougeLand && !char.reachedRougeLand) {
    char.reachedRougeLand = true;
    lines.push('🩸 **คุณได้เหยียบแผ่นดิน Rouge Land เป็นครั้งแรก** — ใช้ `/travel` ไปมาได้แล้ว');
  }
  if (o.travel && o.travel !== char.location) {
    char.location = o.travel;
    lines.push(`🧭 ย้ายไป ${LOCATIONS[o.travel].emoji} ${LOCATIONS[o.travel].name}`);
  }

  // --- consequences, most severe first ---
  if (char.humanity <= 0) {
    becomeFiend(char, lines);
    res.becameFiend = true;
    return res;
  }
  if (char.hp <= 0) {
    die(char, lines);
    res.died = true;
  } else if (char.sanity <= 0) {
    breakdown(char, lines);
    res.brokeDown = true;
  }
  if (char.humanity <= 0) {
    becomeFiend(char, lines);
    res.becameFiend = true;
  }
  return res;
}

export function changeHumanity(char: Character, delta: number, lines: string[]): void {
  const m = mods(char.icon);
  let d = delta;
  if (d < 0) d = Math.round(d * (m.humanityLossMult ?? 1)) || -1;
  const before = char.humanity;
  char.humanity = Math.max(0, Math.min(100, char.humanity + d));
  const real = char.humanity - before;
  if (real !== 0) lines.push(`${real > 0 ? '🕊️ +' : '🫀 '}${real} ความเป็นมนุษย์`);
}

function changeSanity(char: Character, delta: number, crimson: boolean, lines: string[], label = '🧠'): void {
  const m = mods(char.icon);
  let d = delta;
  if (d < 0) d = Math.round(d * (m.sanityLossMult ?? 1) * (crimson ? 1.5 : 1)) || -1;
  const before = char.sanity;
  char.sanity = Math.max(0, Math.min(100, char.sanity + d));
  const real = char.sanity - before;
  if (real !== 0) lines.push(`${label} ${real > 0 ? '+' : ''}${real} สติ${crimson && real < 0 ? ' (🌕 Crimson Moon)' : ''}`);
}

function levelUp(char: Character, lines: string[]): void {
  const m = mods(char.icon);
  char.level += 1;
  char.maxHp += 4;
  char.maxStamina += 1;
  char.hp = char.maxHp;
  char.stamina = char.maxStamina;
  const main = (Object.entries(ROLES[char.role].stats) as [StatKey, number][]).sort((a, b) => b[1] - a[1])[0]![0];
  char.stats[main] += 1;
  lines.push(`🆙 **เลเวล ${char.level}!** — พลังจาก ${ICONS[char.icon].name} ไหลเข้าสู่ร่าง`);
  changeHumanity(char, -2, lines);
  if (!char.reachedRougeLand && char.level >= balance.rougeLandUnlockLevel) {
    char.reachedRougeLand = true;
    lines.push('🩸 **Rouge Land เปิดรับคุณแล้ว** — ร่างนี้แกร่งพอจะเดินเข้าแผ่นดินสีแดงได้เอง กด 🏠 เมื่อพร้อม');
  }
  if (m.mutateOnLevel) {
    const mut = MUTATIONS[Math.floor(Math.random() * MUTATIONS.length)]!;
    char.mutations.push(mut);
    lines.push(`🧬 Sophia ประทาน: ${mut}`);
  }
}

function die(char: Character, lines: string[]): void {
  const m = mods(char.icon);
  char.deaths += 1;
  delete char.run;
  delete char.pendingEvent;
  if (m.deathKeepsFlesh) {
    lines.push('🥚 **คุณตาย...** Sophia กลืนซากของคุณและให้กำเนิดใหม่ด้วยความรัก — แต่วิญญาณบางส่วนหายไป');
    changeHumanity(char, -5, lines);
  } else {
    const lost = Math.floor(char.flesh * balance.deathGoldLossPct);
    char.flesh -= lost;
    lines.push(`☠️ **คุณตาย** ร่างถูกแล่ เสียเนื้อสด ${lost}`);
  }
  if (m.maimOnDeath) {
    char.maxHp = Math.max(10, char.maxHp - 3);
    lines.push('⛓️ Belphegor พรากบางส่วนของร่างไปตลอดกาล (เนื้อกายสูงสุด -3)');
  }
  char.hp = Math.ceil(char.maxHp / 2);
  char.stamina = Math.floor(char.maxStamina / 2);
  char.location = char.reachedRougeLand ? 'rouge_land' : 'old_realm';
  lines.push(`คุณฟื้นขึ้นที่ ${LOCATIONS[char.location].name}`);
}

function breakdown(char: Character, lines: string[]): void {
  char.breakdowns += 1;
  delete char.run;
  delete char.pendingEvent;
  const droppable = Object.keys(char.inventory).filter((id) => id !== char.equipped.weapon && id !== char.equipped.armor);
  const lostItem = droppable[Math.floor(Math.random() * droppable.length)];
  if (lostItem) removeItem(char, lostItem, itemCount(char, lostItem));
  char.sanity = 40;
  char.stamina = 0;
  lines.push(`🌀 **สติแตก!** คุณกรีดร้องวิ่งหนีจนหมดแรง${lostItem ? ` ทำ ${itemLabel(lostItem)} หายทั้งหมด` : ''}`);
  changeHumanity(char, -5, lines);
}

function becomeFiend(char: Character, lines: string[]): void {
  char.fiend = true;
  char.humanity = 0;
  delete char.run;
  delete char.pendingEvent;
  lines.push(
    `👹 **${char.name} สูญสิ้นความเป็นมนุษย์ทั้งหมด และกลายเป็น Fiend แห่ง ${ICONS[char.icon].name}** — การกลายพันธุ์นี้ย้อนกลับไม่ได้\nใช้ \`/start\` เพื่อเริ่มชีวิตใหม่`,
  );
}

// ---------- cooldowns ----------

export function cooldownLeft(char: Character, key: string, now = Date.now()): number {
  if (isGod(char)) return 0;
  return Math.max(0, (char.cooldowns[key] ?? 0) - now);
}

export function setCooldown(char: Character, key: string, ms: number, now = Date.now()): void {
  char.cooldowns[key] = now + ms;
}

/** Eat/use a consumable. Returns result lines, or null if not usable. */
export function consume(char: Character, id: string): string[] | null {
  const def = getItem(id);
  if (!def || def.type !== 'consumable' || !removeItem(char, id)) return null;
  const m = mods(char.icon);
  const lines: string[] = [];
  const mult = m.healItemMult ?? 1;
  const o: Outcome = { text: '' };
  if (def.heal) o.hp = Math.round(def.heal * mult);
  if (def.stamina) o.stamina = Math.round(def.stamina * mult);
  if (def.sanity) o.sanity = Math.round(def.sanity * mult);
  if (def.humanity) {
    let h = def.humanity;
    if (h < 0 && def.isFlesh && char.role === 'maid') h = Math.ceil(h / 2); // vow of abstinence
    o.humanity = h;
  }
  if (def.isFlesh && m.fleshFeast) {
    o.stamina = (o.stamina ?? 0) + m.fleshFeast;
    lines.push('🍖 Beelzebub ยินดีกับมื้อนี้');
  }
  const applied = applyOutcome(char, o);
  return [...lines, ...applied.lines];
}
