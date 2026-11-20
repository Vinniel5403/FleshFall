/**
 * Web account rules: character creation from the website + character images.
 * Pure + Discord-free. Image bytes live in object storage (R2); the character only stores keys.
 */
import { createHmac, randomBytes } from 'node:crypto';
import type { CharImage, CharRoom, CharSprite, Character, RoomItem, ImageSlot, SpritePart } from './types.js';
import { currentZone, getZone, travelVerb, zoneLabel } from './zones.js';
import { balance } from '../config.js';
import { addItem, itemCount } from './character.js';
import { FURNITURE_ITEM, itemLabel } from './items.js';

export interface ImageSlotDef {
  id: ImageSlot;
  name: string;
  desc: string;
  /** how many images this slot holds */
  max: number;
}

export const IMAGE_SLOTS: Record<ImageSlot, ImageSlotDef> = {
  portrait: { id: 'portrait', name: 'ภาพโปรไฟล์', desc: 'ภาพหน้าตัวละคร (สี่เหลี่ยมจัตุรัส)', max: 1 },
  art: { id: 'art', name: 'ภาพตัวละคร', desc: 'ภาพเต็มตัว / ภาพหลักของตัวละคร', max: 1 },
  sheet: { id: 'sheet', name: 'ชีตอ้างอิง', desc: 'Reference sheet — ด้านหน้า/หลัง ชุด อาวุธ', max: 1 },
  gallery: { id: 'gallery', name: 'แกลเลอรี', desc: 'ภาพอื่น ๆ ของตัวละคร', max: 6 },
};

export const IMAGE_EXT = ['webp', 'png', 'jpg'] as const;
export type ImageExt = (typeof IMAGE_EXT)[number];
/** Upload limit after the browser re-encodes (Vercel caps request bodies at 4.5MB). */
export const IMAGE_MAX_BYTES = 4 * 1024 * 1024;

export const isSlot = (s: unknown): s is ImageSlot => typeof s === 'string' && s in IMAGE_SLOTS;
export const isUserId = (s: unknown): s is string => typeof s === 'string' && /^\d{17,20}$/.test(s);

/**
 * Opaque storage folder for a user's uploads — public image URLs must never contain the Discord id.
 * HMAC of the user id with API_SECRET; the website computes the same value from BOT_API_SECRET
 * (web/src/lib/server/media.ts), so no extra round trip. null when API_SECRET is unset (uploads off).
 */
export function mediaId(userId: string, secret = process.env.API_SECRET): string | null {
  return secret ? createHmac('sha256', secret).update(`media:${userId}`).digest('hex').slice(0, 16) : null;
}

/** Old-format key with the Discord id in its path (`chars/<uid>/…`, `sprites/<uid>/…`) — never shown publicly. */
export const isLegacyKey = (userId: string, key: string) => key.split('/')[1] === userId;

/** Object key for a new upload. Keys are never reused, so CDN caching can be immutable. */
export function imageKey(mid: string, slot: ImageSlot, ext: ImageExt, rand: string): string {
  return `chars/${mid}/${slot}-${rand}.${ext}`;
}

/** Only keys we minted for this user (in their media folder) may be attached to their character. */
export function isOwnKey(userId: string, slot: ImageSlot, key: string): boolean {
  const mid = mediaId(userId);
  if (!mid) return false;
  const re = new RegExp(`^chars/${mid}/${slot}-[a-z0-9]{12,32}\\.(${IMAGE_EXT.join('|')})$`);
  return re.test(key);
}

/** Images + sprite safe to show publicly (legacy uid-path keys hidden until migrated). */
export function publicMedia(char: Character): { images: CharImage[]; sprite: CharSprite | null } {
  return {
    images: (char.images ?? []).filter((i) => !isLegacyKey(char.userId, i.key)),
    sprite: char.sprite && !isLegacyKey(char.userId, char.sprite.base) ? char.sprite : null,
  };
}

/** Migration: point a character's legacy keys at their new media-folder copies. `map` = old key/base → new. */
export function renameMedia(char: Character, map: Record<string, string>): string | null {
  const mid = mediaId(char.userId);
  if (!mid) return 'API_SECRET missing';
  for (const [from, to] of Object.entries(map)) {
    if (typeof to !== 'string' || !isLegacyKey(char.userId, from)) return `bad source ${from}`;
    // same path, only the folder swapped: chars/<uid>/x → chars/<mid>/x
    const parts = from.split('/');
    parts[1] = mid;
    if (to !== parts.join('/')) return `bad target ${to}`;
  }
  for (const img of char.images ?? []) if (map[img.key]) img.key = map[img.key]!;
  if (char.sprite && map[char.sprite.base]) char.sprite.base = map[char.sprite.base]!;
  return null;
}

