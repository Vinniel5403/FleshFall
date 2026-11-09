/**
 * Web API: read-only views of the game world + a sandboxed demo hunt.
 * Discord-free; never writes to the player store.
 */
import { randomUUID } from 'node:crypto';
import { newCharacter } from '../game/character.js';
import { attack, flee, getMonster, MONSTERS, startHunt } from '../game/hunt.js';
import { ICONS } from '../game/icons.js';
import { ITEMS } from '../game/items.js';
import { ROLES } from '../game/roles.js';
import type { Character, IconId, RoleId } from '../game/types.js';
import { DOORS, DUNGEON_RULES, isCrimsonMoon, LOCATIONS, nextCrimsonMoon } from '../game/world.js';
import { CONTINENTS, citiesByContinent, getZone, mapCities, TIERS, zoneTier } from '../game/zones.js';
import { CONTINENT_STOCK } from '../commands/actions.js';

export type PlayerSource = () => Character[];

/** Real players only (Discord ids are numeric). No Discord ids leave the server. */
const realPlayers = (src: PlayerSource) => src().filter((c) => /^\d+$/.test(c.userId));

export function status(src: PlayerSource) {
  const players = realPlayers(src);
  return {
    crimsonMoon: isCrimsonMoon(),
    nextCrimsonMoon: nextCrimsonMoon(),
    players: players.length,
    exploring: players.filter((c) => c.location === 'old_realm' && !c.fiend).length,
    fiends: players.filter((c) => c.fiend).length,
    cities: mapCities().length,
  };
}

export function world() {
  return {
    locations: LOCATIONS,
    tiers: TIERS,
    doors: Object.fromEntries(
      Object.entries(DOORS).map(([k, d]) => [k, { ...d, rule: DUNGEON_RULES[k as keyof typeof DUNGEON_RULES] ?? null }]),
    ),
    continents: citiesByContinent().map(([c, zs]) => ({
      id: c,
      ...CONTINENTS[c],
      shop: CONTINENT_STOCK[c],
      cities: zs.map((z) => ({ id: z.id, name: z.name, emoji: z.emoji, tier: z.tier, desc: z.desc.split('\n')[0] })),
    })),
  };
}

export const icons = () => Object.values(ICONS).map(({ mods: _m, ...rest }) => rest);
export const roles = () => Object.values(ROLES).map(({ id, name, emoji, short, perks, stats, maxHp, maxStamina }) => ({ id, name, emoji, short, perks, stats, maxHp, maxStamina }));
export const items = () => Object.values(ITEMS);
export const bestiary = () => Object.values(MONSTERS);

export function leaderboard(src: PlayerSource) {
  return realPlayers(src)
    .sort((a, b) => b.level - a.level || b.xp - a.xp)
    .slice(0, 20)
    .map((c) => ({
      name: c.name,
      role: c.role,
      icon: c.icon,
      level: c.level,
      fiend: c.fiend,
      zone: c.traveling ? 'traveling' : c.location === 'old_realm' ? (getZone(c.zone)?.name ?? 'Old Realm') : LOCATIONS[c.location].name,
      dungeonsCleared: c.dungeonsCleared,
      deaths: c.deaths,
    }));
}

// ---------- demo hunt (in-memory sandbox, never saved) ----------

interface Session {
  char: Character;
  touched: number;
}
const sessions = new Map<string, Session>();
const SESSION_TTL = 15 * 60_000;
const MAX_SESSIONS = 500;

function sweep(now = Date.now()) {
  for (const [id, s] of sessions) if (now - s.touched > SESSION_TTL) sessions.delete(id);
}

function view(id: string, char: Character, lines: string[], ended?: string) {
  const h = char.hunt;
  const zone = getZone(h?.zone ?? char.zone);
  return {
    id,
    ended: ended ?? null,
    zone: zone ? { id: zone.id, name: zone.name, emoji: zone.emoji, tier: zone.tier, tierInfo: zoneTier(zone) } : null,
    hero: { name: char.name, role: char.role, icon: char.icon, level: char.level, hp: char.hp, maxHp: char.maxHp, sanity: char.sanity, stamina: char.stamina },
    monsters: (h?.monsters ?? []).map((m) => {
      const d = getMonster(m.id);
      return { id: m.id, name: d?.name ?? m.id, emoji: d?.emoji ?? '?', hp: m.hp, maxHp: m.maxHp };
    }),
    door: h?.won && h.door ? DOORS[h.door] : null,
    loot: Object.entries(h?.loot ?? {}).map(([id, n]) => ({ id, name: ITEMS[id]?.name ?? id, emoji: ITEMS[id]?.emoji ?? '', n })),
    xp: h?.xp ?? 0,
    lines,
  };
}

export function demoStart(body: { role?: string; icon?: string; zone?: string; level?: number }) {
  sweep();
  if (sessions.size >= MAX_SESSIONS) return { error: 'เซิร์ฟเวอร์เต็ม ลองใหม่อีกครั้ง' };
  const role = (body.role && body.role in ROLES ? body.role : 'outsider') as RoleId;
  const icon = (body.icon && body.icon in ICONS ? body.icon : 'loki') as IconId;
  const zone = getZone(body.zone);
  if (!zone?.channel) return { error: 'ไม่มีเมืองนี้' };
  const level = Math.max(1, Math.min(20, Math.floor(Number(body.level) || 1)));
  const id = randomUUID();
  const char = newCharacter(`web-${id}`, 'ผู้หลงมิติ', role, icon);
  char.location = 'old_realm';
  char.zone = zone.id;
  char.level = level;
  char.maxHp += (level - 1) * 4;
  char.hp = char.maxHp;
  char.stamina = char.maxStamina;
  const r = startHunt(char);
  if (!r.ok) return { error: r.error };
  sessions.set(id, { char, touched: Date.now() });
  return view(id, char, r.hunt.log);
}

export function demoAct(body: { id?: string; action?: string; target?: number }) {
  const s = body.id ? sessions.get(body.id) : undefined;
  if (!s) return { error: 'เซสชันหมดอายุ — เริ่มล่าใหม่' };
  s.touched = Date.now();
  const char = s.char;
  if (!char.hunt || char.hunt.won) return view(body.id!, char, ['การล่าจบแล้ว'], 'won');
  const r = body.action === 'flee' ? flee(char) : attack(char, Number(body.target) || 0);
  if (r.ended && r.ended !== 'won') sessions.delete(body.id!);
  return view(body.id!, char, r.lines, r.ended);
}
