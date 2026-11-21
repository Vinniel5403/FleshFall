/**
 * Icon dungeons + blessing tiers.
 *
 * Every dungeon rolls once on entry whether it is an "Icon dungeon" (the door's Icon
 * is present): rare — balance.iconDungeonHome when the door is the current continent's main color, iconDungeonAway elsewhere.
 * Only Icon dungeons end at that Icon's shrine. Each shrine visit raises the blessing
 * of THAT Icon by one tier (two for its own followers), up to MAX_BLESSING — for an offering of
 * sigils (`shrineCost`: the first blessing is free, each later one costs more). No offering = no new tier.
 * Green (Sophia) shrines also grant a resurrection rite that can bring a Fiend friend back.
 */
import { balance } from '../config.js';
import { itemCount, removeItem } from './character.js';
import { isDev } from './dev.js';
import { feed } from './feed.js';
import { ICON_BY_DOOR, ICONS } from './icons.js';
import { itemLabel } from './items.js';
import type { Character, IconDoor, IconId, StatKey } from './types.js';
import { CONTINENTS, currentZone } from './zones.js';

export const MAX_BLESSING = 5;

type Perk = { label: string; apply: (c: Character) => void };
const stat = (k: StatKey, name: string): Perk => ({ label: `${name} +1`, apply: (c) => void (c.stats[k] += 1) });
const maxHp = (n: number): Perk => ({ label: `เนื้อกายสูงสุด +${n}`, apply: (c) => ((c.maxHp += n), (c.hp += n)) });

/** Permanent bonus gained per blessing tier. */
export const BLESSING_PERK: Record<IconId, Perk> = {
  beelzebub: { label: 'แรงสูงสุด +1', apply: (c) => ((c.maxStamina += 1), (c.stamina += 1)) },
  hastur: stat('int', 'สัมผัส'),
  loki: stat('agi', 'ว่องไว'),
  belphegor: maxHp(4),
  sophia: maxHp(4),
  thanatos: stat('str', 'พละกำลัง'),
  wendigo: maxHp(5),
};

/** Roll on dungeon entry. God always gets an Icon dungeon (testing). */
export function rollIconDungeon(char: Character, door: IconDoor): boolean {
  if (isDev(char)) return true;
  const cont = currentZone(char).continent;
  const home = cont && CONTINENTS[cont].door === door;
  return Math.random() < (home ? balance.iconDungeonHome : balance.iconDungeonAway);
}

export const blessingTier = (c: Character, icon: IconId) => c.blessings?.[icon] ?? 0;

/**
 * Sigils the door's shrine takes before it raises that Icon's blessing: `balance.shrineSigilPerTier` × the tier already held
 * (0 for the first blessing and once it is full). Paid from the inventory — a sigil still in the trip haul doesn't count.
 */
export function shrineCost(char: Character, door: IconDoor): number {
  const tier = blessingTier(char, ICON_BY_DOOR[door].id);
  return tier >= MAX_BLESSING ? 0 : balance.shrineSigilPerTier * tier;
}

/** One line for the exit screen when the shrine will ask for an offering (undefined = nothing to pay). */
export function shrineNote(char: Character, door: IconDoor): string | undefined {
  const cost = shrineCost(char, door);
  if (!cost) return undefined;
  const have = itemCount(char, 'sigil');
  return `-# 🔯 ศาลจะเลื่อนขั้นพรให้เมื่อถวาย ${itemLabel('sigil', cost)} — ในกระเป๋ามี ${have}${have < cost ? ' (ไม่พอ: เข้าศาลได้ แต่พรจะไม่เลื่อนขั้น)' : ''}`;
}

/** Apply a shrine visit. Returns text lines. */
export function receiveBlessing(char: Character, door: IconDoor): string[] {
  const icon = ICON_BY_DOOR[door];
  const follower = char.icon === icon.id;
  const before = blessingTier(char, icon.id);
  const cost = shrineCost(char, door);
  const offered = removeItem(char, 'sigil', cost);
  const gain = offered ? Math.min(MAX_BLESSING - before, follower ? 2 : 1) : 0;
  const lines: string[] = [];
  if (gain > 0) {
    if (cost) lines.push(`🔯 คุณวาง ${itemLabel('sigil', cost)} ลงบนแท่น มันละลายหายไปในเนื้อหิน`);
    char.blessings = { ...char.blessings, [icon.id]: before + gain };
    const perk = BLESSING_PERK[icon.id];
    for (let n = 0; n < gain; n++) perk.apply(char);
    feed(char, 'shrine', `**${char.name}** ได้รับพรของ ${icon.emoji} ${icon.name} ขั้น ${before + gain}/${MAX_BLESSING}`);
    lines.push(`✨ **พรของ ${icon.name}** ขั้น ${before} → **${before + gain}**/${MAX_BLESSING} (${perk.label}${gain > 1 ? ` ×${gain}` : ''})`);
    if (follower) lines.push(`-# ผู้ศรัทธาของ ${icon.name} ได้พรเป็นสองเท่า`);
  } else if (!offered) {
    lines.push(
      `🔯 **${icon.name} รอเครื่องถวาย** — พรขั้น ${before} จะเลื่อนขึ้นเมื่อมี ${itemLabel('sigil', cost)} ในกระเป๋า (ตอนนี้มี ${itemCount(char, 'sigil')})`,
      '-# หาตราได้จาก 🛒 ร้านใน Rouge Land · ร้านประจำทวีป Asia / Africa · ล่าสาวกนอกรีต · เมืองระดับ Hard',
    );
  } else {
    lines.push(`✨ พรของ ${icon.name} เต็มขั้นแล้ว — ${icon.name} เพียงจ้องมองคุณเงียบ ๆ`);
  }
  if (isDev(char)) {
    const pct = (p: number) => `${+(p * 100).toFixed(1)}%`;
    lines.push(`-# ⚡ Dev: ดันเจียน Icon โผล่ทุกครั้ง — ผู้เล่นทั่วไปเจอ ${pct(balance.iconDungeonHome)} (ประตูสีประจำทวีป) / ${pct(balance.iconDungeonAway)} (สีอื่น)`);
  }
  if (icon.id === 'sophia') {
    char.inventory.sophia_rite = (char.inventory.sophia_rite ?? 0) + 1;
    char.inventory.placenta = (char.inventory.placenta ?? 0) + 1;
    lines.push('🥚 **Sophia ประทานพิธีชุบชีวิต** — ใช้ `/revive` เพื่อนำเพื่อนที่กลายเป็น Fiend กลับมาได้ 1 คน · และ 🥚 รกคืนชีพ 1 ชิ้น');
  }
  return lines;
}

export function blessingsText(char: Character): string | undefined {
  const entries = Object.entries(char.blessings ?? {}).filter(([, n]) => n && n > 0) as [IconId, number][];
  if (!entries.length) return undefined;
  return entries.map(([id, n]) => `${ICONS[id].emoji} ${ICONS[id].name} ${'◆'.repeat(n)}${'◇'.repeat(MAX_BLESSING - n)}`).join('\n');
}
