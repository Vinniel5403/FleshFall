/**
 * Web API: read-only views of the game world. Discord-free; never writes to the player store.
 */
import { IMAGE_SLOTS, pickImage, profileSlug, publicMedia } from '../game/account.js';
import { balance } from '../config.js';
import { MONSTERS } from '../game/hunt.js';
import { ICONS } from '../game/icons.js';
import { ITEMS } from '../game/items.js';
import { ROLES } from '../game/roles.js';
import type { Character } from '../game/types.js';
import { DOORS, DUNGEON_RULES, isCrimsonMoon, LOCATIONS, nextCrimsonMoon } from '../game/world.js';
import { CONTINENTS, citiesByContinent, currentZone, getZone, mapCities, TIERS, zoneLabel } from '../game/zones.js';
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
export const imageSlots = () => Object.values(IMAGE_SLOTS);

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


/** Where a character is, as display text (same wording as the website dossier). */
const whereText = (c: Character) =>
  c.traveling ? `🧭 กำลังเดินทางไป ${getZone(c.traveling.to)?.name ?? c.traveling.to}` : zoneLabel(currentZone(c));

/** Public portrait — never a legacy key (those carry the Discord id in the path). */
const portraitKey = (c: Character) => pickImage({ ...c, images: publicMedia(c).images }, ['portrait', 'art', 'gallery'])?.key ?? null;

/** Character name search for the players page. Empty query = newest characters. Max 30. */
export function searchCharacters(src: PlayerSource, q: string) {
  const needle = q.normalize('NFC').trim().toLowerCase().slice(0, 40);
  const list = realPlayers(src)
    .filter((c) => !needle || c.name.toLowerCase().includes(needle))
    .sort((a, b) => {
      if (needle) {
        const pa = a.name.toLowerCase().startsWith(needle) ? 0 : 1;
        const pb = b.name.toLowerCase().startsWith(needle) ? 0 : 1;
        if (pa !== pb) return pa - pb;
      }
      return b.createdAt - a.createdAt;
    })
    .slice(0, 30);
  return list.map((c) => ({ slug: profileSlug(c.userId), name: c.name, role: c.role, icon: c.icon, level: c.level, fiend: c.fiend, portrait: portraitKey(c) }));
}

/** Full public profile by opaque slug (players chose "everything public"; still no Discord id). */
export function characterProfile(src: PlayerSource, slug: string) {
  const c = realPlayers(src).find((x) => profileSlug(x.userId) === slug);
  if (!c) return null;
  const item = (id: string) => ({ id, name: ITEMS[id]?.name ?? id, emoji: ITEMS[id]?.emoji ?? '❔' });
  return {
    slug,
    name: c.name,
    role: c.role,
    icon: c.icon,
    level: c.level,
    fiend: c.fiend,
    createdAt: c.createdAt,
    bio: c.bio ?? '',
    status: {
      xp: c.xp,
      xpNext: balance.xpForLevel(c.level),
      hp: c.hp,
      maxHp: c.maxHp,
      stamina: c.stamina,
      maxStamina: c.maxStamina,
      humanity: c.humanity,
      sanity: c.sanity,
      flesh: c.flesh,
      stats: { ...c.stats },
      where: whereText(c),
    },
    equipped: {
      weapon: c.equipped.weapon ? { ...item(c.equipped.weapon), level: c.gearLevels?.[c.equipped.weapon] ?? 0 } : null,
      armor: c.equipped.armor ? { ...item(c.equipped.armor), level: c.gearLevels?.[c.equipped.armor] ?? 0 } : null,
    },
    inventory: Object.entries(c.inventory)
      .filter(([, n]) => n > 0)
      .map(([id, qty]) => ({ ...item(id), qty })),
    blessings: Object.entries(c.blessings ?? {})
      .filter(([, n]) => (n ?? 0) > 0)
      .map(([id, tier]) => ({ icon: id, name: ICONS[id as keyof typeof ICONS]?.name ?? id, tier: tier ?? 0 })),
    mutations: [...c.mutations],
    record: { deaths: c.deaths, breakdowns: c.breakdowns, eventsCompleted: c.eventsCompleted, dungeonsCleared: c.dungeonsCleared },
    images: publicMedia(c).images.map(({ slot, key, at }) => ({ slot, key, at })),
    sprite: publicMedia(c).sprite,
  };
}
export type CharacterProfile = NonNullable<ReturnType<typeof characterProfile>>;
