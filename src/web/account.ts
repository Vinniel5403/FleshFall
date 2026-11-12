/**
 * Private account endpoints, called server-to-server by the website (Vercel) with API_SECRET.
 * The website verifies the Discord login; the bot owns the character store and the guild.
 * Every handler keeps load → mutate → save synchronous (no await in between).
 */
import { accountView, attachImage, cleanHeight, cleanName, cleanSprite, detachImage, isSlot, spriteKeys } from '../game/account.js';
import { createCharacter, loadCharacter, saveCharacter } from '../game/character.js';
import { ICONS } from '../game/icons.js';
import { ROLES } from '../game/roles.js';
import type { IconId, RoleId } from '../game/types.js';

/** Discord side, injected by index.ts so this file stays Discord-free. */
export interface GuildGate {
  guildId: string;
  /** Add the user to the guild with their OAuth token (scope guilds.join). */
  join(userId: string, accessToken: string, nick: string): Promise<void>;
  isMember(userId: string): Promise<boolean>;
}

type Reply = { code: number; body: unknown };
const ok = (body: unknown): Reply => ({ code: 200, body });
const fail = (code: number, error: string): Reply => ({ code, body: { error } });

async function joinSafe(gate: GuildGate, userId: string, token: unknown, nick: string): Promise<boolean> {
  if (typeof token !== 'string' || !token) return gate.isMember(userId);
  try {
    await gate.join(userId, token, nick);
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
  const inGuild = await joinSafe(gate, userId, b.accessToken, name);
  return ok({ character: accountView(char), inGuild, guildId: gate.guildId, evicted });
}

/** Retry the guild join (first attempt failed, or the player left the server). */
export async function joinGuild(gate: GuildGate, userId: string, b: Record<string, unknown>): Promise<Reply> {
  const char = loadCharacter(userId);
  if (!char) return fail(404, 'ยังไม่มีตัวละคร');
  const inGuild = await joinSafe(gate, userId, b.accessToken, char.name);
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
