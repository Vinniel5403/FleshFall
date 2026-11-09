import type { IconDoor, IconId, StatKey } from './types.js';

export interface IconMods {
  checkBonus?: Partial<Record<StatKey, number>>;
  /** Belphegor: bonus to every check when HP < 30% */
  lowHpBonus?: number;
  staminaRegenMult?: number;
  /** Sophia: regain HP passively alongside stamina */
  hpRegenPerTick?: number;
  /** Thanatos: resting never restores HP */
  noNaturalHeal?: boolean;
  /** Extra damage soaked */
  dmgReduction?: number;
  humanityLossMult?: number;
  sanityLossMult?: number;
  healItemMult?: number;
  restMult?: number;
  /** Loki: chance to re-roll a failed check (costs humanity) */
  rerollChance?: number;
  maxHpMod?: number;
  maxStaminaMod?: number;
  /** Sophia: resurrection rite — keep fresh flesh on death */
  deathKeepsFlesh?: boolean;
  /** Belphegor: lose max HP permanently on death */
  maimOnDeath?: boolean;
  /** Sophia: grow a mutation each level */
  mutateOnLevel?: boolean;
  miasmaImmune?: boolean;
  /** Gluttony: eating flesh grants extra stamina */
  fleshFeast?: number;
  /** Hastur: perceive hidden hints */
  seesHints?: boolean;
}

export interface IconDef {
  id: IconId;
  name: string;
  title: string;
  emoji: string;
  door: IconDoor;
  doorName: string;
  concept: string;
  blessing: string;
  repercussion: string;
  mods: IconMods;
}

export const ICONS: Record<IconId, IconDef> = {
  beelzebub: {
    id: 'beelzebub',
    name: 'Beelzebub',
    title: 'ตัวตนแห่งตัณหาที่ไม่มีวันพอ (Gluttony)',
    emoji: '🍖',
    door: 'orange',
    doorName: 'ประตูสีส้ม',
    concept: '"ความหิวคือศาสนา"',
    blessing: 'แรงฟื้นเร็ว x2 · กินเนื้อแล้วได้แรงเพิ่ม',
    repercussion: 'ความเป็นมนุษย์ลดเร็วขึ้น 50% (ผิวลอก เหลือแต่เนื้อแดง)',
    mods: { staminaRegenMult: 2, fleshFeast: 3, humanityLossMult: 1.5 },
  },
  hastur: {
    id: 'hastur',
    name: 'Hastur',
    title: 'ตัวตนแห่งความกลัว (Fear)',
    emoji: '👁️',
    door: 'yellow',
    doorName: 'ประตูสีเหลือง',
    concept: '"ความกลัวคือสัญชาตญาณที่ทำให้รอด"',
    blessing: 'ว่องไว +2 · มองเห็นสิ่งที่ซ่อนอยู่ (เห็นคำใบ้ทางเลือก)',
    repercussion: 'สติแตกง่าย เสียสติมากขึ้น 50% · ภาพหลอนสะสม',
    mods: { checkBonus: { agi: 2 }, seesHints: true, sanityLossMult: 1.5 },
  },
  loki: {
    id: 'loki',
    name: 'Loki',
    title: 'ตัวตนแห่งภาพลวง (Distortion)',
    emoji: '🎭',
    door: 'gray',
    doorName: 'ประตูสีเทา',
    concept: '"ความจริงเป็นเพียงก้อนเนื้อที่ปั้นใหม่ได้"',
    blessing: 'บิดกฎฟิสิกส์ — ทอยพลาดมีโอกาส 35% ทอยใหม่',
    repercussion: 'ทุกครั้งที่บิดกฎ ตัวตนพร่าเลือน (ความเป็นมนุษย์ -2)',
    mods: { rerollChance: 0.35 },
  },
  belphegor: {
    id: 'belphegor',
    name: 'Belphegor',
    title: 'ตัวตนแห่งความสิ้นหวัง (Despair)',
    emoji: '⛓️',
    door: 'blue',
    doorName: 'ประตูสีน้ำเงิน',
    concept: '"ความทรมานคือการชำระล้าง"',
    blessing: 'ยิ่งใกล้ตายยิ่งเก่ง — เนื้อกายต่ำกว่า 30% ทุกค่าเช็ค +4',
    repercussion: 'ตายทุกครั้งพิการถาวร (เนื้อกายสูงสุด -3)',
    mods: { lowHpBonus: 4, maimOnDeath: true },
  },
  sophia: {
    id: 'sophia',
    name: 'Sophia',
    title: 'ตัวตนผู้ให้กำเนิด (Birth / The Progenitor)',
    emoji: '🥚',
    door: 'green',
    doorName: 'ประตูสีเขียว',
    concept: '"ชีวิตคือการขยายชีวมวล"',
    blessing: 'ฟื้นฟูเนื้อกายเองตลอด · ตายแล้วถูกให้กำเนิดใหม่โดยไม่เสียเนื้อสด',
    repercussion: 'เนื้องอกโตไม่หยุด — ทุกเลเวลงอกอวัยวะใหม่และเสียความเป็นมนุษย์',
    mods: { hpRegenPerTick: 1, deathKeepsFlesh: true, mutateOnLevel: true },
  },
  thanatos: {
    id: 'thanatos',
    name: 'Thanatos',
    title: 'ตัวตนแห่งการเน่าสลาย (Decay / The Destroyer)',
    emoji: '💀',
    door: 'purple',
    doorName: 'ประตูสีม่วง',
    concept: '"ไม่มีสิ่งใดคงอยู่"',
    blessing: 'ต้านทาน Miasma สมบูรณ์ · คำสาปเน่า พละ +2',
    repercussion: 'ร่างกายไม่ฟื้นฟูเอง — พักไม่ได้เนื้อกายคืน ต้องใช้ยา/เล่นแร่แปรธาตุ',
    mods: { miasmaImmune: true, checkBonus: { str: 2 }, noNaturalHeal: true },
  },
  wendigo: {
    id: 'wendigo',
    name: 'Wendigo',
    title: 'ตัวตนแห่งความอดอยาก (Destitution)',
    emoji: '🦌',
    door: 'white',
    doorName: 'ประตูสีขาวซีด',
    concept: '"ความทุกข์คือสัจธรรม"',
    blessing: 'ทนทานสุดขีด (ลดดาเมจ 2) · จิตมั่นคง เสียสติครึ่งเดียว · ใช้ของกินคุ้ม x1.5',
    repercussion: 'ทรมานกายใจตลอดเวลา — แรงสูงสุด -2 · พักได้ผลครึ่งเดียว',
    mods: { dmgReduction: 2, sanityLossMult: 0.5, healItemMult: 1.5, maxStaminaMod: -2, restMult: 0.5 },
  },
};

export const ICON_BY_DOOR: Record<IconDoor, IconDef> = Object.fromEntries(
  Object.values(ICONS).map((i) => [i.door, i]),
) as Record<IconDoor, IconDef>;

export function mods(icon: IconId): IconMods {
  return ICONS[icon].mods;
}
