/**
 * Location roles: each zone with a channel gets a role ("📍 Paris").
 * A member holds exactly the role of the zone they stand in (none while traveling / Fiend),
 * so zone channels can be hidden from everyone else.
 *
 * A background tick resolves finished travel and syncs roles; interactions also trigger a sync.
 */
import type { Client, Guild } from 'discord.js';
import { config } from './config.js';
import { db } from './db/index.js';
import { loadCharacter, saveCharacter } from './game/character.js';
import type { Character, ZoneId } from './game/types.js';
import { currentZone, ZONES, type ZoneDef } from './game/zones.js';

const roleIds = new Map<ZoneId, string>();
let guild: Guild | null = null;

export const zoneRoleName = (z: ZoneDef) => `📍 ${z.name}`;
/** Zones that have their own channel. */
export const roleZones = () => Object.values(ZONES).filter((z) => z.channel);
export const zoneRoleId = (zone: ZoneId) => roleIds.get(zone);

/** Find or create one role per zone. Needs Manage Roles. */
export async function ensureZoneRoles(g: Guild): Promise<void> {
  const roles = await g.roles.fetch();
  for (const z of roleZones()) {
    const name = zoneRoleName(z);
    const role = roles.find((r) => r.name === name) ?? (await g.roles.create({ name, mentionable: false, hoist: false, reason: 'FleshFall location role' }));
    roleIds.set(z.id, role.id);
  }
}

function desiredZone(char: Character | undefined): ZoneId | null {
  if (!char || char.fiend || char.traveling) return null;
  const z = currentZone(char).id;
  return roleIds.has(z) ? z : null;
}

/** Give the member their current zone's role and strip the others. */
export async function syncMember(userId: string): Promise<void> {
  if (!guild || roleIds.size === 0) return;
  const char = loadCharacter(userId);
  const want = desiredZone(char);
  if (char && (char.roleZone ?? '') === (want ?? '')) return;
  const member = await guild.members.fetch(userId).catch(() => null);
  if (member) {
    const keep = want ? roleIds.get(want) : undefined;
    const remove = [...roleIds.values()].filter((r) => r !== keep && member.roles.cache.has(r));
    if (remove.length) await member.roles.remove(remove, 'FleshFall: left zone').catch((e) => console.warn('role remove failed', e.message));
    if (keep && !member.roles.cache.has(keep)) await member.roles.add(keep, 'FleshFall: entered zone').catch((e) => console.warn('role add failed', e.message));
  }
  // re-load after the awaits; only touch roleZone
  const fresh = loadCharacter(userId);
  if (fresh) {
    fresh.roleZone = want ?? '';
    saveCharacter(fresh);
  }
}

/** Members whose character was deleted (e.g. restarted after Fiend) still get cleaned on next sync call. */
async function tick(): Promise<void> {
  for (const c of db.allCharacters()) {
    const char = loadCharacter(c.userId); // resolves finished travel
    if (!char) continue;
    if ((char.roleZone ?? '') !== (desiredZone(char) ?? '')) await syncMember(char.userId);
  }
}

export async function startZoneSync(client: Client, everyMs = 15_000): Promise<void> {
  if (!config.guildId) {
    console.warn('GUILD_ID not set — location roles disabled');
    return;
  }
  try {
    guild = await client.guilds.fetch(config.guildId);
    await ensureZoneRoles(guild);
    const godName = process.env.GOD_ROLE ?? 'Dev';
    if (!guild.roles.cache.some((r) => r.name === godName)) {
      await guild.roles.create({ name: godName, color: 0xffd700, reason: 'FleshFall god mode' });
      console.log(`⚡ created role ${godName}`);
    }
    // console.log(`📍 location roles: ${[...roleIds.keys()].join(', ')}`);
  } catch (e) {
    console.warn('location roles disabled:', (e as Error).message);
    return;
  }
  const run = () => tick().catch((e) => console.warn('zone sync failed', e));
  await run();
  setInterval(run, everyMs);
}
