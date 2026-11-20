import { isDev } from './dev.js';
import { balance } from '../config.js';
import { levelDC } from './dice.js';
import { endTripSafe } from './expedition.js';
import type { Character, IconDoor, Location, ZoneId } from './types.js';
import { LOCATIONS } from './world.js';

export type Continent = 'europe' | 'asia' | 'america' | 'south_america' | 'africa' | 'australia' | 'antarctica';
export type Tier = 'easy' | 'normal' | 'hard' | 'epic';

export interface ContinentDef {
  name: string;
  emoji: string;
  /** Icon whose door shows up most here. */
  icon: string;
  door: IconDoor;
}

export const CONTINENTS: Record<Continent, ContinentDef> = {
  europe: { name: 'Europe', emoji: '🏰', icon: 'Loki', door: 'gray' },
  asia: { name: 'Asia', emoji: '🏯', icon: 'Beelzebub', door: 'orange' },
  america: { name: 'America', emoji: '🗽', icon: 'Belphegor', door: 'blue' },
  south_america: { name: 'South America', emoji: '🦜', icon: 'Belphegor', door: 'blue' },
  africa: { name: 'Africa', emoji: '🦁', icon: 'Sophia', door: 'green' },
  australia: { name: 'Australia', emoji: '🦘', icon: 'Hastur', door: 'yellow' },
  antarctica: { name: 'Antarctica', emoji: '🐧', icon: 'Wendigo', door: 'white' },
};

/** A tier is a band of city levels: it decides who spawns, which gear drops and how you fall. The numbers come from the city's own level. */
export interface TierDef {
  name: string;
  emoji: string;
  /** Lowest city level in the tier. */
  rec: number;
}

export const TIERS: Record<Tier, TierDef> = {
  easy: { name: 'Easy', emoji: '🟢', rec: 1 },
  normal: { name: 'Normal', emoji: '🟡', rec: 4 },
  hard: { name: 'Hard', emoji: '🔴', rec: 8 },
  epic: { name: 'Epic', emoji: '🟣', rec: 12 },
};

/** Who spawns at each tier (monster id → pick weight). Depends on the place only — never on the hunter's level. */
const TIER_SPAWN: Record<Tier, Record<string, number>> = {
  easy: { starved_remnant: 3, rot_crawler: 3, stretched_shade: 3, maw_hound: 1 },
  normal: { starved_remnant: 2, rot_crawler: 2, stretched_shade: 2, maw_hound: 2, heretic: 2, spore_husk: 1 },
  hard: { rot_crawler: 1, stretched_shade: 1, maw_hound: 2, heretic: 2, spore_husk: 2, shifting_fiend: 1 },
  epic: { maw_hound: 2, heretic: 2, spore_husk: 2, shifting_fiend: 2 },
};

export interface ZoneDef {
  id: ZoneId;
  name: string;
  emoji: string;
  region: Location;
  desc: string;
  continent?: Continent;
  tier?: Tier;
  /** City level = level of every monster here (hp / damage / xp / loot scale from it). */
  level?: number;
  /** Has its own channel in the location category → gets a panel + 📍 role. */
  channel?: boolean;
  /** Panel image in assets/panels/ (optional). */
  image?: string;
  /** Monster ids that spawn here (empty = no hunting). */
  monsters: string[];
  /** Pick weight per monster id (missing = 1). */
  spawn?: Record<string, number>;
  /** Dungeon door color weights; continent's Icon gets the big share. */
  doorWeights?: Partial<Record<IconDoor, number>>;
  /** Can be reached via travel (cypress: only through the red door). */
  travel: boolean;
}

/** 6 colors 10% each, the continent's Icon 40%. */
function continentDoors(main: IconDoor): Record<IconDoor, number> {
  const all: IconDoor[] = ['green', 'yellow', 'gray', 'orange', 'white', 'blue', 'purple'];
  return Object.fromEntries(all.map((c) => [c, c === main ? 40 : 10])) as Record<IconDoor, number>;
}

type CitySpec = [id: string, name: string, emoji: string, continent: Continent, tier: Tier, level: number, desc: string, image?: string];

/**
 * Old Realm cities. Each gets a channel + 📍 role. Order = display order.
 * Levels climb inside a tier (Easy 1–3 · Normal 4–6 · Hard 8–10 · Epic 12, Australia 14, Antarctica 16).
 */
