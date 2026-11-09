import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name} (see .env.example)`);
  return v;
}

export const config = {
  token: () => required('DISCORD_TOKEN'),
  clientId: () => required('CLIENT_ID'),
  guildId: process.env.GUILD_ID || undefined,
  dataFile: process.env.DATA_FILE || 'data/db.json',
};

export const balance = {
  exploreStaminaCost: 2,
  staminaRegenMs: 5 * 60_000, // +1 stamina every 5 min
  eventTimeoutMs: 2 * 60_000, // choice buttons expire after 2 min
  restCooldownMs: 30 * 60_000,
  /** Travel time between zones. Override with env TRAVEL_MINUTES (e.g. 1 for testing). */
  travelMs: Number(process.env.TRAVEL_MINUTES ?? 30) * 60_000,
  huntStaminaCost: 2,
  /** Chance a hunt reveals a dungeon door after victory. */
  huntDoorChance: 0.2,
  /** Chance a dungeon is an Icon dungeon (shrine at the end): continent's main color / elsewhere. */
  iconDungeonHome: 0.05,
  iconDungeonAway: 0.01,
  deathGoldLossPct: 0.25,
  xpForLevel: (level: number) => 50 + (level - 1) * 35,
};
