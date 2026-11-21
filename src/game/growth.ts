/**
 * Character growth: stat points the player spends, talents picked every 5 levels, Icon gifts from shrines.
 *
 * Each stat has its own job in a hunt (so a good build needs all three):
 *  - พละ (str)   → damage (+1 per 2) and +2 max HP per point spent
 *  - ว่องไว (agi) → dodge (0.8·√agi, no cap but slow) and a chance to strike twice that keeps growing (agi / (agi + 60))
 *  - สัมผัส (int) → to-hit (+1 per 3) and a wider critical range (+1 per 8, down to 15–20)
 * Every level = 1 point; every 5th level = 1 more + a talent pick (1 of 3 offered). No humanity cost.
 * Discord-free.
 */
import type { Character, IconId, RoleId, StatKey } from './types.js';
import { ROLES } from './roles.js';
import { ICONS } from './icons.js';

export const GROWTH_VERSION = 1;
/** Every Nth level gives a bonus point and a talent pick. */
export const TALENT_EVERY = 5;
/** Max HP per point of พละ spent. */
export const HP_PER_STR = 2;

export const STAT_INFO: Record<StatKey, { name: string; emoji: string; job: string }> = {
  str: { name: 'พละ', emoji: '💪', job: 'ดาเมจ +1 ทุก 2 แต้ม · เนื้อกายสูงสุด +2 ต่อแต้มที่แจก' },
  agi: { name: 'ว่องไว', emoji: '🦶', job: 'หลบ +1 ที่ 4 · +2 ที่ 7 · +3 ที่ 15 · +4 ที่ 25 (ยิ่งสูงยิ่งเพิ่มช้า) · โอกาสตีซ้ำ โตไม่มีเพดาน' },
  int: { name: 'สัมผัส', emoji: '👁️', job: 'ตีโดน +1 ทุก 3 แต้ม · คริติคอลกว้างขึ้น 1 ช่องทุก 8 แต้ม (สูงสุด 15–20)' },
};

// ---------- talents ----------

export interface TalentDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  /** How many times it can be taken. */
  max: number;
  /** Only this role is offered it. */
  role?: RoleId;
  /** One-off effect when taken (stored numbers like max HP). */
  apply?: (c: Character) => void;
}

export const TALENTS: Record<string, TalentDef> = {
  thick_flesh: { id: 'thick_flesh', name: 'เนื้อหนา', emoji: '🥩', desc: 'เนื้อกายสูงสุด +10', max: 5, apply: (c) => ((c.maxHp += 10), (c.hp += 10)) },
  heavy_hand: { id: 'heavy_hand', name: 'มือหนัก', emoji: '🔨', desc: 'ดาเมจตอนล่า +2', max: 2 },
  hawk_eye: { id: 'hawk_eye', name: 'ตาเหยี่ยว', emoji: '🎯', desc: 'ช่วงคริติคอลกว้างขึ้น 1 ช่อง', max: 2 },
  quick_feet: { id: 'quick_feet', name: 'เท้าไว', emoji: '💨', desc: 'หลบ +1', max: 2 },
  scavenger: { id: 'scavenger', name: 'นักเก็บกวาด', emoji: '🧺', desc: 'เนื้อ/วัตถุดิบจากมอน +10%', max: 3 },
  iron_mind: { id: 'iron_mind', name: 'ใจแข็ง', emoji: '🧠', desc: 'เสียสติน้อยลง 20%', max: 2 },
  pack_mule: { id: 'pack_mule', name: 'แบกเก่ง', emoji: '🎒', desc: 'แรงสูงสุด +3', max: 3, apply: (c) => ((c.maxStamina += 3), (c.stamina += 3)) },
  instinct: { id: 'instinct', name: 'สัญชาตญาณ', emoji: '🐾', desc: 'ทอยเช็คในเหตุการณ์ +1 ทุกค่า', max: 3 },
  second_wind: { id: 'second_wind', name: 'ลมหายใจที่สอง', emoji: '🫁', desc: 'ล้มครั้งแรกของแต่ละรอบออกล่า ลุกขึ้นมาด้วยเนื้อกาย 1', max: 1 },
  // one per role
  gracious: { id: 'gracious', name: 'รอยยิ้มบริการ', emoji: '🎀', desc: 'เสิร์ฟอาหารได้ทิปสองเท่า', max: 1, role: 'maid' },
  bloodhound: { id: 'bloodhound', name: 'จมูกล่าเนื้อ', emoji: '🐺', desc: 'โอกาสได้ 🫀 เนื้อล่าสด +15%', max: 1, role: 'hound' },
  house_special: { id: 'house_special', name: 'สูตรประจำร้าน', emoji: '🍷', desc: 'ทำอาหารได้ 2 จาน 60% (ปกติ 30%)', max: 1, role: 'bar' },
  haggler: { id: 'haggler', name: 'ต่อราคาเก่ง', emoji: '💰', desc: 'ซื้อของถูกลงอีก 10%', max: 1, role: 'patron' },
  old_world: { id: 'old_world', name: 'ของจากโลกเก่า', emoji: '📱', desc: 'ค้นซากหลังล่า เจอของวินเทจสองเท่า', max: 1, role: 'outsider' },
  pathfinder: { id: 'pathfinder', name: 'คนนำทาง', emoji: '🧭', desc: 'ออกสำรวจแล้วว่างเปล่าน้อยลง (−15%)', max: 1, role: 'survivor' },
};

