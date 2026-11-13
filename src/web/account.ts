/**
 * Private account endpoints, called server-to-server by the website (Vercel) with API_SECRET.
 * The website verifies the Discord login; the bot owns the character store and the guild.
 * Every handler keeps load → mutate → save synchronous (no await in between).
 */
import { accountView, attachImage, BIO_MAX, cleanBio, cleanHeight, cleanName, cleanSprite, detachImage, isSlot, legacyMedia, mediaId, renameMedia, spriteKeys } from '../game/account.js';
import { db } from '../db/index.js';
import { createCharacter, loadCharacter, saveCharacter } from '../game/character.js';
import { ICONS } from '../game/icons.js';
import { ROLES } from '../game/roles.js';
import type { IconId, RoleId } from '../game/types.js';

/** Discord side, injected by index.ts so this file stays Discord-free. */
export interface GuildGate {
  guildId: string;
  /** Add the user to the guild with their OAuth token (scope guilds.join). */
  join(userId: string, accessToken: string): Promise<void>;
  isMember(userId: string): Promise<boolean>;
}

/** Website renames: one per hour. */
export const RENAME_COOLDOWN_MS = 60 * 60_000;

type Reply = { code: number; body: unknown };
const ok = (body: unknown): Reply => ({ code: 200, body });
const fail = (code: number, error: string): Reply => ({ code, body: { error } });

async function joinSafe(gate: GuildGate, userId: string, token: unknown): Promise<boolean> {
  if (typeof token !== 'string' || !token) return gate.isMember(userId);
  try {
    await gate.join(userId, token);
    return true;
  } catch (e) {
    console.warn('guild join failed', (e as Error).message);
    return gate.isMember(userId).catch(() => false);
  }
}

export async function getAccount(gate: GuildGate, userId: string): Promise<Reply> {
  const char = loadCharacter(userId);
  const inGuild = await gate.isMember(userId).catch(() => false);
  return ok({ character: char ? accountView(char) : null, inGuild, guildId: gate.guildId });
}

/** Create the character (one per Discord account; a Fiend may start over), then join the guild. */
export async function createAccount(gate: GuildGate, userId: string, b: Record<string, unknown>): Promise<Reply> {
  const name = cleanName(b.name);
  if (!name) return fail(400, 'ชื่อต้องยาว 2–32 ตัว ใช้ได้แค่ตัวอักษร ตัวเลข เว้นวรรค . _ \' -');
  if (typeof b.role !== 'string' || !(b.role in ROLES)) return fail(400, 'bad role');
  if (typeof b.icon !== 'string' || !(b.icon in ICONS)) return fail(400, 'bad icon');

  const existing = loadCharacter(userId);
  if (existing && !existing.fiend) return fail(409, 'บัญชีนี้มีตัวละครอยู่แล้ว');
  const evicted = [...(existing?.images ?? []).map((i) => i.key), ...spriteKeys(existing?.sprite)];
  const char = createCharacter(userId, name, b.role as RoleId, b.icon as IconId);
  // saved — now it's safe to await
  const inGuild = await joinSafe(gate, userId, b.accessToken);
  return ok({ character: accountView(char), inGuild, guildId: gate.guildId, evicted });
}

/** Rename the character (website). Cooldown via cooldowns.rename (= next allowed time). */
export function renameAccount(userId: string, b: Record<string, unknown>): Reply {
  const name = cleanName(b.name);
  if (!name) return fail(400, 'ชื่อต้องยาว 2–32 ตัว ใช้ได้แค่ตัวอักษร ตัวเลข เว้นวรรค . _ \' -');
  const char = loadCharacter(userId);
  if (!char) return fail(404, 'ยังไม่มีตัวละคร');
  if (char.name === name) return ok({ character: accountView(char) });
  const now = Date.now();
  const next = char.cooldowns.rename ?? 0;
  if (next > now) return fail(429, `เปลี่ยนชื่อได้อีกครั้งใน ${Math.ceil((next - now) / 60_000)} นาที`);
  char.name = name;
  char.cooldowns.rename = now + RENAME_COOLDOWN_MS;
  saveCharacter(char);
  return ok({ character: accountView(char) });
}

