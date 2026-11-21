/**
 * Item editing for the website's admin page (Dev role): validate a submitted item form, turn it into the smallest
 * patch against the code item (db `items`), and the views the admin page / rooms read. Discord-free; the
 * caller stores the patch and calls `refreshCatalog`.
 */
import { imageUrl } from './account.js';
import { basePlacement, CONTINENT_IDS, defaultRarity, placementOf, RARITIES, TIER_IDS } from './catalog.js';
import { baseItem, getItem, ITEMS, itemEffects } from './items.js';
import type { Character, ItemDef, ItemPatch, ItemPlacement, ItemType, Rarity } from './types.js';
import { CONTINENTS, TIERS } from './zones.js';

export const ITEM_TYPES: ItemType[] = ['consumable', 'weapon', 'armor', 'material', 'vintage', 'furniture'];
const NEW_ID = /^[a-z][a-z0-9_]{1,31}$/;
/** R2 key of an uploaded item image (the website builds it). */
export const ITEM_IMAGE_KEY = /^items\/[a-z0-9_]{2,32}-[0-9a-f]{18}\.(webp|png|jpg)$/;
export const isItemImageKey = (k: unknown, id: string): k is string => typeof k === 'string' && ITEM_IMAGE_KEY.test(k) && k.startsWith(`items/${id}-`);

/** Room the sticker sizes are worked out against (every template is 2560×~835 px and 310 cm tall). */
const ROOM = { w: 2560, h: 835, cm: 310, floor: 0.948 };
const DEFAULT_CM = 60;

// ---------- views ----------

export function adminItem(id: string) {
  const d = ITEMS[id]!;
  return {
    ...d,
    image: d.image ? (imageUrl(d.image) ?? null) : null,
    imageKey: d.image ?? null,
    effects: itemEffects(id),
    where: placementOf(id),
    custom: !!d.custom,
    /** fields a form can't edit (kept as they are) */
    special: [d.buff && 'buff', d.blast && 'blast'].filter(Boolean) as string[],
  };
}

export function adminCatalog(patched: Set<string>) {
  return {
    items: Object.keys(ITEMS).map((id) => ({ ...adminItem(id), edited: patched.has(id) && !ITEMS[id]!.custom })),
    continents: CONTINENT_IDS.map((c) => ({ id: c, name: CONTINENTS[c].name, emoji: CONTINENTS[c].emoji })),
    tiers: TIER_IDS.map((t) => ({ id: t, name: `${TIERS[t].emoji} ${TIERS[t].name}` })),
    rarities: RARITIES,
    types: ITEM_TYPES,
  };
}

/** Public item list (web): numbers + art URL. */
export const publicItem = (d: ItemDef) => ({ ...d, image: d.image ? (imageUrl(d.image) ?? undefined) : undefined });

/** `{id, name, emoji, image?}` for inventories/equipment in API replies. */
export const namedItem = (id: string) => {
  const d = getItem(id);
  return { id, name: d?.name ?? id, emoji: d?.emoji ?? '❔', ...(d?.image && imageUrl(d.image) && { image: imageUrl(d.image) }) };
};

/**
 * Room stickers made from uploaded item art (catalog entries the website adds on top of its built rooms.json):
 * size from `sizeCm` against the room height, default spot on the floor.
 */
export function roomArt() {
  const out: { id: string; name: string; room: string; src: string; x: number; y: number; w: number; h: number }[] = [];
  for (const d of Object.values(ITEMS)) {
    const src = d.furniture && d.image && imageUrl(d.image);
    if (!src || !d.furniture) continue;
    const [iw, ih] = d.imageSize ?? [1, 1];
    const h = Math.min(1, (d.sizeCm ?? DEFAULT_CM) / ROOM.cm);
    const w = (h * ROOM.h * (iw / ih)) / ROOM.w;
    const r = (v: number) => Math.round(v * 1e5) / 1e5;
    out.push({ id: d.furniture, name: d.name, room: 'upload', src, x: r(0.5 - w / 2), y: r(Math.max(0, ROOM.floor - h)), w: r(w), h: r(h) });
  }
  return out;
}

// ---------- form → patch ----------

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
function num(v: unknown, min: number, max: number): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n !== 0 ? Math.max(min, Math.min(max, n)) : undefined;
}
const pick = <T extends string>(v: unknown, all: readonly T[]): T[] => (Array.isArray(v) ? all.filter((x) => v.includes(x)) : []);

function cleanWhere(v: unknown): ItemPlacement | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  return {
    shop: pick(o.shop, ['home', ...CONTINENT_IDS] as const),
    local: pick(o.local, CONTINENT_IDS),
    tiers: pick(o.tiers, TIER_IDS),
    decor: pick(o.decor, ['any', ...CONTINENT_IDS] as const),
  };
}

