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
  dataFile: process.env.DATA_FILE || 'data/db.sqlite',
};

export const balance = {
  exploreStaminaCost: 2,
  staminaRegenMs: 5 * 60_000, // +1 stamina every 5 min
  eventTimeoutMs: 2 * 60_000, // choice buttons expire after 2 min
  restCooldownMs: 30 * 60_000,
  /** Travel time between zones. Override with env TRAVEL_MINUTES (e.g. 1 for testing). */
  travelMs: Number(process.env.TRAVEL_MINUTES ?? 30) * 60_000,
  huntStaminaCost: 2,
  /** Monsters are the city's level. Per level above 1 they gain this share of their base hp / damage / xp, and drop this much more meat & supplies. */
  huntHpPerLevel: 0.2,
  huntDmgPerLevel: 0.15,
  huntXpPerLevel: 0.25,
  huntLootPerLevel: 0.15,
  /** Monster hits: sanity / Miasma per hit is multiplied by this (min 1). Was 1 — playtesters found sanity draining too fast. */
  huntSanityMult: 0.5,
  /** Passive sanity regen per stamina tick (5 min) while safe in Rouge Land. */
  homeSanityRegen: 1,
  /** Chance a hunt reveals a dungeon door after victory. */
  huntDoorChance: 0.001,
  /** Chance one explore in the Old Realm turns up a door — any Icon colour or red, all equally likely (rolled apart from the other events). */
  exploreDoorChance: 0.001,
  /** Chance an explore (outside dungeons) turns up nothing — stamina spent, no event. Doors stay at `exploreDoorChance`, the rest are ordinary events (80/1/19 in the Old Realm). */
  exploreEmptyChance: 0.92,
  /** Chance a dungeon is an Icon dungeon (shrine at the end): continent's main color / elsewhere. */
  iconDungeonHome: 0.015,
  iconDungeonAway: 0.003,
  /** Chance the door's guardian (boss room) waits at the end of a dungeon; otherwise the last room is one more ordinary room. Was always. */
  dungeonBossChance: 0.2,
  /** Sigils offered at an Icon shrine to raise that Icon's blessing: this × the tier you already hold (the first blessing is free). */
  shrineSigilPerTier: 1,
  deathGoldLossPct: 0.25,
  /** Knocked out in an easy/normal city: wait this long for a friend's /wake, then wake up alone back home (trip lost). Env DOWNED_MINUTES. */
  downedMs: Number(process.env.DOWNED_MINUTES ?? 120) * 60_000,
  /** Fell in a hard/epic city: placenta-or-give-up choice auto-resolves to death after this. */
  dyingMs: 30 * 60_000,
  /** Outsiders (reachedRougeLand=false) may walk into Rouge Land on their own from this level; before that only red door → Cypress → ferryman. */
  rougeLandUnlockLevel: 10,
  xpForLevel: (level: number) => 50 + (level - 1) * 35,
};
