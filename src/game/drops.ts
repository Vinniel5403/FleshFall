/**
 * What a hunt can turn up besides the monster's own body (`MonsterDef.drops` in hunt.ts):
 *  - per kill: local goods of the continent · gear that fits the city's tier · the decoration piece that monster guards
 *  - once per hunt won: a small real-world relic, or (rarely) a room-decoration piece
 * Tables + pickers only — hunt.ts rolls and hands the items over. These are the code defaults: catalog.ts rebuilds
 * them in place from admin placements, and picks inside a pool are weighted by item rarity (`rarityWeight`).
 */
import { DECOR_IDS, getItem, rarityWeight } from './items.js';
import type { Continent, Tier } from './zones.js';

export type Weighted = [id: string, weight: number];

/** One of `ids`, weighted by rarity (undefined when the pool is empty). */
export const pickByRarity = (ids: string[]): string | undefined => (ids.length ? pickWeighted(ids.map((id) => [id, rarityWeight(id)])) : undefined);

export function pickWeighted(list: Weighted[]): string {
  let r = Math.random() * list.reduce((s, [, w]) => s + w, 0);
  for (const [id, w] of list) if ((r -= w) < 0) return id;
  return list[0]![0];
}

/** Chance per kill that the monster carried something local. */
export const LOCAL_DROP_CHANCE = 0.1;

/** Local goods by continent (same flavor as the continent shop), with pick weights. */
export const LOCAL_DROPS: Record<Continent, Weighted[]> = {
  europe: [['absinthe', 4], ['blood_wine', 3], ['walking_cane', 2], ['kris', 2], ['meat_hook', 2], ['pocket_watch', 1], ['vinyl_record', 1], ['wedding_ring', 1], ['gold_glasses', 1], ['riot_vest', 0.5]],
  asia: [['spice_jerky', 4], ['instant_noodle', 4], ['carving_knife', 2], ['sigil', 1], ['cassette_tape', 1], ['samurai_do', 0.5], ['katana', 0.3]],
  america: [['canned_beans', 4], ['grilled_meat', 3], ['lighter', 2], ['claw_hammer', 2], ['dead_phone', 1], ['biker_jacket', 1], ['handheld_game', 0.5], ['film_camera', 0.5], ['old_shotgun', 0.3]],
  south_america: [['mate_tea', 4], ['fetal_flesh', 3], ['bone_club', 2], ['blood_apron', 2], ['machete', 2], ['family_photo', 1], ['old_coin', 1], ['hunting_bow', 0.5]],
  africa: [['myrrh_balm', 4], ['wild_flour', 3], ['rusty_chain', 1], ['bone_saw', 1], ['sigil', 1], ['old_coin', 1], ['hunting_bow', 0.5], ['rib_plate', 0.5], ['placenta', 0.3]],
  australia: [['eucalyptus_oil', 4], ['alchemy_salve', 2], ['fresh_cut', 2], ['cricket_bat', 2], ['boomerang', 1], ['rusted_armor', 0.5]],
  antarctica: [['whale_blubber', 4], ['alchemy_salve', 2], ['fresh_cut', 2], ['ice_pick', 2], ['fur_parka', 1], ['harpoon', 0.5], ['old_shotgun', 0.5], ['rusted_armor', 0.5]],
};

/**
 * Gear that fits the city's difficulty: chance per kill, one of `items`.
 * The reason to hunt in dangerous cities: the chance climbs with the tier, and hard/epic carry pieces no shop sells
 * (butcher_cleaver, revolver, spine_whip, hazmat_suit, knight_sword, chainsaw, fiend_hide, diving_suit, flesh_carapace, flesh_grenade, fiend_adrenal).
 */
export const TIER_GEAR: Record<Tier, { chance: number; items: string[] }> = {
  easy: { chance: 0.02, items: ['pipe', 'walking_cane', 'broken_bottle', 'meat_hook', 'blood_apron', 'feed_sack', 'rain_poncho'] },
  normal: { chance: 0.03, items: ['kris', 'carving_knife', 'bone_club', 'claw_hammer', 'rusty_chain', 'machete', 'leather_coat', 'biker_jacket', 'chainmail_apron', 'bone_bomb'] },
  hard: { chance: 0.05, items: ['bone_saw', 'sledgehammer', 'butcher_cleaver', 'revolver', 'spine_whip', 'rusted_armor', 'rib_plate', 'hazmat_suit', 'sigil', 'flesh_grenade', 'fiend_adrenal'] },
  epic: { chance: 0.07, items: ['old_shotgun', 'katana', 'knight_sword', 'chainsaw', 'fiend_hide', 'diving_suit', 'flesh_carapace', 'placenta', 'flesh_grenade', 'fiend_adrenal'] },
};

/** Chance per kill of the decoration piece that monster kind guards (`MonsterDef.keepsake`); × the streak loot bonus. */
export const KEEPSAKE_CHANCE = 0.01;

/** Searching the place after a hunt is won: a small relic (`VINTAGE_IDS`) … */
export const RELIC_CHANCE = 0.08;
/** … or a room-decoration piece: base chance by tier, plus this per streak step (max 8 steps). */
export const DECOR_CHANCE: Record<Tier, number> = { easy: 0.02, normal: 0.03, hard: 0.04, epic: 0.06 };
export const DECOR_STREAK_STEP = 0.01;

/** Decoration found only on its own continent (default rarity uncommon = twice a common piece's rare). */
export const DECOR_LOCAL: Record<Continent, string[]> = {
  europe: ['grandfather_clock', 'candelabra', 'manor_bookcase'],
  asia: ['paper_lantern', 'maneki_neko', 'bonsai'],
  america: ['jukebox', 'neon_sign', 'pinball'],
  south_america: ['carnival_mask', 'llama_rug', 'clay_idol'],
  africa: ['hide_drum', 'carved_stool', 'safari_trunk'],
  australia: ['outback_sign', 'bitten_surfboard', 'croc_skull'],
  antarctica: ['expedition_crate', 'ship_wheel', 'stuffed_penguin'],
};

/** Decoration pieces any city can turn up. */
export const DECOR_COMMON = [
  'tube_radio', 'rotary_phone', 'crt_tv', 'typewriter', 'oil_lamp', 'cracked_mirror',
  'snow_globe', 'porcelain_doll', 'birdcage', 'music_box', 'rocking_chair', 'gramophone', 'sewing_machine', 'dollhouse', 'deer_trophy', 'clawfoot_tub',
];

export function pickDecor(continent: Continent | undefined): string | undefined {
  return pickByRarity([...DECOR_COMMON, ...(continent ? DECOR_LOCAL[continent] : [])]);
}

/** Worth a line in the activity feed. */
export const prized = (id: string) => DECOR_IDS.includes(id) || (getItem(id)?.value ?? 0) >= 50;
