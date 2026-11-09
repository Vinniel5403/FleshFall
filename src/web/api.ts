/**
 * Web API: read-only views of the game world. Discord-free; never writes to the player store.
 */
import { MONSTERS } from '../game/hunt.js';
import { ICONS } from '../game/icons.js';
import { ITEMS } from '../game/items.js';
import { ROLES } from '../game/roles.js';
import type { Character } from '../game/types.js';
import { DOORS, DUNGEON_RULES, isCrimsonMoon, LOCATIONS, nextCrimsonMoon } from '../game/world.js';
import { CONTINENTS, citiesByContinent, getZone, mapCities, TIERS } from '../game/zones.js';
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