const CITIES: CitySpec[] = [
  // Europe
  ['paris', 'Paris', '🗼', 'europe', 'easy', 1, 'ถนนหินยืดยาวสุดสายตา หอไอเฟลบิดเป็นเกลียว เงาของผู้คนนั่งนิ่งในคาเฟ่ริมทาง'],
  ['vienna', 'Vienna', '🎻', 'europe', 'easy', 2, 'โรงละครโอเปร่าบรรเลงวอลทซ์ไม่มีวันจบ ผู้ชมในชุดราตรีไม่เคยลุกจากเก้าอี้'],
  ['roma', 'Roma', '🏛️', 'europe', 'easy', 3, 'โคลอสเซียมยังมีเสียงเชียร์ แม้อัฒจันทร์จะว่างเปล่า น้ำพุไหลเป็นสีชมพู'],
  ['athen', 'Athen', '🏺', 'europe', 'normal', 4, 'วิหารพาร์เธนอนเสาเพิ่มขึ้นทุกคืน รูปปั้นเทพเจ้าหันหน้าตามผู้มาเยือน'],
  ['moscow', 'Moscow', '❄️', 'europe', 'normal', 5, 'หิมะตกไม่หยุด โดมหัวหอมของวิหารเต้นตุบเหมือนหัวใจ'],
  ['byzantine', 'Byzantine', '🕌', 'europe', 'normal', 6, 'นครโบราณที่ไม่ควรมีอยู่แล้ว กำแพงทองคำจารึกชื่อคนที่ยังไม่ตาย'],
  ['frankfurt', 'Frankfurt', '🏦', 'europe', 'hard', 8, 'ตึกกระจกสะท้อนภาพที่ไม่ใช่คุณ ตลาดหุ้นซื้อขายเนื้อแทนเงิน'],
  ['geneva', 'Geneva', '⌚', 'europe', 'hard', 9, 'นาฬิกานับพันเรือนเดินไม่ตรงกัน ทะเลสาบนิ่งจนเห็นอีกเมืองอยู่ใต้น้ำ'],
  ['budapest', 'Budapest', '🌉', 'europe', 'hard', 10, 'สะพานข้ามแม่น้ำดานูบยาวขึ้นทุกครั้งที่เดิน บ่อน้ำร้อนเดือดเป็นเลือด'],
  ['granada', 'Granada', '🕍', 'europe', 'epic', 12, 'พระราชวังอัลฮัมบราที่ลวดลายบนผนังขยับเป็นเรขาคณิต — ที่มั่นของ Loki'],
  // Asia
  ['bangkok', 'Bangkok', '🛕', 'asia', 'easy', 1, 'ตลาดน้ำขายของที่ไม่มีใครรู้ว่าเนื้ออะไร ไฟจราจรแดงค้างตลอดกาล'],
  ['seoul', 'Seoul', '🏙️', 'asia', 'easy', 2, 'ป้ายนีออนกะพริบเป็นภาษาที่อ่านไม่ออก ร้านไก่ทอดเปิดตลอด 24 ชั่วโมงโดยไม่มีพนักงาน'],
  ['shanghai', 'Shanghai', '🌃', 'asia', 'easy', 3, 'ตึกระฟ้างอกสูงขึ้นทุกคืน เสียงไซเรนเรือดังจากแม่น้ำที่ไม่มีเรือ'],
  ['tibet', 'Tibet', '🏔️', 'asia', 'normal', 4, 'ธงมนต์สะบัดทั้งที่ไม่มีลม พระที่นั่งสมาธิบนเขาไม่หายใจมาหลายร้อยปี'],
  ['delhi', 'Delhi', '🐘', 'asia', 'normal', 5, 'ฝูงชนแน่นถนนแต่ไม่มีใครส่งเสียง เครื่องเทศหอมจนลืมไปว่ากลิ่นเน่า'],
  ['xinjiang', 'Xinjiang', '🐫', 'asia', 'normal', 6, 'ทะเลทรายสีส้มที่เนินทรายย้ายที่เอง กองคาราวานเดินวนไม่ถึงไหน'],
  ['tehran', 'Tehran', '🕌', 'asia', 'hard', 8, 'ตลาดบาซาร์วงกตไร้ทางออก พรมทอเป็นภาพของผู้ที่หลงเข้าไป'],
  ['qatar', 'Qatar', '🏜️', 'asia', 'hard', 9, 'เมืองทองคำกลางทะเลทราย ความร้อนละลายเงาจนไหลไปตามพื้น'],
  ['tel_aviv', 'Tel Aviv', '🌊', 'asia', 'hard', 10, 'ชายหาดที่คลื่นซัดเศษเนื้อขึ้นฝั่ง เสียงเพลงจากผับดังขึ้นแต่ไม่มีใครเต้น'],
  ['jerusalem', 'Jerusalem', '🕯️', 'asia', 'epic', 12, 'นครศักดิ์สิทธิ์ที่เสียงสวดทุกภาษาปนกันจนกลายเป็นเสียงเคี้ยว — ที่มั่นของ Beelzebub'],
  // America
  ['british_columbia', 'British Columbia', '🌲', 'america', 'easy', 1, 'ป่าสนสูงเสียดฟ้า ต้นไม้บางต้นมีเปลือกเป็นผิวหนังคน'],
  ['texas', 'Texas', '🤠', 'america', 'easy', 2, 'ทุ่งกว้างไร้ขอบ วัวที่เลี้ยงไว้ยืนมองคุณด้วยดวงตามนุษย์'],
  ['new_york', 'New York', '🗽', 'america', 'easy', 3, 'รถไฟใต้ดินวิ่งไม่หยุดสถานี ไทม์สแควร์ฉายโฆษณาของสิ่งที่ไม่มีอยู่จริง'],
  ['mexico_city', 'Mexico City', '💀', 'america', 'normal', 4, 'เทศกาลวันแห่งความตายไม่เคยจบ หน้ากากหัวกะโหลกบางอันไม่ใช่หน้ากาก'],
  ['quebec', 'Quebec', '🍁', 'america', 'normal', 5, 'เมืองเก่ากำแพงหิน หิมะสีแดงเหมือนน้ำเชื่อมเมเปิลไหลจากฟ้า'],
  ['miami', 'Miami', '🌴', 'america', 'normal', 6, 'แสงนีออนชมพูกลางคืนนิรันดร์ จระเข้ในบึงพูดภาษาคนได้'],
  ['greenland', 'Greenland', '🧊', 'america', 'hard', 8, 'ธารน้ำแข็งกว้างสุดตา มีร่างแช่แข็งนับพันอยู่ใต้ผิวน้ำแข็ง ลืมตาทุกร่าง'],
  ['haiti', 'Haiti', '🥁', 'america', 'hard', 9, 'เสียงกลองดังจากทุกทิศ ศพที่ฝังไว้ลุกขึ้นมาเต้นตามจังหวะ'],
  ['panama', 'Panama', '🚢', 'america', 'hard', 10, 'คลองที่ประตูน้ำเปิดสู่ความมืด เรือที่แล่นผ่านไปไม่เคยกลับออกมา'],
  ['north_pole', 'North Pole', '🌌', 'america', 'epic', 12, 'ปลายสุดของโลก แสงเหนือสีฟ้าส่องลงมาเป็นความสิ้นหวัง — ที่มั่นของ Belphegor'],
  // South America
  ['quito', 'Quito', '⛰️', 'south_america', 'easy', 1, 'เมืองบนเส้นศูนย์สูตรที่เงาไม่เคยตกลงพื้น ภูเขาไฟรอบเมืองหายใจเป็นจังหวะ'],
  ['barranquilla', 'Barranquilla', '🎭', 'south_america', 'easy', 2, 'คาร์นิวัลที่ไม่มีวันเลิก นักเต้นสวมหน้ากากที่ถอดไม่ออกแล้ว'],
  ['rio', 'Rio', '🏖️', 'south_america', 'easy', 3, 'รูปปั้นบนยอดเขากางแขนกว้างขึ้นทุกวัน ชายหาดเต็มไปด้วยคนนอนไม่ขยับ'],
  ['lima', 'Lima', '🌫️', 'south_america', 'normal', 4, 'หมอกทะเลคลุมเมืองตลอดปี ในหมอกมีเสียงเรียกชื่อคุณ'],
  ['la_paz', 'La Paz', '🚡', 'south_america', 'normal', 5, 'เมืองที่สูงที่สุด อากาศเบาบางจนความคิดหลุดลอยออกจากหัว กระเช้าลอยฟ้าไม่เคยจอด'],
  ['montevideo', 'Montevideo', '⚓', 'south_america', 'normal', 6, 'ท่าเรือเงียบงัน เรือประมงกลับมาพร้อมแหที่เต็มไปด้วยมือคน'],
  ['santa_cruz', 'Santa Cruz', '🌾', 'south_america', 'hard', 8, 'ทุ่งราบร้อนชื้นไร้ขอบ พืชไร่โน้มตัวตามคนที่เดินผ่าน'],
  ['iquique', 'Iquique', '🏜️', 'south_america', 'hard', 9, 'เมืองชายทะเลทรายที่แห้งที่สุดในโลก ฝนไม่ตกมาร้อยปี แต่พื้นดินยังชุ่มเลือด'],
  ['amazonas', 'Amazonas', '🌳', 'south_america', 'epic', 12, 'ป่าดิบที่กลืนทุกอย่าง แม่น้ำไหลย้อนกลับ ความสิ้นหวังหนาจนหายใจไม่ออก — ที่มั่นของ Belphegor'],
  // Africa
  ['cape_town', 'Cape Town', '🏔️', 'africa', 'easy', 1, 'ภูเขาโต๊ะถูกเมฆเนื้อคลุมไว้ ลมแหลมพัดพากลิ่นคาวจากทะเล'],
  ['cairo', 'Cairo', '🐪', 'africa', 'easy', 2, 'พีระมิดงอกเพิ่มกลางเมืองทุกคืน ตลาดขายเครื่องรางที่ยังเต้นอยู่'],
  ['alexandria', 'Alexandria', '📜', 'africa', 'easy', 3, 'หอสมุดที่ไฟไม่เคยดับ หนังสือเขียนประวัติของคนที่เพิ่งเดินเข้ามา'],
  ['khartoum', 'Khartoum', '🌅', 'africa', 'normal', 4, 'จุดที่แม่น้ำไนล์สองสายบรรจบ สายหนึ่งขาว อีกสายแดงฉาน'],
  ['burundi', 'Burundi', '🥁', 'africa', 'normal', 5, 'เนินเขาเขียวขจีที่เสียงกลองดังจากใต้ดิน ต้นไม้ออกผลเป็นดวงตา'],
  ['tanganyika', 'Tanganyika', '🏞️', 'africa', 'normal', 6, 'ทะเลสาบลึกไม่มีก้นบึ้ง ปลาที่จับได้มีฟันมนุษย์'],
  ['rwanda', 'Rwanda', '🦍', 'africa', 'hard', 8, 'ภูเขาพันลูกในหมอก ฝูงกอริลลาเฝ้ามองด้วยดวงตาที่มากเกินไป'],
  ['kano', 'Kano', '🧱', 'africa', 'hard', 9, 'กำแพงดินโบราณล้อมเมือง บ่อย้อมผ้าเดือดเป็นสีของเนื้อสด'],
  ['sahara', 'Sahara', '☀️', 'africa', 'epic', 12, 'ทะเลทรายไร้ที่สิ้นสุด ทรายทุกเม็ดคือเนื้อที่งอกใหม่ไม่หยุด — ที่มั่นของ Sophia'],
  // Australia / Antarctica
  ['australia', 'Australia', '🦘', 'australia', 'epic', 14, 'ทวีปทั้งทวีปที่แผ่นดินแดงฉานเงียบสนิท สัตว์ทุกตัวจ้องมองจากความมืด ความกลัวกลายเป็นอากาศ — ที่มั่นของ Hastur'],
  ['antarctica', 'Antarctica', '🧊', 'antarctica', 'epic', 16, 'ความหนาวที่ไม่ได้ฆ่า แต่ทำให้ทรมานไม่สิ้นสุด ใต้น้ำแข็งมีบางอย่างหิวโหย — ที่มั่นของ Wendigo'],
];

