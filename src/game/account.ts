/**
 * Web account rules: character creation from the website + character images.
 * Pure + Discord-free. Image bytes live in object storage (R2); the character only stores keys.
 */
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

/** Object key for a new upload. Keys are never reused, so CDN caching can be immutable. */
export function imageKey(userId: string, slot: ImageSlot, ext: ImageExt, rand: string): string {
  return `chars/${userId}/${slot}-${rand}.${ext}`;
}

/** Only keys we minted for this user may be attached to their character. */
export function isOwnKey(userId: string, slot: ImageSlot, key: string): boolean {
  const re = new RegExp(`^chars/${userId}/${slot}-[a-z0-9]{12,32}\\.(${IMAGE_EXT.join('|')})$`);
  return re.test(key);
}

/** Letters/marks/digits (incl. Thai) + space . _ ' - only: no mentions, markdown or control chars. */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 32) return null;
  return /^[\p{L}\p{M}\p{N} ._'-]+$/u.test(name) ? name : null;
}

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
  if (typeof r.base !== 'string' || !new RegExp(`^sprites/${userId}/[a-z0-9]{12,32}$`).test(r.base)) return 'bad base';
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
    images: (char.images ?? []).map(({ slot, key, at }: CharImage) => ({ slot, key, at })),
    sprite: char.sprite ?? null,
  };
}
export type AccountView = ReturnType<typeof accountView>;
