import { isGod } from './god.js';
import { balance } from '../config.js';
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

export interface TierDef {
  name: string;
  emoji: string;
  /** Suggested hunter level (shown, not enforced). */
  rec: number;
  hpMul: number;
  dmgAdd: number;
  acAdd: number;
  hitAdd: number;
  xpMul: number;
  lootMul: number;
  /** Lets stronger monsters (minLevel) spawn earlier. */
  lvlBonus: number;
}

export const TIERS: Record<Tier, TierDef> = {
  easy: { name: 'Easy', emoji: '🟢', rec: 1, hpMul: 1, dmgAdd: 0, acAdd: 0, hitAdd: 0, xpMul: 1, lootMul: 1, lvlBonus: 0 },
  normal: { name: 'Normal', emoji: '🟡', rec: 4, hpMul: 1.25, dmgAdd: 0, acAdd: 1, hitAdd: 0.03, xpMul: 1.6, lootMul: 1.3, lvlBonus: 2 },
  hard: { name: 'Hard', emoji: '🔴', rec: 8, hpMul: 1.5, dmgAdd: 1, acAdd: 1, hitAdd: 0.05, xpMul: 2.5, lootMul: 1.6, lvlBonus: 4 },
  epic: { name: 'Epic', emoji: '🟣', rec: 12, hpMul: 1.8, dmgAdd: 2, acAdd: 2, hitAdd: 0.07, xpMul: 4, lootMul: 2, lvlBonus: 6 },
};