function cityZone([id, name, emoji, continent, tier, level, desc, image]: CitySpec): ZoneDef {
  const c = CONTINENTS[continent];
  const doorName: Record<IconDoor, string> = { gray: 'เทา', orange: 'ส้ม', blue: 'ฟ้า', green: 'เขียว', yellow: 'เหลือง', white: 'ขาว', purple: 'ม่วง' };
  return {
    id,
    name,
    emoji,
    region: 'old_realm',
    continent,
    tier,
    level,
    desc: `${desc}\nทวีป${c.name} ดินแดนของ **${c.icon}** — ประตูสี${doorName[c.door]}ปรากฏบ่อยกว่าที่อื่น`,
    channel: true,
    ...(image ? { image } : {}),
    monsters: Object.keys(TIER_SPAWN[tier]),
    spawn: TIER_SPAWN[tier],
    doorWeights: continentDoors(c.door),
    travel: true,
  };
}

export const ZONES: Record<ZoneId, ZoneDef> = {
  rouge_land: {
    id: 'rouge_land',
    name: 'Rouge Land',
    emoji: '🩸',
    region: 'rouge_land',
    desc: LOCATIONS.rouge_land.desc,
    monsters: [],
    travel: true,
  },
  cypress: {
    id: 'cypress',
    name: 'Cypress Isle',
    emoji: '🏛️',
    region: 'cypress',
    desc: LOCATIONS.cypress.desc,
    // own channel + 📍 role like a city, but not a travel destination: only the red door leads here
    channel: true,
    monsters: [],
    travel: false,
  },
  ...Object.fromEntries(CITIES.map((c) => [c[0], cityZone(c)])),
};