// ---------- one-off media migration (web/scripts/migrate-media.ts) ----------

/** Every character still storing uploads under a Discord-id path, with its new media folder. */
export function listLegacyMedia(): Reply {
  const users = db
    .allCharacters()
    .map((c) => ({ userId: c.userId, mediaId: mediaId(c.userId), ...legacyMedia(c) }))
    .filter((u) => u.images.length || u.sprite);
  return ok({ users });
}

/** After the objects were copied: point the character at the new keys. */
export function applyMediaRename(userId: string, b: Record<string, unknown>): Reply {
  const char = loadCharacter(userId);
  if (!char) return fail(404, 'no character');
  const map = b.map && typeof b.map === 'object' ? (b.map as Record<string, string>) : null;
  if (!map) return fail(400, 'bad map');
  const err = renameMedia(char, map);
  if (err) return fail(400, err);
  saveCharacter(char);
  return ok({ character: accountView(char) });
}

/** Set the character's public notes / backstory ('' clears it). */
export function setBio(userId: string, b: Record<string, unknown>): Reply {
  const bio = cleanBio(b.bio);
  if (bio === null) return fail(400, `โน้ตยาวได้ไม่เกิน ${BIO_MAX} ตัวอักษร`);
  const char = loadCharacter(userId);
  if (!char) return fail(404, 'ยังไม่มีตัวละคร');
  if (bio) char.bio = bio;
  else delete char.bio;
  saveCharacter(char);
  return ok({ character: accountView(char) });
}

/** Retry the guild join (first attempt failed, or the player left the server). */
export async function joinGuild(gate: GuildGate, userId: string, b: Record<string, unknown>): Promise<Reply> {
  const char = loadCharacter(userId);
  if (!char) return fail(404, 'ยังไม่มีตัวละคร');
  const inGuild = await joinSafe(gate, userId, b.accessToken);
  return ok({ inGuild, guildId: gate.guildId });
}

export function addImage(userId: string, b: Record<string, unknown>): Reply {
  if (!isSlot(b.slot) || typeof b.key !== 'string') return fail(400, 'bad image');
  const char = loadCharacter(userId);
  if (!char) return fail(404, 'ยังไม่มีตัวละคร');
  const r = attachImage(char, b.slot, b.key);
  if (!r.ok) return fail(400, r.error);
  saveCharacter(char);
  return ok({ character: accountView(char), evicted: r.evicted });
}

export function removeImage(userId: string, b: Record<string, unknown>): Reply {
  if (typeof b.key !== 'string') return fail(400, 'bad key');
  const char = loadCharacter(userId);
  if (!char) return fail(404, 'ยังไม่มีตัวละคร');
  const removed = detachImage(char, b.key);
  if (removed) saveCharacter(char);
  return ok({ character: accountView(char), removed });
}

/** Replace the character's sprite; returns the old sprite's object keys for deletion. */
export function setSprite(userId: string, b: Record<string, unknown>): Reply {
  const sprite = cleanSprite(userId, b.sprite);
  if (typeof sprite === 'string') return fail(400, sprite);
  const char = loadCharacter(userId);
  if (!char) return fail(404, 'ยังไม่มีตัวละคร');
  const evicted = spriteKeys(char.sprite);
  char.sprite = sprite;
  saveCharacter(char);
  return ok({ character: accountView(char), evicted });
}

export function setSpriteHeight(userId: string, b: Record<string, unknown>): Reply {
  const heightCm = cleanHeight(b.heightCm);
  if (!heightCm) return fail(400, 'ส่วนสูงไม่ถูกต้อง');
  const char = loadCharacter(userId);
  if (!char?.sprite) return fail(404, 'ยังไม่มีสไปรต์');
  char.sprite.heightCm = heightCm;
  saveCharacter(char);
  return ok({ character: accountView(char) });
}

export function clearSprite(userId: string): Reply {
  const char = loadCharacter(userId);
  if (!char) return fail(404, 'ยังไม่มีตัวละคร');
  const evicted = spriteKeys(char.sprite);
  delete char.sprite;
  saveCharacter(char);
  return ok({ character: accountView(char), evicted });
}