const sameWhere = (a: ItemPlacement, b: ItemPlacement) => (['shop', 'local', 'tiers', 'decor'] as const).every((k) => [...a[k]].sort().join() === [...b[k]].sort().join());

/** Form fields an admin can set (anything else on the item — buff, blast, furniture id, image — is kept). */
const FIELDS = ['name', 'emoji', 'type', 'description', 'value', 'heal', 'stamina', 'sanity', 'humanity', 'isFlesh', 'atk', 'def', 'decor', 'rarity', 'sizeCm'] as const;

/**
 * Validate a submitted item form. Returns the patch to store (`null` = no difference from the code item → delete
 * the row) or an error string. New items need an unused id; code items keep their type.
 */
export function itemPatchFromForm(raw: unknown, current: ItemPatch | undefined, isNew: boolean): ItemPatch | null | string {
  if (!raw || typeof raw !== 'object') return 'ข้อมูลไม่ถูกต้อง';
  const f = raw as Record<string, unknown>;
  const id = text(f.id, 40);
  if (isNew) {
    if (!NEW_ID.test(id)) return 'id ใช้ได้แค่ a-z 0-9 _ (2–32 ตัว ขึ้นต้นด้วยตัวอักษร)';
    if (ITEMS[id]) return `มีไอเทม id "${id}" อยู่แล้ว`;
  } else if (!ITEMS[id]) return 'ไม่พบไอเทมนี้';

  const base = baseItem(id);
  const name = text(f.name, 40);
  const emoji = text(f.emoji, 16);
  if (!name) return 'ต้องมีชื่อ';
  if (!emoji) return 'ต้องมีอีโมจิ (ใช้แทนรูปตอนยังไม่อัป)';
  const type = (base?.type ?? (ITEM_TYPES.includes(f.type as ItemType) ? f.type : null)) as ItemType | null;
  if (!type) return 'ประเภทไม่ถูกต้อง';
  const rarity = RARITIES.includes(f.rarity as Rarity) ? (f.rarity as Rarity) : undefined;
  const usable = type === 'consumable';
  const next: Partial<ItemDef> = {
    name,
    emoji,
    type,
    description: text(f.description, 400),
    value: num(f.value, 0, 100_000) ?? 0,
    heal: usable ? num(f.heal, -200, 500) : undefined,
    stamina: usable ? num(f.stamina, -50, 100) : undefined,
    sanity: usable ? num(f.sanity, -100, 100) : undefined,
    humanity: usable ? num(f.humanity, -100, 100) : undefined,
    isFlesh: usable && f.isFlesh === true ? true : undefined,
    atk: type === 'weapon' ? num(f.atk, 0, 50) : undefined,
    def: type === 'armor' ? num(f.def, 0, 50) : undefined,
    decor: base ? base.decor : type === 'vintage' && f.decor === true ? true : undefined,
    rarity,
    sizeCm: num(f.sizeCm, 5, 300),
  };
  const where = cleanWhere(f.where);

  // smallest patch: only what differs from the code item (a custom item stores everything)
  const patch: ItemPatch = { id, ...(current?.image && { image: current.image, imageSize: current.imageSize }) };
  if (!base) Object.assign(patch, { custom: true }, Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined)));
  else {
    const p = patch as Record<string, unknown>;
    for (const k of FIELDS) {
      const v = next[k];
      const was = base[k];
      if (k === 'rarity') {
        if (v && v !== defaultRarity(id)) p[k] = v;
      } else if (k === 'isFlesh' || k === 'decor') {
        if (!!v !== !!was) p[k] = !!v;
      } else if (typeof was === 'number' || typeof v === 'number') {
        // a cleared number is stored as 0 so it doesn't fall back to the code value
        if ((v ?? 0) !== (was ?? 0)) p[k] = v ?? 0;
      } else if (v !== was) p[k] = v;
    }
  }
  if (where && (!base || !sameWhere(where, basePlacement(id)))) patch.where = where;
  return Object.keys(patch).length > 1 ? patch : null;
}

/** Deleting a custom item: take every trace of it off a character. Returns whether anything changed. */
export function purgeItem(char: Character, id: string): boolean {
  const furn = ITEMS[id]?.furniture;
  let hit = false;
  const drop = (rec: Record<string, number> | undefined) => {
    if (rec && id in rec) {
      delete rec[id];
      hit = true;
    }
  };
  drop(char.inventory);
  drop(char.trip?.loot);
  drop(char.hunt?.loot);
  drop(char.gearLevels);
  drop(char.gearMerged);
  for (const slot of ['weapon', 'armor'] as const)
    if (char.equipped[slot] === id) {
      delete char.equipped[slot];
      hit = true;
    }
  if (furn && char.room?.items.some((i) => i.id === furn)) {
    char.room.items = char.room.items.filter((i) => i.id !== furn);
    hit = true;
  }
  return hit;
}