const DEFAULT_ZONE: Record<Location, ZoneId> = { rouge_land: 'rouge_land', cypress: 'cypress', old_realm: 'paris' };

export const getZone = (id: ZoneId | undefined): ZoneDef | undefined => (id ? ZONES[id] : undefined);

export const zoneTier = (z: ZoneDef | undefined): TierDef => TIERS[z?.tier ?? 'easy'];

/** Zone the character is in. Falls back to the region default when zone is unset or stale. */
export function currentZone(char: Character): ZoneDef {
  const z = getZone(char.zone);
  return z && z.region === char.location ? z : ZONES[DEFAULT_ZONE[char.location]]!;
}

export function zoneLabel(z: ZoneDef): string {
  return z.region === 'old_realm' ? `${z.emoji} ${z.name} · Old Realm` : `${z.emoji} ${z.name}`;
}

/** City level (monsters here are this level). */
export const zoneLevel = (z: ZoneDef | undefined): number => z?.level ?? zoneTier(z).rec;

/** "🟡 Normal · Lv 5" */
export function tierLabel(z: ZoneDef): string {
  const t = zoneTier(z);
  return `${t.emoji} ${t.name} · Lv ${zoneLevel(z)}`;
}

/** "🟢 Easy Lv 1–3 · 🟡 Normal Lv 4–6 · …" — legend for the travel pickers. */
export function tierLegend(): string {
  return (Object.keys(TIERS) as Tier[])
    .map((id) => {
      const lv = mapCities().filter((z) => z.tier === id).map(zoneLevel);
      const [lo, hi] = [Math.min(...lv), Math.max(...lv)];
      return `${TIERS[id].emoji} ${TIERS[id].name} Lv ${lo === hi ? lo : `${lo}–${hi}`}`;
    })
    .join(' · ');
}

