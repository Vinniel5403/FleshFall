// Shapes returned by the bot's web API (src/web/api.ts at the repo root).

export type Tier = "easy" | "normal" | "hard" | "epic";

export interface TierInfo {
  name: string;
  emoji: string;
  rec: number;
}

export interface Status {
  crimsonMoon: boolean;
  nextCrimsonMoon: number;
  players: number;
  exploring: number;
  fiends: number;
  cities: number;
}

export interface City {
  id: string;
  name: string;
  emoji: string;
  tier: Tier;
  desc: string;
}

export interface Continent {
  id: string;
  name: string;
  emoji: string;
  icon: string;
  door: string;
  shop: string[];
  cities: City[];
}

export interface World {
  tiers: Record<Tier, TierInfo>;
  doors: Record<string, { name: string; emoji: string; rule: { note: string } | null }>;
  continents: Continent[];
}

export interface Icon {
  id: string;
  name: string;
  title: string;
  emoji: string;
  door: string;
  doorName: string;
  concept: string;
  blessing: string;
  repercussion: string;
}

export interface Role {
  id: string;
  name: string;
  emoji: string;
  short: string;
  perks: string[];
  stats: { str: number; agi: number; int: number };
  maxHp: number;
  maxStamina: number;
}

export interface Item {
  id: string;
  name: string;
  emoji: string;
  type: "consumable" | "weapon" | "armor" | "material" | "vintage";
  value: number;
  description: string;
}

export interface Monster {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  hp: number;
  ac: number;
  dmg: [number, number];
  xp: number;
  minLevel?: number;
}

export interface Player {
  name: string;
  role: string;
  icon: string;
  level: number;
  fiend: boolean;
  zone: string;
  dungeonsCleared: number;
  deaths: number;
}

export interface HuntView {
  id: string;
  ended: "won" | "died" | "fled" | null;
  zone: { id: string; name: string; emoji: string; tier: Tier; tierInfo: TierInfo } | null;
  hero: { name: string; level: number; hp: number; maxHp: number; sanity: number };
  monsters: { id: string; name: string; emoji: string; hp: number; maxHp: number }[];
  door: { name: string; emoji: string } | null;
  loot: { id: string; name: string; emoji: string; n: number }[];
  xp: number;
  lines: string[];
}

export type ApiError = { error: string };
