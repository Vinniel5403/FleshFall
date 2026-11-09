import type { Location, RoleId, Stats } from './types.js';

export interface RoleDef {
  id: RoleId;
  name: string;
  emoji: string;
  short: string;
  perks: string[];
  stats: Stats;
  maxHp: number;
  maxStamina: number;
  humanity: number;
  sanity: number;
  flesh: number;
  start: Location;
  reachedRougeLand: boolean;
  startItems: Record<string, number>;
  weapon?: string;
  armor?: string;
}

export const ROLES: Record<RoleId, RoleDef> = {
  maid: {
    id: 'maid',
    name: 'Maid / Butcher แห่ง M.A.I.D.S',
    emoji: '🔪',
    short: 'ผู้จัดสรรเนื้อ แล่ไร้ที่ติ แยกเกรดเนื้อได้ทันที',
    perks: [
      'แยกแยะเกรดเนื้อ: ขายของได้ราคา +50%',
      'คำปฏิญาณอดกลั้น: กินเนื้อเสียความเป็นมนุษย์ครึ่งเดียว',
      'มียศ Grade D → A ตามเลเวล',
    ],
    stats: { str: 2, agi: 2, int: 3 },
    maxHp: 32,
    maxStamina: 11,
    humanity: 75,
    sanity: 80,
    flesh: 40,
    start: 'rouge_land',
    reachedRougeLand: true,
    startItems: { bandage: 2, blood_wine: 1 },
    weapon: 'carving_knife',
    armor: 'blood_apron',
  },
  hound: {
    id: 'hound',
    name: 'Hound (นักล่าเนื้อ)',
    emoji: '🐺',
    short: 'นักล่าบ้าบิ่นผู้แลกความเป็นมนุษย์กับพลัง',
    perks: ['พละ +1 ทุกเช็คนอก Rouge Land', 'ล่าเก่ง: ได้เนื้อสดจากการล่า +25%'],
    stats: { str: 4, agi: 2, int: 0 },
    maxHp: 40,
    maxStamina: 12,
    humanity: 55,
    sanity: 70,
    flesh: 15,
    start: 'rouge_land',
    reachedRougeLand: true,
    startItems: { bandage: 1, rotten_flesh: 1 },
    weapon: 'bone_club',
  },
  bar: {
    id: 'bar',
    name: 'Bar Staff / Bar Owner',
    emoji: '🍷',
    short: 'ผู้ถักทอเศษเนื้อ ปรุงเนื้อเน่าให้กินได้ บรรเทาคำสาป',
    perks: [
      'ปรุงอาหาร /cook ไม่มีพลาด และมีโอกาสได้เพิ่ม',
      'Closing Shift: หมดสติ 1 ชั่วโมงต่อวัน (เวลาเฉพาะตัว)',
    ],
    stats: { str: 1, agi: 2, int: 3 },
    maxHp: 30,
    maxStamina: 11,
    humanity: 60,
    sanity: 75,
    flesh: 30,
    start: 'rouge_land',
    reachedRougeLand: true,
    startItems: { rotten_flesh: 3, blood_wine: 2, wild_flour: 1 },
    weapon: 'kris',
  },
  patron: {
    id: 'patron',
    name: 'Patron / Flesh Remnant',
    emoji: '🎩',
    short: 'อดีตมนุษย์ร่างเนื้อผู้มั่งคั่ง ลูกค้าที่ควรค่าแก่การรับใช้',
    perks: ['มั่งคั่ง: เริ่มด้วยเนื้อสด 120', 'ได้รับการปรนนิบัติ: ซื้อของถูกลง 25%'],
    stats: { str: 2, agi: 1, int: 2 },
    maxHp: 38,
    maxStamina: 10,
    humanity: 35,
    sanity: 70,
    flesh: 120,
    start: 'rouge_land',
    reachedRougeLand: true,
    startItems: { blood_wine: 2 },
    weapon: 'walking_cane',
  },
  outsider: {
    id: 'outsider',
    name: 'Outsider (คนหลงมิติ)',
    emoji: '📱',
    short: 'คนจากโลกจริงที่ตกลงรอยแยกมิติ ยังเป็นมนุษย์เต็มตัว',
    perks: [
      'ความเป็นมนุษย์ 100 — แต่ยังมองไม่เห็นคนพายเรือที่ Cypress',
      'พกของวินเทจจากโลกจริง (Patron ชอบมาก)',
      'ต้องหาประตูแดงและสละความเป็นมนุษย์เพื่อเข้า Rouge Land',
    ],
    stats: { str: 1, agi: 3, int: 2 },
    maxHp: 28,
    maxStamina: 12,
    humanity: 100,
    sanity: 60,
    flesh: 0,
    start: 'old_realm',
    reachedRougeLand: false,
    startItems: { dead_phone: 1, lighter: 1, family_photo: 1 },
    weapon: 'pipe',
  },
  survivor: {
    id: 'survivor',
    name: 'Rouge Land Survivor',
    emoji: '🧭',
    short: 'อดีตเศษเดนเนื้อที่หนีออกมา ผู้นำทางของนักล่ามือใหม่',
    perks: ['ผู้นำทาง: เห็นคำใบ้ทุกทางเลือก', 'Miasma ทำร้ายน้อยลงครึ่งหนึ่ง'],
    stats: { str: 2, agi: 2, int: 2 },
    maxHp: 34,
    maxStamina: 12,
    humanity: 50,
    sanity: 65,
    flesh: 10,
    start: 'old_realm',
    reachedRougeLand: true,
    startItems: { bandage: 1, fetal_flesh: 1 },
    weapon: 'bone_club',
    armor: 'leather_coat',
  },
};

/** M.A.I.D.S rank by level */
export function maidGrade(level: number): string {
  if (level >= 15) return 'Grade A — Prime Executor';
  if (level >= 10) return 'Grade B — Choice Senior Staff';
  if (level >= 5) return 'Grade C — Select Field Operator';
  return 'Grade D — Utility Sanitation';
}