export type Risk = '' | '⚠️' | '💀';

/**
 * How dangerous a city is for this hunter — a warning only, nothing is locked.
 * ⚠️ = the city is above their level · 💀 = they'd need 13+ on the d20 before bonuses (`levelDC`: city ≈ 1.44× their level or more).
 */
export function cityRisk(char: Character, z: ZoneDef | undefined): Risk {
  const lv = zoneLevel(z);
  if (!z?.tier || lv <= char.level) return '';
  return levelDC(char.level, lv) >= 13 ? '💀' : '⚠️';
}

const RISK_TEXT: Record<Risk, string> = { '': '', '⚠️': '⚠️ สูงกว่าเลเวลคุณ', '💀': '💀 อันตรายมาก' };

/** "🟡 Normal · Lv 5 · ⚠️ สูงกว่าเลเวลคุณ" — tierLabel plus this hunter's own risk. */
export function riskLabel(char: Character, z: ZoneDef): string {
  const r = cityRisk(char, z);
  return r ? `${tierLabel(z)} · ${RISK_TEXT[r]}` : tierLabel(z);
}

/** Cities on the map (zones with their own channel). */
export const mapCities = (): ZoneDef[] => Object.values(ZONES).filter((z) => z.channel && z.travel);

/** Map cities grouped by continent, in display order. */
export function citiesByContinent(): [Continent, ZoneDef[]][] {
  return (Object.keys(CONTINENTS) as Continent[])
    .map((c) => [c, mapCities().filter((z) => z.continent === c)] as [Continent, ZoneDef[]])
    .filter(([, zs]) => zs.length > 0);
}