/** Migration: everything still stored under a Discord-id path. */
export function legacyMedia(char: Character): { images: string[]; sprite: { base: string; keys: string[] } | null } {
  return {
    images: (char.images ?? []).map((i) => i.key).filter((k) => isLegacyKey(char.userId, k)),
    sprite: char.sprite && isLegacyKey(char.userId, char.sprite.base) ? { base: char.sprite.base, keys: spriteKeys(char.sprite) } : null,
  };
}

/** Letters/marks/digits (incl. Thai) + space . _ ' - only: no mentions, markdown or control chars. */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 32) return null;
  // must also contain a letter/digit, so the URL handle is never "..", "--" etc.
  return /^[\p{L}\p{M}\p{N} ._'-]+$/u.test(name) && /[\p{L}\p{N}]/u.test(name) ? name : null;
}

/** Base URL handle of a name: NFC, lowercase, spaces → '-'. Names may repeat — see assignHandles for the unique one. */
export const nameHandle = (name: string) => name.normalize('NFC').trim().toLowerCase().replace(/\s+/g, '-');

/**
 * Unique public handles → fleshfall.org/profile/<handle>. First come, first served by *when each character took
 * its current name* (`nameAt`, else `createdAt`): the earliest keeps the base handle, later duplicates get
 * `<base>-2`, `-3`… (skipping handles already taken, e.g. by a real "Sonya 2"). Derived, not stored — if the
 * holder renames away, the next one moves up.
 * Pass every real player (same list everywhere, or handles disagree).
 */
export function assignHandles(chars: readonly Pick<Character, 'userId' | 'name' | 'createdAt' | 'nameAt'>[]): Map<string, string> {
  const taken = new Set<string>();
  const out = new Map<string, string>();
  const since = (c: Pick<Character, 'createdAt' | 'nameAt'>) => c.nameAt ?? c.createdAt;
  const ordered = [...chars].sort((a, b) => since(a) - since(b) || (a.userId < b.userId ? -1 : 1));
  for (const c of ordered) {
    const base = nameHandle(c.name);
    let h = base;
    for (let n = 2; taken.has(h); n++) h = `${base}-${n}`;
    taken.add(h);
    out.set(c.userId, h);
  }
  return out;
}

/** A letter/digit of a script that puts spaces between words — Thai runs on, so a Thai neighbour never blocks a tag. */
const wordy = (ch: string | undefined) => !!ch && /[\p{L}\p{N}_]/u.test(ch) && !/\p{Script=Thai}/u.test(ch);

/**
 * RP text: `@Name` → `<@userId>`, a real mention of the player behind that character. Matches the unique handle
 * (assignHandles), any case: `@Sternen`, `@mary ann` / `@mary-ann`, `@sonya-2` for a later namesake; the longest
 * name wins. Left alone: `\@Name`, e-mail / URL `@`, and a name that runs on into more letters (`@Sternenx`).
 * Pass every real player, like assignHandles.
 */
export function tagCharacters(text: string, chars: readonly Pick<Character, 'userId' | 'name' | 'createdAt' | 'nameAt'>[]): string {
  if (!text.includes('@')) return text;
  const handles = [...assignHandles(chars)].sort((a, b) => b[1].length - a[1].length);
  const typed = (from: number, len: number) => text.slice(from, from + len).normalize('NFC').toLowerCase().replace(/\s/g, '-');
  let out = '';
  let i = 0;
  for (let at = text.indexOf('@'); at >= 0; at = text.indexOf('@', i)) {
    const prev = text[at - 1];
    const free = prev === undefined || !(wordy(prev) || '<@/.:\\'.includes(prev));
    const hit = free ? handles.find(([, h]) => typed(at + 1, h.length) === h && !wordy(text[at + 1 + h.length])) : undefined;
    out += text.slice(i, at) + (hit ? `<@${hit[0]}>` : '@');
    i = at + 1 + (hit ? hit[1].length : 0);
  }
  return out + text.slice(i);
}


/** Player notes / backstory (public on the profile). */
export const BIO_MAX = 1500;

/** Trim, drop control chars (keeps newlines/tabs), collapse 3+ blank lines. null = invalid. '' = clear. */
export function cleanBio(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const bio = raw
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f​-‏‪-‮⁦-⁩]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return bio.length > BIO_MAX ? null : bio;
}

export const ROOM_MAX_ITEMS = 60;
const ROOM_ID = /^[a-z0-9-]{1,40}$/;