export const talentLv = (c: Character, id: string) => c.talents?.[id] ?? 0;

/** n distinct picks from a list. */
function pickRandom<T>(list: T[], n: number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a.slice(0, n);
}

// ---------- Icon gifts (shrine of an Icon dungeon, once per Icon) ----------

export const GIFTS: Record<IconId, { name: string; desc: string }> = {
  loki: { name: 'ลูกเต๋าที่สอง', desc: 'ตีพลาด ได้ทอยใหม่ 1 ครั้งต่อการล่า' },
  beelzebub: { name: 'ความหิวที่อิ่มไม่เป็น', desc: 'ฆ่ามอนได้ ฟื้นเนื้อกาย 10%' },
  hastur: { name: 'ดวงตาในความมืด', desc: 'ช่วงคริติคอลกว้างขึ้น 2 ช่อง' },
  belphegor: { name: 'ความทรมานคือพลัง', desc: 'เนื้อกายต่ำกว่า 30% ดาเมจ ×1.5' },
  sophia: { name: 'ครรภ์ที่ไม่หยุดงอก', desc: 'ฟื้นเนื้อกาย 5% ทุกเทิร์นที่ล่า' },
  thanatos: { name: 'สัมผัสแห่งความเน่า', desc: 'ตีโดนแล้วมอนเน่า เสีย 5% ของเนื้อกายสูงสุดทุกเทิร์น' },
  wendigo: { name: 'ผิวน้ำแข็ง', desc: 'รับดาเมจน้อยลง 3' },
};

export const hasGift = (c: Character, icon: IconId) => !!c.gifts?.includes(icon);

/** Shrine visit: the door Icon's gift, the first time only. Returns text lines. */
export function receiveGift(c: Character, icon: IconId): string[] {
  if (hasGift(c, icon)) return [];
  c.gifts = [...(c.gifts ?? []), icon];
  const g = GIFTS[icon];
  return [`🎁 **ของขวัญจาก ${ICONS[icon].name}: ${g.name}** — ${g.desc}`];
}

// ---------- level-up / points / talents ----------

/** Called on every level gained. */
export function growOnLevel(c: Character): string[] {
  const talent = c.level % TALENT_EVERY === 0;
  c.statPoints = (c.statPoints ?? 0) + (talent ? 2 : 1);
  if (talent) c.talentPicks = (c.talentPicks ?? 0) + 1;
  return [
    `🆙 ได้แต้มสเตตัส **+${talent ? 2 : 1}**${talent ? ' และ **เลือกพรสวรรค์ได้ 1 อย่าง**' : ''} — เปิด 📜 โปรไฟล์ › 🆙 เพื่อแจก`,
  ];
}

