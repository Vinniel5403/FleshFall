/**
 * What a hunt can turn up besides the monster's own body (`MonsterDef.drops` in hunt.ts):
 *  - per kill: local goods of the continent · gear that fits the city's tier · the decoration piece that monster guards
 *  - once per hunt won: a small real-world relic, or (rarely) a room-decoration piece
 * Tables + pickers only — hunt.ts rolls and hands the items over.
 */
import { DECOR_IDS, getItem } from './items.js';
import type { Continent, Tier } from './zones.js';

export type Weighted = [id: string, weight: number];

export function pickWeighted(list: Weighted[]): string {
  let r = Math.random() * list.reduce((s, [, w]) => s + w, 0);
  for (const [id, w] of list) if ((r -= w) < 0) return id;
  return list[0]![0];
}

/** Chance per kill that the monster carried something local. */
export const LOCAL_DROP_CHANCE = 0.1;

/** Local goods by continent (same flavor as the continent shop), with pick weights. */
export const LOCAL_DROPS: Record<Continent, Weighted[]> = {
  europe: [['absinthe', 4], ['blood_wine', 3], ['walking_cane', 2], ['kris', 2], ['pocket_watch', 1], ['vinyl_record', 1]],
  asia: [['spice_jerky', 4], ['instant_noodle', 4], ['carving_knife', 2], ['sigil', 1]],
  america: [['canned_beans', 4], ['grilled_meat', 3], ['lighter', 2], ['dead_phone', 1], ['old_shotgun', 0.3]],
  south_america: [['mate_tea', 4], ['fetal_flesh', 3], ['bone_club', 2], ['blood_apron', 2], ['family_photo', 1]],
  africa: [['myrrh_balm', 4], ['wild_flour', 3], ['bone_saw', 1], ['sigil', 1], ['placenta', 0.3]],
  australia: [['eucalyptus_oil', 4], ['alchemy_salve', 2], ['fresh_cut', 2], ['rusted_armor', 0.5]],
  antarctica: [['whale_blubber', 4], ['alchemy_salve', 2], ['fresh_cut', 2], ['old_shotgun', 0.5], ['rusted_armor', 0.5]],
};

/** Gear that fits the city's difficulty: chance per kill, one of `items`. */
export const TIER_GEAR: Record<Tier, { chance: number; items: string[] }> = {
  easy: { chance: 0.02, items: ['pipe', 'walking_cane', 'blood_apron'] },
  normal: { chance: 0.025, items: ['kris', 'carving_knife', 'bone_club', 'leather_coat'] },
  hard: { chance: 0.03, items: ['bone_saw', 'leather_coat', 'sigil'] },
  epic: { chance: 0.03, items: ['old_shotgun', 'rusted_armor', 'placenta'] },
};

/** Chance per kill of the decoration piece that monster kind guards (`MonsterDef.keepsake`); × the streak loot bonus. */
export const KEEPSAKE_CHANCE = 0.01;

/** Searching the place after a hunt is won: a small relic (`VINTAGE_IDS`) … */
export const RELIC_CHANCE = 0.08;
/** … or a room-decoration piece: base chance by tier, plus this per streak step (max 8 steps). */
export const DECOR_CHANCE: Record<Tier, number> = { easy: 0.02, normal: 0.03, hard: 0.04, epic: 0.06 };
export const DECOR_STREAK_STEP = 0.01;

/** Decoration found only on its own continent — three times as likely there as any single common piece. */
export const DECOR_LOCAL: Record<Continent, string> = {
  europe: 'grandfather_clock',
  asia: 'paper_lantern',
  america: 'jukebox',
  south_america: 'carnival_mask',
  africa: 'hide_drum',
  australia: 'outback_sign',
  antarctica: 'expedition_crate',
};

/** Decoration pieces any city can turn up. */
export const DECOR_COMMON = ['tube_radio', 'rotary_phone', 'crt_tv', 'typewriter', 'oil_lamp', 'cracked_mirror'];

export function pickDecor(continent: Continent | undefined): string {
  const pool: Weighted[] = DECOR_COMMON.map((id) => [id, 1]);
  if (continent) pool.push([DECOR_LOCAL[continent], 3]);
  return pickWeighted(pool);
}

/** Worth a line in the activity feed. */
export const prized = (id: string) => DECOR_IDS.includes(id) || (getItem(id)?.value ?? 0) >= 50;