/** Validate a room layout from the website (shape only — the catalog lives in the web bundle). null = invalid. */
export function cleanRoom(raw: unknown): CharRoom | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.template !== 'string' || !ROOM_ID.test(r.template) || !Array.isArray(r.items) || r.items.length > ROOM_MAX_ITEMS) return null;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= -1 && v <= 2 ? Math.round(v * 1e5) / 1e5 : null);
  const items: RoomItem[] = [];
  for (const it of r.items) {
    if (!it || typeof it !== 'object') return null;
    const o = it as Record<string, unknown>;
    const x = num(o.x), y = num(o.y);
    if (typeof o.id !== 'string' || !ROOM_ID.test(o.id) || x === null || y === null) return null;
    items.push({ id: o.id, x, y, ...(o.flip === true && { flip: true }), ...(o.front === true && { front: true }) });
  }
  return { template: r.template, items, at: Date.now() };
}

const placedCounts = (room?: CharRoom | null) => {
  const n = new Map<string, number>();
  for (const it of room?.items ?? []) n.set(it.id, (n.get(it.id) ?? 0) + 1);
  return n;
};

/**
 * Swap the room layout. Furniture is an item: placing a piece takes it out of the inventory, taking it down
 * (or `null` = reset) puts it back — so placed pieces can't be sold or traded, and spare ones can.
 * Returns an error text when the player doesn't own enough of something (nothing is changed then).
 */
export function applyRoom(char: Character, room: CharRoom | null): string | null {
  const before = placedCounts(char.room), after = placedCounts(room);
  for (const [id, n] of after) {
    const need = n - (before.get(id) ?? 0);
    if (need <= 0) continue;
    const item = FURNITURE_ITEM[id];
    if (!item) return 'มีของตกแต่งที่ไม่รู้จักอยู่ในห้อง';
    if (itemCount(char, item) < need) return `${itemLabel(item)} ไม่พอ — ต้องมีอีก ${need - itemCount(char, item)} ชิ้น`;
  }
  for (const id of new Set([...before.keys(), ...after.keys()])) {
    const item = FURNITURE_ITEM[id];
    const back = (before.get(id) ?? 0) - (after.get(id) ?? 0);
    if (item && back) addItem(char, item, back);
  }
  if (room) char.room = room;
  else delete char.room;
  return null;
}

/** Spare furniture in the inventory, by room catalog id (what the room editor may still place). */
export function spareFurniture(char: Character): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, item] of Object.entries(FURNITURE_ITEM)) if (itemCount(char, item) > 0) out[id] = itemCount(char, item);
  return out;
}

/**
 * Opaque public id for a character's profile page (never the Discord id).
 * HMAC of the user id with PROFILE_SECRET (else API_SECRET). Without either, a per-process random
 * key is used, so slugs only stay stable while that process runs (fine for the local standalone API).
 */
let slugKey: string | undefined;
export function profileSlug(userId: string): string {
  slugKey ??= process.env.PROFILE_SECRET || process.env.API_SECRET || randomBytes(32).toString('hex');
  return createHmac('sha256', slugKey).update(`profile:${userId}`).digest('hex').slice(0, 16);
}
export const isSlug = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-f]{16}$/.test(s);

/** Public URL for a stored image key (env IMAGE_BASE_URL = the website's R2_PUBLIC_URL). */
export function imageUrl(key: string, base = process.env.IMAGE_BASE_URL): string | undefined {
  return base ? `${base.replace(/\/$/, '')}/${key}` : undefined;
}

/** Best uploaded image for a slot preference order (newest first within a slot). */
export function pickImage(char: Character, order: ImageSlot[]): CharImage | undefined {
  for (const slot of order) {
    const hit = (char.images ?? []).filter((i) => i.slot === slot).sort((a, b) => b.at - a.at)[0];
    if (hit) return hit;
  }
  return undefined;
}

export type ImageResult = { ok: true; evicted: string[] } | { ok: false; error: string };

/** Attach an uploaded image. Single-image slots replace (old key returned in `evicted`). */
export function attachImage(char: Character, slot: ImageSlot, key: string, now = Date.now()): ImageResult {
  if (!isOwnKey(char.userId, slot, key)) return { ok: false, error: 'bad key' };
  const images = (char.images ??= []);
  if (images.some((i) => i.key === key)) return { ok: true, evicted: [] };
  const inSlot = images.filter((i) => i.slot === slot);
  const def = IMAGE_SLOTS[slot];
  let evicted: string[] = [];
  if (inSlot.length >= def.max) {
    if (def.max > 1) return { ok: false, error: `${def.name} เต็มแล้ว (สูงสุด ${def.max} รูป)` };
    evicted = inSlot.map((i) => i.key);
    char.images = images.filter((i) => i.slot !== slot);
  }
  char.images.push({ slot, key, at: now });
  return { ok: true, evicted };
}