/** Zones the character may travel to right now. */
export function travelDestinations(char: Character): ZoneDef[] {
  // Only map cities (zones with a channel) are travel destinations; Rouge Land / Cypress come through the story.
  const here = currentZone(char).id;
  return mapCities().filter((z) => z.id !== here);
}

export type TravelResult = { ok: true; arriveAt: number } | { ok: false; error: string };

export function startTravel(char: Character, to: ZoneId, now = Date.now()): TravelResult {
  const z = getZone(to);
  const god = isDev(char);
  const home = to === 'rouge_land';
  if (!z || (!home && (!z.channel || !z.travel))) return { ok: false, error: 'ไปที่นั่นไม่ได้' };
  if (char.traveling) return { ok: false, error: `${travelLine(char, now)}\n-# เดินทางซ้อนไม่ได้ รอให้ถึงก่อน` };
  if (home && !god && !char.reachedRougeLand) {
    // Outsiders: Rouge Land stays shut until the ferryman takes them or they're strong enough
    if (char.level < balance.rougeLandUnlockLevel) {
      return {
        ok: false,
        error: `🚪 Rouge Land ยังไม่เปิดรับคุณ — หา 🟥 ประตูแดงแล้วข้ามทะเลกับคนพายเรือที่ Cypress Isle หรือแกร่งให้ถึง **เลเวล ${balance.rougeLandUnlockLevel}**`,
      };
    }
    char.reachedRougeLand = true;
  }
  if (home ? char.location === 'rouge_land' : currentZone(char).id === to) return { ok: false, error: 'คุณอยู่ที่นั่นแล้ว' };
  // Leaving Rouge Land through the butchery door is instant; coming back (or city → city) takes time.
  const instant = god || char.location === 'rouge_land';
  const arriveAt = instant ? now : now + balance.travelMs;
  char.traveling = { to, arriveAt };
  if (instant) resolveTravel(char, now);
  return { ok: true, arriveAt };
}

/** Finish travel if the time has come. Returns true if the character just arrived. */
export function resolveTravel(char: Character, now = Date.now()): boolean {
  const t = char.traveling;
  if (!t || now < t.arriveAt) return false;
  const z = getZone(t.to);
  delete char.traveling;
  if (!z) return false;
  char.zone = z.id;
  char.location = z.region;
  if (z.region === 'rouge_land') endTripSafe(char); // made it home: this trip's loot is safe
  return true;
}

/** Time left on the road in Thai ("30 นาที", "1 ชม. 5 นาที"), rounded up to the minute. */
export function travelLeft(char: Character, now = Date.now()): string {
  const ms = (char.traveling?.arriveAt ?? now) - now;
  if (ms <= 0) return 'ไม่กี่วินาที';
  const m = Math.ceil(ms / 60_000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h} ชม.${m % 60 ? ` ${m % 60} นาที` : ''}` : `${m} นาที`;
}

/** "🧭 กำลังเดินทางกลับ 🏠 Rouge Land — เหลือเวลาอีก 30 นาที" (null when not traveling). */
export function travelLine(char: Character, now = Date.now()): string | null {
  const t = char.traveling;
  if (!t) return null;
  const z = getZone(t.to);
  const where = `${z?.emoji ?? ''} **${z?.name ?? t.to}**`.trim();
  const verb = t.to === 'rouge_land' ? 'กำลังเดินทางกลับ' : 'กำลังเดินทางไป';
  return `🧭 ${verb} ${where} — เหลือเวลาอีก **${travelLeft(char, now)}**`;
}
