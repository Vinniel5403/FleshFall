/**
 * Icon dungeons + blessing tiers.
 *
 * Every dungeon rolls once on entry whether it is an "Icon dungeon" (the door's Icon
 * is present): rare — balance.iconDungeonHome when the door is the current continent's main color, iconDungeonAway elsewhere.
 * Only Icon dungeons end at that Icon's shrine. Each shrine visit raises the blessing
 * of THAT Icon by one tier (two for its own followers), up to MAX_BLESSING.
 * Green (Sophia) shrines also grant a resurrection rite that can bring a Fiend friend back.
 */
import { balance } from '../config.js';
import { isDev } from './dev.js';
import { ICON_BY_DOOR, ICONS } from './icons.js';
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
  thanatos: stat('str', 'พละ'),
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

/** Apply a shrine visit. Returns text lines. */
export function receiveBlessing(char: Character, door: IconDoor): string[] {
  const icon = ICON_BY_DOOR[door];
  const follower = char.icon === icon.id;
  const before = blessingTier(char, icon.id);
  const gain = Math.min(MAX_BLESSING - before, follower ? 2 : 1);
  const lines: string[] = [];
  if (gain > 0) {
    char.blessings = { ...char.blessings, [icon.id]: before + gain };
    const perk = BLESSING_PERK[icon.id];
    for (let n = 0; n < gain; n++) perk.apply(char);
    lines.push(`✨ **พรของ ${icon.name}** ขั้น ${before} → **${before + gain}**/${MAX_BLESSING} (${perk.label}${gain > 1 ? ` ×${gain}` : ''})`);
    if (follower) lines.push(`-# ผู้ศรัทธาของ ${icon.name} ได้พรเป็นสองเท่า`);
  } else {
    lines.push(`✨ พรของ ${icon.name} เต็มขั้นแล้ว — ${icon.name} เพียงจ้องมองคุณเงียบ ๆ`);
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
