/**
 * Web account rules: character creation from the website + character images.
 * Pure + Discord-free. Image bytes live in object storage (R2); the character only stores keys.
 */
import type { CharImage, Character, ImageSlot } from './types.js';

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

/** What the website may see about a player's own character (no Discord ids). */
export function accountView(char: Character) {
  return {
    name: char.name,
    role: char.role,
    icon: char.icon,
    level: char.level,
    fiend: char.fiend,
    createdAt: char.createdAt,
    images: (char.images ?? []).map(({ slot, key, at }: CharImage) => ({ slot, key, at })),
  };
}
export type AccountView = ReturnType<typeof accountView>;