export function detachImage(char: Character, key: string): boolean {
  const before = char.images?.length ?? 0;
  char.images = (char.images ?? []).filter((i) => i.key !== key);
  return char.images.length < before;
}

// ---------- sprite (paper doll from PSD) ----------

export const SPRITE_MAX_PARTS = 40;
export const SPRITE_MAX_EDGE = 4096;

export const HEIGHT_RANGE = [50, 300] as const;
export const cleanHeight = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v >= HEIGHT_RANGE[0] && v <= HEIGHT_RANGE[1] ? Math.round(v) : undefined;

export const spriteKeys = (s: CharSprite | undefined): string[] => (s ? s.parts.map((p) => `${s.base}/${p.id}.${p.ext}`) : []);

/** Validate + copy a sprite manifest from the website (whitelisted fields only). */
export function cleanSprite(userId: string, raw: unknown, now = Date.now()): CharSprite | string {
  if (!raw || typeof raw !== 'object') return 'bad sprite';
  const r = raw as Record<string, unknown>;
  const int = (v: unknown, lo: number, hi: number) => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
  const mid = mediaId(userId);
  if (!mid || typeof r.base !== 'string' || !new RegExp(`^sprites/${mid}/[a-z0-9]{12,32}$`).test(r.base)) return 'bad base';
  if (!int(r.width, 1, SPRITE_MAX_EDGE) || !int(r.height, 1, SPRITE_MAX_EDGE)) return 'bad size';
  const W = r.width as number, H = r.height as number;
  if (!Array.isArray(r.parts) || r.parts.length < 1 || r.parts.length > SPRITE_MAX_PARTS) return 'bad parts';
  const seen = new Set<string>();
  const parts: SpritePart[] = [];
  for (const p of r.parts as Record<string, unknown>[]) {
    if (typeof p?.id !== 'string' || !/^[a-z0-9_]{1,40}$/.test(p.id) || seen.has(p.id)) return 'bad part id';
    if (!int(p.w, 1, W) || !int(p.h, 1, H) || !int(p.x, 0, W - 1) || !int(p.y, 0, H - 1) || !int(p.z, 0, 999)) return `bad part ${p.id}`;
    if (p.ext !== 'webp' && p.ext !== 'png') return `bad ext ${p.id}`;
    const pt = (v: unknown): [number, number] | undefined =>
      Array.isArray(v) && v.length === 2 && int(v[0], 0, W) && int(v[1], 0, H) ? [v[0] as number, v[1] as number] : undefined;
    seen.add(p.id);
    const part: SpritePart = { id: p.id, x: p.x as number, y: p.y as number, w: p.w as number, h: p.h as number, z: p.z as number, ext: p.ext };
    const top = pt(p.top), bot = pt(p.bot);
    if (top) part.top = top;
    if (bot) part.bot = bot;
    if (p.id === 'weapon' && (p.hand === 'l' || p.hand === 'r')) part.hand = p.hand;
    parts.push(part);
  }
  const sprite: CharSprite = { base: r.base, width: W, height: H, parts, at: now };
  const heightCm = cleanHeight(r.heightCm);
  if (heightCm) sprite.heightCm = heightCm;
  return sprite;
}

/** What the website may see about a player's own character (no Discord ids). */
export function accountView(char: Character) {
  return {
    name: char.name,
    role: char.role,
    icon: char.icon,
    level: char.level,
    fiend: char.fiend,
    createdAt: char.createdAt,
    status: {
      xp: char.xp,
      xpNext: balance.xpForLevel(char.level),
      hp: char.hp,
      maxHp: char.maxHp,
      stamina: char.stamina,
      maxStamina: char.maxStamina,
      humanity: char.humanity,
      sanity: char.sanity,
      flesh: char.flesh,
      stats: { ...char.stats },
      where: char.traveling ? `🧭 ${travelVerb(char.traveling.to)} ${getZone(char.traveling.to)?.name ?? char.traveling.to}` : zoneLabel(currentZone(char)),
    },
    renameAt: char.cooldowns.rename ?? 0,
    bio: char.bio ?? '',
    slug: profileSlug(char.userId),
    images: (char.images ?? []).map(({ slot, key, at }: CharImage) => ({ slot, key, at })),
    sprite: char.sprite ?? null,
    room: char.room ?? null,
    furniture: spareFurniture(char),
  };
}
export type AccountView = ReturnType<typeof accountView>;
