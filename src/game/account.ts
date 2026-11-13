/**
 * Web account rules: character creation from the website + character images.
 * Pure + Discord-free. Image bytes live in object storage (R2); the character only stores keys.
 */
import { createHmac, randomBytes } from 'node:crypto';
import type { CharImage, CharSprite, Character, ImageSlot, SpritePart } from './types.js';
import { currentZone, getZone, zoneLabel } from './zones.js';
import { balance } from '../config.js';

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
  return /^[\p{L}\p{M}\p{N} ._'-]+$/u.test(name) ? name : null;
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
      where: char.traveling ? `🧭 กำลังเดินทางไป ${getZone(char.traveling.to)?.name ?? char.traveling.to}` : zoneLabel(currentZone(char)),
    },
    renameAt: char.cooldowns.rename ?? 0,
    bio: char.bio ?? '',
    slug: profileSlug(char.userId),
    images: (char.images ?? []).map(({ slot, key, at }: CharImage) => ({ slot, key, at })),
    sprite: char.sprite ?? null,
  };
}
export type AccountView = ReturnType<typeof accountView>;
