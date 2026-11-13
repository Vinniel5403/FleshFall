// Shapes of the bundled game data (web/src/data/game.json, generated from src/web/api.ts).

export type Tier = "easy" | "normal" | "hard" | "epic";

export interface TierInfo {
  name: string;
  emoji: string;
  rec: number;
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




/** Character image slots (src/game/account.ts IMAGE_SLOTS). */
export type ImageSlot = "portrait" | "art" | "sheet" | "gallery";

export interface ImageSlotDef {
  id: ImageSlot;
  name: string;
  desc: string;
  max: number;
}

/** The logged-in player's own character (src/game/account.ts accountView). */
export interface AccountView {
  name: string;
  role: string;
  icon: string;
  level: number;
  fiend: boolean;
  createdAt: number;
  /** live numbers for the dossier (keep in sync with src/game/account.ts accountView) */
  status?: {
    xp: number;
    xpNext: number;
    hp: number;
    maxHp: number;
    stamina: number;
    maxStamina: number;
    humanity: number;
    sanity: number;
    flesh: number;
    stats: { str: number; agi: number; int: number };
    where: string;
  };
  /** next time a rename is allowed (ms epoch) */
  renameAt?: number;
  /** player notes / backstory (public), max BIO_MAX */
  bio?: string;
  /** opaque public profile id → /players/<slug> (never the Discord id) */
  slug?: string;
  images: { slot: ImageSlot; key: string; at: number; url?: string }[];
  /** paper-doll sprite from PSD; part file = `${url}/${id}.${ext}` */
  sprite: (import("./rig").Rig & { base: string; at: number; url?: string }) | null;
}

/** GET /api/me response (website route handler). */
export interface MeResponse {
  user: { username: string; avatar: string | null } | null;
  character: AccountView | null;
  inGuild: boolean;
  guildUrl: string | null;
  error?: string;
}

/** Max length of a character's notes (keep in sync with src/game/account.ts BIO_MAX). */
export const BIO_MAX = 1500;

/** GET /api/characters?q= row (bot src/web/api.ts searchCharacters). `portrait` = image key. */
export interface PlayerHit {
  slug: string;
  name: string;
  role: string;
  icon: string;
  level: number;
  fiend: boolean;
  portrait: string | null;
  /** added by the website route handler */
  portraitUrl?: string | null;
}

type Named = { id: string; name: string; emoji: string };

/** GET /api/characters/<slug> (bot src/web/api.ts characterProfile). Everything is public by design, except Discord ids. */
export interface PlayerProfile {
  slug: string;
  name: string;
  role: string;
  icon: string;
  level: number;
  fiend: boolean;
  createdAt: number;
  bio: string;
  status: NonNullable<AccountView["status"]>;
  equipped: { weapon: (Named & { level: number }) | null; armor: (Named & { level: number }) | null };
  inventory: (Named & { qty: number })[];
  blessings: { icon: string; name: string; tier: number }[];
  mutations: string[];
  record: { deaths: number; breakdowns: number; eventsCompleted: number; dungeonsCleared: number };
  images: AccountView["images"];
  sprite: AccountView["sprite"];
}
