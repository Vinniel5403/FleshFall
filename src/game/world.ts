import type { DoorColor, IconDoor, Location, StatKey } from './types.js';

export const LOCATIONS: Record<Location, { name: string; emoji: string; desc: string }> = {
  rouge_land: {
    name: 'Rouge Land (เกาะเนื้อ)',
    emoji: '🩸',
    desc: 'ดินแดนที่ปกคลุมด้วยเนื้อสด กระดูก และอวัยวะงอกงาม — ร่างของสิ่งที่หัวใจยังเต้นอยู่',
  },
  cypress: {
    name: 'Cypress Isle (เกาะไซปรัส)',
    emoji: '🏛️',
    desc: 'เกาะซากกรีกโรมันที่ประตูดำนับไม่ถ้วนหันไปทางทิศใต้ ทางผ่านเดียวสู่ Rouge Land',
  },
  old_realm: {
    name: 'Old Realm (วังวนนอกเกาะ)',
    emoji: '🌫️',
    desc: 'มิติซ้อนทับโลกจริง ยืดออกแนวราบ 8–10 เท่า คนจริงเหลือเพียงเงาที่หยุดนิ่ง',
  },
};

export const DOORS: Record<DoorColor, { name: string; emoji: string }> = {
  green: { name: 'ประตูสีเขียว', emoji: '🟩' },
  yellow: { name: 'ประตูสีเหลือง', emoji: '🟨' },
  gray: { name: 'ประตูสีเทา', emoji: '⬜' },
  orange: { name: 'ประตูสีส้ม', emoji: '🟧' },
  white: { name: 'ประตูสีขาวซีด', emoji: '🤍' },
  blue: { name: 'ประตูสีน้ำเงิน', emoji: '🟦' },
  purple: { name: 'ประตูสีม่วง', emoji: '🟪' },
  red: { name: 'ประตูสีแดง', emoji: '🟥' },
  black: { name: 'ประตูสีดำ', emoji: '⬛' },
};

/** Per-door dungeon rules, straight from Solomon007's archive. */
export const DUNGEON_RULES: Record<IconDoor, { depth: [number, number]; retreat: 'free' | 'locked' | 'feed' | 'timeloss'; note: string }> = {
  green: { depth: [3, 4], retreat: 'free', note: 'ทารกปีศาจงอกจากผนังมดลูก แหล่งอาหารไม่สิ้นสุด' },
  yellow: { depth: [3, 4], retreat: 'locked', note: 'มืดสนิท ประตูล็อกตามหลัง ต้องมีแสงสว่าง' },
  gray: { depth: [3, 3], retreat: 'timeloss', note: 'เหมือนโลกจริง หลอกให้ลืมเวลา ประตูสุดท้ายคือประตูแรก' },
  orange: { depth: [3, 4], retreat: 'feed', note: 'ปากและหนวดเนื้อหิวโหย ไม่ป้อนเนื้อให้ ไม่ยอมให้ออก' },
  white: { depth: [4, 5], retreat: 'locked', note: 'เงียบสงัด ผนึก 3–9 วัน ไม่มีอาหารไม่มีน้ำ' },
  blue: { depth: [3, 3], retreat: 'free', note: 'ความทรงจำโศกถาโถม ไม่มีใครกลับออกมาครบส่วน' },
  purple: { depth: [3, 4], retreat: 'free', note: 'Miasma ของ Thanatos เนื้อสดเน่าทันทีที่สัมผัส' },
};

export const STAT_NAMES: Record<StatKey, string> = { str: 'พละ', agi: 'ว่องไว', int: 'สัมผัส' };

// ---------- Crimson Moon ----------

const BKK_OFFSET = 7 * 3600_000;

export type MoonMode = 'auto' | 'on' | 'off';

function parseMode(v: string | undefined): MoonMode {
  return v === 'on' || v === 'off' ? v : 'auto';
}

/** Override for testing/events: env CRIMSON_MOON=on|off|auto, or /moon at runtime. */
let moonMode: MoonMode = parseMode(process.env.CRIMSON_MOON);

export function getMoonMode(): MoonMode {
  return moonMode;
}

export function setMoonMode(mode: MoonMode): void {
  moonMode = mode;
}

export function isCrimsonMoon(now = Date.now()): boolean {
  if (moonMode !== 'auto') return moonMode === 'on';
  return isScheduledCrimsonMoon(now);
}

/** Crimson Moon rises every 5th day, 21:00–02:59 Bangkok time. */
export function isScheduledCrimsonMoon(now = Date.now()): boolean {
  const bkk = new Date(now + BKK_OFFSET);
  const hour = bkk.getUTCHours();
  // after midnight still counts as the previous night
  const nightStart = hour < 3 ? now - 24 * 3600_000 : now;
  const day = Math.floor((nightStart + BKK_OFFSET) / 86_400_000);
  return day % 5 === 0 && (hour >= 21 || hour < 3);
}

export function nextCrimsonMoon(now = Date.now()): number {
  // scan forward hour by hour (max 6 days)
  const start = Math.ceil(now / 3600_000) * 3600_000;
  for (let t = start; t < now + 6 * 86_400_000; t += 3600_000) if (isScheduledCrimsonMoon(t)) return t;
  return now;
}

// ---------- Bar staff Closing Shift ----------

function hashStr(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** Each bar staff blacks out one fixed hour per day (Bangkok time). */
export function closingShiftHour(userId: string): number {
  return hashStr(userId) % 24;
}

export function inClosingShift(userId: string, now = Date.now()): boolean {
  return new Date(now + BKK_OFFSET).getUTCHours() === closingShiftHour(userId);
}
