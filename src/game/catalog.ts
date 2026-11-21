/**
 * Live item catalog: code items + admin edits (db `items`) → ITEMS, rarities, shop stock and hunt drop pools.
 * The code tables (shops.ts, drops.ts) are snapshotted here on load as the defaults; `refreshCatalog` rebuilds the
 * live tables in place from those defaults + `PLACEMENT_OVERRIDE`. Discord-free.
 */
import { DECOR_COMMON, DECOR_LOCAL, LOCAL_DROPS, TIER_GEAR } from './drops.js';
import { applyItemPatches, baseItem, ITEMS, PLACEMENT_OVERRIDE, RARITY_WEIGHT } from './items.js';
import { CONTINENT_STOCK, STOCK } from './shops.js';
import type { ItemPatch, ItemPlacement, Rarity } from './types.js';
import { CONTINENTS, TIERS, type Continent, type Tier } from './zones.js';

export const CONTINENT_IDS = Object.keys(CONTINENTS) as Continent[];
export const TIER_IDS = Object.keys(TIERS) as Tier[];
export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'legendary'];

// ---------- defaults from the code (taken before anything is rebuilt) ----------

const BASE_STOCK = [...STOCK];
const BASE_CONTINENT_STOCK = Object.fromEntries(CONTINENT_IDS.map((c) => [c, [...CONTINENT_STOCK[c]]])) as Record<Continent, string[]>;
const BASE_LOCAL = Object.fromEntries(CONTINENT_IDS.map((c) => [c, LOCAL_DROPS[c].map(([id, w]) => [id, w] as const)])) as Record<Continent, (readonly [string, number])[]>;
const BASE_TIER = Object.fromEntries(TIER_IDS.map((t) => [t, [...TIER_GEAR[t].items]])) as Record<Tier, string[]>;
const BASE_DECOR_COMMON = [...DECOR_COMMON];
const BASE_DECOR_LOCAL = Object.fromEntries(CONTINENT_IDS.map((c) => [c, [...DECOR_LOCAL[c]]])) as Record<Continent, string[]>;

/** Placement as the code has it. */
export function basePlacement(id: string): ItemPlacement {
  return {
    shop: [...(BASE_STOCK.includes(id) ? (['home'] as const) : []), ...CONTINENT_IDS.filter((c) => BASE_CONTINENT_STOCK[c].includes(id))],
    local: CONTINENT_IDS.filter((c) => BASE_LOCAL[c].some(([x]) => x === id)),
    tiers: TIER_IDS.filter((t) => BASE_TIER[t].includes(id)),
    decor: [...(BASE_DECOR_COMMON.includes(id) ? (['any'] as const) : []), ...CONTINENT_IDS.filter((c) => BASE_DECOR_LOCAL[c].includes(id))],
  };
}

const NOWHERE: ItemPlacement = { shop: [], local: [], tiers: [], decor: [] };
export const placementOf = (id: string): ItemPlacement => (ITEMS[id]?.retired ? NOWHERE : (PLACEMENT_OVERRIDE[id] ?? basePlacement(id)));

/**
 * Rarity when nobody set one: decoration by how local it is, continent goods by their old pick weight,
 * everything else by shop value.
 */
export function defaultRarity(id: string): Rarity {
  const d = baseItem(id) ?? ITEMS[id];
  if (d?.decor) return CONTINENT_IDS.some((c) => BASE_DECOR_LOCAL[c].includes(id)) ? 'uncommon' : 'rare';
  const w = Math.max(0, ...CONTINENT_IDS.flatMap((c) => BASE_LOCAL[c].filter(([x]) => x === id).map(([, v]) => v)));
  if (w) return w >= 3 ? 'common' : w >= 2 ? 'uncommon' : w >= 1 ? 'rare' : 'legendary';
  const v = d?.value ?? 0;
  return v < 30 ? 'common' : v < 100 ? 'uncommon' : v < 200 ? 'rare' : 'legendary';
}

// ---------- rebuild ----------

const refill = <T>(arr: T[], items: T[]) => arr.splice(0, arr.length, ...items);

/** Ids in a table: the code's order first (still placed there), then the rest of the items that go there. */
function ordered(base: string[], wants: (id: string) => boolean): string[] {
  const kept = base.filter((id) => ITEMS[id] && wants(id));
  return [...kept, ...Object.keys(ITEMS).filter((id) => !kept.includes(id) && wants(id))];
}

/** Apply admin patches: items, then rarities, then every shop and drop pool. */
export function refreshCatalog(patches: ItemPatch[]): void {
  applyItemPatches(patches);
  for (const [id, d] of Object.entries(ITEMS)) d.rarity ??= defaultRarity(id);
  const where = Object.fromEntries(Object.keys(ITEMS).map((id) => [id, placementOf(id)]));
  const at = (id: string) => where[id]!;

  refill(STOCK, ordered(BASE_STOCK, (id) => at(id).shop.includes('home')));
  for (const c of CONTINENT_IDS) {
    refill(CONTINENT_STOCK[c], ordered(BASE_CONTINENT_STOCK[c], (id) => at(id).shop.includes(c)));
    const local = ordered(BASE_LOCAL[c].map(([id]) => id), (id) => at(id).local.includes(c));
    refill(LOCAL_DROPS[c], local.map((id) => [id, RARITY_WEIGHT[ITEMS[id]!.rarity!]]));
    refill(DECOR_LOCAL[c], ordered(BASE_DECOR_LOCAL[c], (id) => !!ITEMS[id]!.decor && at(id).decor.includes(c)));
  }
  for (const t of TIER_IDS) refill(TIER_GEAR[t].items, ordered(BASE_TIER[t], (id) => at(id).tiers.includes(t)));
  refill(DECOR_COMMON, ordered(BASE_DECOR_COMMON, (id) => !!ITEMS[id]!.decor && at(id).decor.includes('any')));
}

refreshCatalog([]);