export interface ZoneDef {
  id: ZoneId;
  name: string;
  emoji: string;
  region: Location;
  desc: string;
  continent?: Continent;
  tier?: Tier;
  /** Has its own channel in the location category → gets a panel + 📍 role. */
  channel?: boolean;
  /** Panel image in assets/panels/ (optional). */
  image?: string;
  /** Monster ids that spawn here (empty = no hunting). */
  monsters: string[];
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

const OLD_REALM_MONSTERS = ['starved_remnant', 'rot_crawler', 'stretched_shade', 'maw_hound', 'heretic', 'spore_husk', 'shifting_fiend'];

type CitySpec = [id: string, name: string, emoji: string, continent: Continent, tier: Tier, desc: string, image?: string];

/** Old Realm cities. Each gets a channel + 📍 role. Order = display order. */
const CITIES: CitySpec[] = [
  // Europe
  ['paris', 'Paris', '🗼', 'europe', 'easy', 'ถนนหินยืดยาวสุดสายตา หอไอเฟลบิดเป็นเกลียว เงาของผู้คนนั่งนิ่งในคาเฟ่ริมทาง'],
  ['vienna', 'Vienna', '🎻', 'europe', 'easy', 'โรงละครโอเปร่าบรรเลงวอลทซ์ไม่มีวันจบ ผู้ชมในชุดราตรีไม่เคยลุกจากเก้าอี้'],
  ['roma', 'Roma', '🏛️', 'europe', 'easy', 'โคลอสเซียมยังมีเสียงเชียร์ แม้อัฒจันทร์จะว่างเปล่า น้ำพุไหลเป็นสีชมพู'],
  ['athen', 'Athen', '🏺', 'europe', 'normal', 'วิหารพาร์เธนอนเสาเพิ่มขึ้นทุกคืน รูปปั้นเทพเจ้าหันหน้าตามผู้มาเยือน'],
  ['moscow', 'Moscow', '❄️', 'europe', 'normal', 'หิมะตกไม่หยุด โดมหัวหอมของวิหารเต้นตุบเหมือนหัวใจ'],
  ['byzantine', 'Byzantine', '🕌', 'europe', 'normal', 'นครโบราณที่ไม่ควรมีอยู่แล้ว กำแพงทองคำจารึกชื่อคนที่ยังไม่ตาย'],
  ['frankfurt', 'Frankfurt', '🏦', 'europe', 'hard', 'ตึกกระจกสะท้อนภาพที่ไม่ใช่คุณ ตลาดหุ้นซื้อขายเนื้อแทนเงิน'],
  ['geneva', 'Geneva', '⌚', 'europe', 'hard', 'นาฬิกานับพันเรือนเดินไม่ตรงกัน ทะเลสาบนิ่งจนเห็นอีกเมืองอยู่ใต้น้ำ'],
  ['budapest', 'Budapest', '🌉', 'europe', 'hard', 'สะพานข้ามแม่น้ำดานูบยาวขึ้นทุกครั้งที่เดิน บ่อน้ำร้อนเดือดเป็นเลือด'],
  ['granada', 'Granada', '🕍', 'europe', 'epic', 'พระราชวังอัลฮัมบราที่ลวดลายบนผนังขยับเป็นเรขาคณิต — ที่มั่นของ Loki'],
  // Asia
  ['bangkok', 'Bangkok', '🛕', 'asia', 'easy', 'ตลาดน้ำขายของที่ไม่มีใครรู้ว่าเนื้ออะไร ไฟจราจรแดงค้างตลอดกาล'],
  ['seoul', 'Seoul', '🏙️', 'asia', 'easy', 'ป้ายนีออนกะพริบเป็นภาษาที่อ่านไม่ออก ร้านไก่ทอดเปิดตลอด 24 ชั่วโมงโดยไม่มีพนักงาน'],
  ['shanghai', 'Shanghai', '🌃', 'asia', 'easy', 'ตึกระฟ้างอกสูงขึ้นทุกคืน เสียงไซเรนเรือดังจากแม่น้ำที่ไม่มีเรือ'],
  ['tibet', 'Tibet', '🏔️', 'asia', 'normal', 'ธงมนต์สะบัดทั้งที่ไม่มีลม พระที่นั่งสมาธิบนเขาไม่หายใจมาหลายร้อยปี'],
  ['delhi', 'Delhi', '🐘', 'asia', 'normal', 'ฝูงชนแน่นถนนแต่ไม่มีใครส่งเสียง เครื่องเทศหอมจนลืมไปว่ากลิ่นเน่า'],
  ['xinjiang', 'Xinjiang', '🐫', 'asia', 'normal', 'ทะเลทรายสีส้มที่เนินทรายย้ายที่เอง กองคาราวานเดินวนไม่ถึงไหน'],
  ['tehran', 'Tehran', '🕌', 'asia', 'hard', 'ตลาดบาซาร์วงกตไร้ทางออก พรมทอเป็นภาพของผู้ที่หลงเข้าไป'],
  ['qatar', 'Qatar', '🏜️', 'asia', 'hard', 'เมืองทองคำกลางทะเลทราย ความร้อนละลายเงาจนไหลไปตามพื้น'],
  ['tel_aviv', 'Tel Aviv', '🌊', 'asia', 'hard', 'ชายหาดที่คลื่นซัดเศษเนื้อขึ้นฝั่ง เสียงเพลงจากผับดังขึ้นแต่ไม่มีใครเต้น'],
  ['jerusalem', 'Jerusalem', '🕯️', 'asia', 'epic', 'นครศักดิ์สิทธิ์ที่เสียงสวดทุกภาษาปนกันจนกลายเป็นเสียงเคี้ยว — ที่มั่นของ Beelzebub'],
  // America
  ['british_columbia', 'British Columbia', '🌲', 'america', 'easy', 'ป่าสนสูงเสียดฟ้า ต้นไม้บางต้นมีเปลือกเป็นผิวหนังคน'],
  ['texas', 'Texas', '🤠', 'america', 'easy', 'ทุ่งกว้างไร้ขอบ วัวที่เลี้ยงไว้ยืนมองคุณด้วยดวงตามนุษย์'],
  ['new_york', 'New York', '🗽', 'america', 'easy', 'รถไฟใต้ดินวิ่งไม่หยุดสถานี ไทม์สแควร์ฉายโฆษณาของสิ่งที่ไม่มีอยู่จริง'],
  ['mexico_city', 'Mexico City', '💀', 'america', 'normal', 'เทศกาลวันแห่งความตายไม่เคยจบ หน้ากากหัวกะโหลกบางอันไม่ใช่หน้ากาก'],
  ['quebec', 'Quebec', '🍁', 'america', 'normal', 'เมืองเก่ากำแพงหิน หิมะสีแดงเหมือนน้ำเชื่อมเมเปิลไหลจากฟ้า'],
  ['miami', 'Miami', '🌴', 'america', 'normal', 'แสงนีออนชมพูกลางคืนนิรันดร์ จระเข้ในบึงพูดภาษาคนได้'],
  ['greenland', 'Greenland', '🧊', 'america', 'hard', 'ธารน้ำแข็งกว้างสุดตา มีร่างแช่แข็งนับพันอยู่ใต้ผิวน้ำแข็ง ลืมตาทุกร่าง'],
  ['haiti', 'Haiti', '🥁', 'america', 'hard', 'เสียงกลองดังจากทุกทิศ ศพที่ฝังไว้ลุกขึ้นมาเต้นตามจังหวะ'],
  ['panama', 'Panama', '🚢', 'america', 'hard', 'คลองที่ประตูน้ำเปิดสู่ความมืด เรือที่แล่นผ่านไปไม่เคยกลับออกมา'],
  ['north_pole', 'North Pole', '🌌', 'america', 'epic', 'ปลายสุดของโลก แสงเหนือสีฟ้าส่องลงมาเป็นความสิ้นหวัง — ที่มั่นของ Belphegor'],
  // South America
  ['quito', 'Quito', '⛰️', 'south_america', 'easy', 'เมืองบนเส้นศูนย์สูตรที่เงาไม่เคยตกลงพื้น ภูเขาไฟรอบเมืองหายใจเป็นจังหวะ'],
  ['barranquilla', 'Barranquilla', '🎭', 'south_america', 'easy', 'คาร์นิวัลที่ไม่มีวันเลิก นักเต้นสวมหน้ากากที่ถอดไม่ออกแล้ว'],
  ['rio', 'Rio', '🏖️', 'south_america', 'easy', 'รูปปั้นบนยอดเขากางแขนกว้างขึ้นทุกวัน ชายหาดเต็มไปด้วยคนนอนไม่ขยับ'],
  ['lima', 'Lima', '🌫️', 'south_america', 'normal', 'หมอกทะเลคลุมเมืองตลอดปี ในหมอกมีเสียงเรียกชื่อคุณ'],
  ['la_paz', 'La Paz', '🚡', 'south_america', 'normal', 'เมืองที่สูงที่สุด อากาศเบาบางจนความคิดหลุดลอยออกจากหัว กระเช้าลอยฟ้าไม่เคยจอด'],
  ['montevideo', 'Montevideo', '⚓', 'south_america', 'normal', 'ท่าเรือเงียบงัน เรือประมงกลับมาพร้อมแหที่เต็มไปด้วยมือคน'],
  ['santa_cruz', 'Santa Cruz', '🌾', 'south_america', 'hard', 'ทุ่งราบร้อนชื้นไร้ขอบ พืชไร่โน้มตัวตามคนที่เดินผ่าน'],
  ['iquique', 'Iquique', '🏜️', 'south_america', 'hard', 'เมืองชายทะเลทรายที่แห้งที่สุดในโลก ฝนไม่ตกมาร้อยปี แต่พื้นดินยังชุ่มเลือด'],
  ['amazonas', 'Amazonas', '🌳', 'south_america', 'epic', 'ป่าดิบที่กลืนทุกอย่าง แม่น้ำไหลย้อนกลับ ความสิ้นหวังหนาจนหายใจไม่ออก — ที่มั่นของ Belphegor'],
  // Africa
  ['cape_town', 'Cape Town', '🏔️', 'africa', 'easy', 'ภูเขาโต๊ะถูกเมฆเนื้อคลุมไว้ ลมแหลมพัดพากลิ่นคาวจากทะเล'],
  ['cairo', 'Cairo', '🐪', 'africa', 'easy', 'พีระมิดงอกเพิ่มกลางเมืองทุกคืน ตลาดขายเครื่องรางที่ยังเต้นอยู่'],
  ['alexandria', 'Alexandria', '📜', 'africa', 'easy', 'หอสมุดที่ไฟไม่เคยดับ หนังสือเขียนประวัติของคนที่เพิ่งเดินเข้ามา'],
  ['khartoum', 'Khartoum', '🌅', 'africa', 'normal', 'จุดที่แม่น้ำไนล์สองสายบรรจบ สายหนึ่งขาว อีกสายแดงฉาน'],
  ['burundi', 'Burundi', '🥁', 'africa', 'normal', 'เนินเขาเขียวขจีที่เสียงกลองดังจากใต้ดิน ต้นไม้ออกผลเป็นดวงตา'],
  ['tanganyika', 'Tanganyika', '🏞️', 'africa', 'normal', 'ทะเลสาบลึกไม่มีก้นบึ้ง ปลาที่จับได้มีฟันมนุษย์'],
  ['rwanda', 'Rwanda', '🦍', 'africa', 'hard', 'ภูเขาพันลูกในหมอก ฝูงกอริลลาเฝ้ามองด้วยดวงตาที่มากเกินไป'],
  ['kano', 'Kano', '🧱', 'africa', 'hard', 'กำแพงดินโบราณล้อมเมือง บ่อย้อมผ้าเดือดเป็นสีของเนื้อสด'],
  ['sahara', 'Sahara', '☀️', 'africa', 'epic', 'ทะเลทรายไร้ที่สิ้นสุด ทรายทุกเม็ดคือเนื้อที่งอกใหม่ไม่หยุด — ที่มั่นของ Sophia'],
  // Australia / Antarctica
  ['australia', 'Australia', '🦘', 'australia', 'epic', 'ทวีปทั้งทวีปที่แผ่นดินแดงฉานเงียบสนิท สัตว์ทุกตัวจ้องมองจากความมืด ความกลัวกลายเป็นอากาศ — ที่มั่นของ Hastur'],
  ['antarctica', 'Antarctica', '🧊', 'antarctica', 'epic', 'ความหนาวที่ไม่ได้ฆ่า แต่ทำให้ทรมานไม่สิ้นสุด ใต้น้ำแข็งมีบางอย่างหิวโหย — ที่มั่นของ Wendigo'],
];

function cityZone([id, name, emoji, continent, tier, desc, image]: CitySpec): ZoneDef {
  const c = CONTINENTS[continent];
  const doorName: Record<IconDoor, string> = { gray: 'เทา', orange: 'ส้ม', blue: 'ฟ้า', green: 'เขียว', yellow: 'เหลือง', white: 'ขาว', purple: 'ม่วง' };
  return {
    id,
    name,
    emoji,
    region: 'old_realm',
    continent,
    tier,
    desc: `${desc}\nทวีป${c.name} ดินแดนของ **${c.icon}** — ประตูสี${doorName[c.door]}ปรากฏบ่อยกว่าที่อื่น`,
    channel: true,
    ...(image ? { image } : {}),
    monsters: OLD_REALM_MONSTERS,
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

/** "🟡 Normal · Lv 4+" */
export function tierLabel(z: ZoneDef): string {
  const t = zoneTier(z);
  return `${t.emoji} ${t.name} · Lv ${t.rec}+`;
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
  const god = isGod(char);
  const home = to === 'rouge_land';
  if (!z || (!home && (!z.channel || !z.travel))) return { ok: false, error: 'ไปที่นั่นไม่ได้' };
  if (char.traveling) return { ok: false, error: 'คุณกำลังเดินทางอยู่แล้ว' };
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
  return true;
}
