/**
 * Admin endpoints (website /admin): item catalog edits. Called like the account endpoints
 * (`/api/account/admin/*`, Bearer API_SECRET, `userId` from the verified website session); server.ts checks the
 * user's live Discord username against ADMIN_USERS before any of these run.
 */
import { db } from '../db/index.js';
import { refreshCatalog } from '../game/catalog.js';
import { adminCatalog, adminItem, isItemImageKey, itemPatchFromForm, purgeItem } from '../game/itemAdmin.js';
import { ITEMS } from '../game/items.js';
import type { ItemPatch } from '../game/types.js';

/** Discord usernames allowed on /admin (env ADMIN_USERS, comma-separated, overrides the default). */
export const ADMIN_USERS = (process.env.ADMIN_USERS ?? 'vinniel_,lilium666,lalalo8888,reiginleifz,ringo.kieta')
  .split(',')
  .map((u) => u.trim().toLowerCase())
  .filter(Boolean);

type Reply = { code: number; body: unknown };
const ok = (body: unknown): Reply => ({ code: 200, body });
const fail = (code: number, error: string): Reply => ({ code, body: { error } });

const patches = () => new Map(db.allItemPatches().map((p) => [p.id, p]));

function store(id: string, patch: ItemPatch | null): void {
  if (patch) db.saveItemPatch(patch);
  else db.deleteItemPatch(id);
  refreshCatalog(db.allItemPatches());
}

export function listItems(): Reply {
  return ok(adminCatalog(new Set(patches().keys())));
}

/** Save the item form (`b.item`, `b.isNew`). */
export function saveItem(b: Record<string, unknown>): Reply {
  const form = b.item as Record<string, unknown> | undefined;
  const id = typeof form?.id === 'string' ? form.id.trim() : '';
  const r = itemPatchFromForm(form, patches().get(id), b.isNew === true);
  if (typeof r === 'string') return fail(400, r);
  store(id, r);
  return ok({ item: adminItem(id) });
}

/** Code item back to how items.ts has it (keeps uploaded art). */
export function resetItem(b: Record<string, unknown>): Reply {
  const id = typeof b.id === 'string' ? b.id : '';
  const cur = patches().get(id);
  if (!ITEMS[id]) return fail(404, 'ไม่พบไอเทมนี้');
  if (ITEMS[id]!.custom) return fail(400, 'ไอเทมที่สร้างเองรีเซ็ตไม่ได้');
  store(id, cur?.image ? { id, image: cur.image, imageSize: cur.imageSize } : null);
  return ok({ item: adminItem(id) });
}

/** Set (`key` + `size`) or remove (`key: null`) an item's art. Replies with the replaced key so the website deletes it from R2. */
export function setItemImage(b: Record<string, unknown>): Reply {
  const id = typeof b.id === 'string' ? b.id : '';
  if (!ITEMS[id]) return fail(404, 'ไม่พบไอเทมนี้');
  const key = b.key;
  if (key !== null && !isItemImageKey(key, id)) return fail(400, 'bad key');
  const size = Array.isArray(b.size) && b.size.length === 2 && b.size.every((n) => Number.isInteger(n) && n > 0 && n <= 10_000) ? (b.size as [number, number]) : undefined;
  if (key && !size) return fail(400, 'bad size');
  const cur = patches().get(id) ?? { id };
  const evicted = cur.image && cur.image !== key ? [cur.image] : [];
  const next: ItemPatch = { ...cur };
  if (key) Object.assign(next, { image: key, imageSize: size });
  else {
    delete next.image;
    delete next.imageSize;
  }
  store(id, Object.keys(next).length > 1 || next.custom ? next : null);
  return ok({ item: adminItem(id), evicted });
}

/**
 * Delete a custom item for good: off every character (inventory, trip haul, equipment, room) and out of the
 * market (sell orders vanish with their items; buy orders give the escrowed flesh back). Code items can't be deleted.
 */
export function deleteItem(b: Record<string, unknown>): Reply {
  const id = typeof b.id === 'string' ? b.id : '';
  const d = ITEMS[id];
  if (!d) return fail(404, 'ไม่พบไอเทมนี้');
  if (!d.custom) return fail(400, 'ไอเทมในโค้ดลบไม่ได้ — เอาออกจากร้าน/ดรอปแทน');
  let players = 0;
  for (const c of db.allCharacters()) {
    if (!purgeItem(c, id)) continue;
    db.saveCharacter(c);
    players++;
  }
  for (const o of db.allOrders().filter((x) => x.item === id)) {
    const owner = o.kind === 'buy' ? db.getCharacter(o.owner) : undefined;
    if (owner) {
      owner.flesh += o.qty * o.price;
      db.saveCharacter(owner);
    }
    db.deleteOrder(o.id);
  }
  store(id, null);
  return ok({ deleted: id, players, evicted: d.image ? [d.image] : [] });
}