export function spendPoints(c: Character, stat: StatKey, n: number): { ok: boolean; text: string } {
  const have = c.statPoints ?? 0;
  const k = Math.min(n, have);
  if (k <= 0) return { ok: false, text: 'ไม่มีแต้มเหลือให้แจก — ขึ้นเลเวลเพื่อรับแต้ม' };
  c.statPoints = have - k;
  c.stats[stat] += k;
  if (stat === 'str') (c.maxHp += k * HP_PER_STR), (c.hp += k * HP_PER_STR);
  return { ok: true, text: `${STAT_INFO[stat].emoji} ${STAT_INFO[stat].name} +${k} → **${c.stats[stat]}**` };
}

const eligible = (c: Character) => Object.values(TALENTS).filter((t) => (!t.role || t.role === c.role) && talentLv(c, t.id) < t.max);

/** The 3 talents on offer for the pending pick (rolled once and kept, so re-opening never rerolls). */
export function talentOffer(c: Character): TalentDef[] {
  if (!c.talentPicks) return [];
  const valid = (c.talentOffer ?? []).filter((id) => TALENTS[id] && eligible(c).some((t) => t.id === id));
  if (valid.length < 3) {
    const pool = eligible(c).filter((t) => !valid.includes(t.id));
    c.talentOffer = [...valid, ...pickRandom(pool, 3 - valid.length).map((t) => t.id)];
  }
  return (c.talentOffer ?? []).map((id) => TALENTS[id]!);
}

export function pickTalent(c: Character, id: string): { ok: boolean; text: string } {
  if (!c.talentPicks) return { ok: false, text: 'ยังไม่มีสิทธิ์เลือกพรสวรรค์ — ได้ทุก 5 เลเวล' };
  const t = TALENTS[id];
  if (!t || !talentOffer(c).some((x) => x.id === id)) return { ok: false, text: 'พรสวรรค์นี้ไม่ได้อยู่ในตัวเลือกแล้ว' };
  c.talents = { ...c.talents, [id]: talentLv(c, id) + 1 };
  t.apply?.(c);
  c.talentPicks -= 1;
  delete c.talentOffer;
  return { ok: true, text: `${t.emoji} ได้พรสวรรค์ **${t.name}**${t.max > 1 ? ` (${talentLv(c, id)}/${t.max})` : ''} — ${t.desc}` };
}

/**
 * Old saves (auto main stat every level): stats back to the role's base + stat blessings, every point refunded to
 * spend again, talent picks for the levels already passed. Humanity lost to old level-ups stays lost.
 */
export function migrateGrowth(c: Character): void {
  if ((c.growthV ?? 0) >= GROWTH_VERSION) return;
  const base = ROLES[c.role].stats;
  const b = c.blessings ?? {};
  c.stats = { str: base.str + (b.thanatos ?? 0), agi: base.agi + (b.loki ?? 0), int: base.int + (b.hastur ?? 0) };
  const fifths = Math.floor(c.level / TALENT_EVERY);
  c.statPoints = c.level - 1 + fifths;
  c.talentPicks = fifths;
  c.growthV = GROWTH_VERSION;
}

/** "🆙 3 แต้ม · ✨ เลือกพรสวรรค์ 1" — what's waiting, or null. */
export function pendingText(c: Character): string | null {
  const parts = [c.statPoints ? `🆙 แต้มสเตตัสเหลือ ${c.statPoints}` : null, c.talentPicks ? `✨ เลือกพรสวรรค์ได้ ${c.talentPicks}` : null].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

export function talentsText(c: Character): string | null {
  const t = Object.entries(c.talents ?? {}).filter(([id, n]) => n > 0 && TALENTS[id]);
  const g = (c.gifts ?? []).map((icon) => `${ICONS[icon].emoji} ${GIFTS[icon].name}`);
  const lines = [...t.map(([id, n]) => `${TALENTS[id]!.emoji} ${TALENTS[id]!.name}${TALENTS[id]!.max > 1 ? ` ×${n}` : ''}`), ...g];
  return lines.length ? lines.join(' · ') : null;
}
