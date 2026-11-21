import type { Continent, Tier } from './zones.js';
export type StatKey = 'str' | 'agi' | 'int';
export type RoleId = 'maid' | 'hound' | 'bar' | 'patron' | 'outsider' | 'survivor';
export type IconId = 'beelzebub' | 'hastur' | 'loki' | 'belphegor' | 'sophia' | 'thanatos' | 'wendigo';
export type Location = 'old_realm' | 'cypress' | 'rouge_land';
/** Door colors of the Old Realm. Icon doors + red (to Cypress Isle) + black (exit). */
export type DoorColor = 'green' | 'yellow' | 'gray' | 'orange' | 'white' | 'blue' | 'purple' | 'red' | 'black';
export type IconDoor = Exclude<DoorColor, 'red' | 'black'>;
export type ItemType = 'consumable' | 'weapon' | 'armor' | 'material' | 'vintage' | 'furniture';

export interface Stats {
  str: number;
  agi: number;
  int: number;
}

export interface PendingEvent {
  eventId: string;
  expiresAt: number;
}

/** Active dungeon run. stage 'between' = choose go deeper/retreat, 'exit' = choose exit door. */
export interface DungeonRun {
  door: IconDoor;
  depth: number;
  maxDepth: number;
  stage: 'between' | 'exit';
  /** Rolled on entry: the door's Icon is present → shrine exit at the end. */
  icon?: boolean;
  /** Rolled on entry (`balance.dungeonBossChance`): the guardian waits in the last room. Absent (runs from before the roll) = it does. */
  boss?: boolean;
  /** Rooms already met this run — a room never comes up twice. */
  seen?: string[];
}

/** Zone = a city/area inside a region (Location). e.g. paris ⊂ old_realm. */
export type ZoneId = string;

/** Timed travel between zones; resolved lazily on load. */
export interface Travel {
  to: ZoneId;
  arriveAt: number;
}

export interface MonsterState {
  id: string;
  hp: number;
  maxHp: number;
  /** This monster's own level (hunt level ± `levelSpread`). Missing on old saves → the hunt's level. */
  lv?: number;
  /** Rotting (Thanatos gift): loses 5% max HP every round. */
  rot?: boolean;
}

/** Active hunt: 3 monsters spawned in a zone. door = lucky dungeon door revealed after victory. */
export interface Hunt {
  zone: ZoneId;
  monsters: MonsterState[];
  /** Base monster level for this hunt = city level + trip streak bonus (each monster rolls around it). Missing on old saves → city level. */
  lv?: number;
  door?: IconDoor;
  log: string[];
  loot: Record<string, number>;
  xp: number;
  won?: boolean;
  /** Loki gift's re-roll already used this hunt. */
  reroll?: boolean;
}

/** Character image slots (website uploads). Defined in account.ts IMAGE_SLOTS. */
export type ImageSlot = 'portrait' | 'art' | 'sheet' | 'gallery';

/** Uploaded character image. `key` = object key in R2 (public URL = IMAGE_BASE_URL + key). */
export interface CharImage {
  slot: ImageSlot;
  key: string;
  at: number;
}

/** One cut-out sprite part (a PSD group), placed in rig canvas space. File = `${base}/${id}.${ext}`. */
export interface SpritePart {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** draw order (PSD group order, bottom = 0) */
  z: number;
  ext: 'webp' | 'png';
  /** pixel anchors (rig coords): top/bottom band centroid — shoulder/hand, hip, hair root */
  top?: [number, number];
  bot?: [number, number];
  /** weapon: which arm holds it (screen side) */
  hand?: 'l' | 'r';
}

/** Paper-doll sprite built from the player's PSD (parsed in the browser). Pivots/parents come from part ids (web/src/lib/rig.ts). */
export interface CharSprite {
  /** R2 prefix, e.g. sprites/<mediaId>/<rand> (legacy saves: sprites/<uid>/<rand>) */
  base: string;
  width: number;
  height: number;
  parts: SpritePart[];
  /** character height in cm (website slider) */
  heightCm?: number;
  at: number;
}

/** One piece of furniture in the private room. x/y = top-left as fractions of the room size. */
export interface RoomItem {
  /** catalog id (web/src/data/rooms.json) — unknown ids are skipped when drawing. A placed piece is out of the inventory (see applyRoom) */
  id: string;
  x: number;
  y: number;
  /** mirrored horizontally */
  flip?: boolean;
  /** drawn in front of the character */
  front?: boolean;
}

/** Private room on the website: a template background + furniture (draw order = array order). */
export interface CharRoom {
  template: string;
  items: RoomItem[];
  at: number;
}

export const CHAR_VERSION = 2;

/** Player market order. sell = items escrowed, buy = flesh escrowed (qty × price). */
export interface MarketOrder {
  id: string;
  kind: 'sell' | 'buy';
  owner: string;
  ownerName: string;
  ownerRole: RoleId;
  item: string;
  /** remaining quantity */
  qty: number;
  /** flesh per unit */
  price: number;
  createdAt: number;
}

/** Expedition round outside Rouge Land. `loot` = pending haul (delivered at home, never if you die), `streak` = hunts won. */
export interface Trip {
  loot: Record<string, number>;
  streak: number;
  /** Talent second_wind already saved you this trip. */
  secondWind?: boolean;
}

/** Meal buff from a Bar-only dish. `servedBy` = Maid who served it (stronger + longer). */
export interface MealBuff {
  item: string;
  until: number;
  servedBy?: string;
}

/** Stat bonus a dish grants while its buff lasts. */
export interface BuffDef {
  stat?: StatKey;
  /** damage reduction */
  def?: number;
  amount: number;
  minutes: number;
}

export interface Character {
  version: number;
  userId: string;
  name: string;
  role: RoleId;
  icon: IconId;
  location: Location;
  reachedRougeLand: boolean;
  level: number;
  xp: number;
  /** HP = เนื้อกาย. "I have flesh, therefore I am." */
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  humanity: number; // 0-100, 0 = Fiend
  sanity: number; // 0-100
  /** Fresh flesh — the currency of this realm. */
  flesh: number;
  stats: Stats;
  inventory: Record<string, number>;
  equipped: { weapon?: string; armor?: string };
  mutations: string[];
  cooldowns: Record<string, number>;
  pendingEvent?: PendingEvent;
  run?: DungeonRun;
  /** Current zone inside `location`; derived via currentZone() when missing/mismatched. */
  zone?: ZoneId;
  traveling?: Travel;
  hunt?: Hunt;
  /** Zone whose Discord role was last synced ('' = none). */
  roleZone?: string;
  /** Upgrade level per equipment item id (+1 ATK/DEF each). */
  gearLevels?: Record<string, number>;
  /** Weapon copies fused into each weapon id at the forge (default 1). Damage bonus = floor(log2(copies)). */
  gearMerged?: Record<string, number>;
  /** Blessing tier per Icon (0–5), earned at Icon shrines. */
  blessings?: Partial<Record<IconId, number>>;
  /** Growth system version (growth.ts `migrateGrowth`): missing = old auto-stat saves, refunded on load. */
  growthV?: number;
  /** Stat points waiting to be spent (1 per level, 2 every 5th). */
  statPoints?: number;
  /** Talent picks waiting (1 every 5 levels) + the 3 on offer for the next one (kept so re-opening never rerolls). */
  talentPicks?: number;
  talentOffer?: string[];
  /** Talents taken: id → times (growth.ts TALENTS). */
  talents?: Record<string, number>;
  /** Icon gifts received at shrines (growth.ts GIFTS), one per Icon. */
  gifts?: IconId[];
  /** Character art uploaded on the website (portrait, full art, sheet, gallery). */
  images?: CharImage[];
  /** Animated paper-doll sprite from the player's PSD. */
  sprite?: CharSprite;
  /** Private room (website): template + placed furniture. */
  room?: CharRoom;
  /** Expedition round: pending haul + hunt streak (handed over when you get home). */
  trip?: Trip;
  /** Active meal buff (Bar-only recipes). */
  buff?: MealBuff;
  /** Last safe return home with trip loot (shown on inventory for a while). */
  banked?: { text: string; at: number };
  /** Player-written notes / backstory, public on the profile (web + Discord). Max BIO_MAX chars. */
  bio?: string;
  /** when the current name was taken (rename); absent = createdAt. Orders duplicate-name handles (assignHandles). */
  nameAt?: number;
  /** Knocked out in an easy/normal city: can't act until a friend revives or `until` passes (→ home, trip lost). */
  downed?: { at: number; until: number; zone: ZoneId };
  /** Fell in a hard/epic city: choose 🥚 placenta revive (keep fighting) or give up (real death). */
  dying?: { at: number; zone: ZoneId };
  fiend: boolean;
  lastRegenAt: number;
  createdAt: number;
  deaths: number;
  breakdowns: number;
  eventsCompleted: number;
  dungeonsCleared: number;
}

export interface ItemDef {
  id: string;
  name: string;
  emoji: string;
  type: ItemType;
  description: string;
  value: number;
  heal?: number;
  stamina?: number;
  sanity?: number;
  humanity?: number;
  /** eating it counts as consuming flesh (Gluttony buff, Maid abstinence) */
  isFlesh?: boolean;
  atk?: number;
  def?: number;
  /** eating it grants a timed meal buff */
  buff?: BuffDef;
  /** Thrown in a hunt: [min, max] damage to every monster still standing (+ half the thrower's level). Only usable mid-hunt. */
  blast?: [number, number];
  /** The room catalog id it places (web/src/data/rooms.json) — what makes an item placeable in the private room. */
  furniture?: string;
  /** Room-decoration collectible found on hunts (drops.ts). Placeable as an emoji sticker (`decorFurnitureId`) until real art exists. */
  decor?: boolean;
  /** Drop weight inside every pool it sits in (`RARITY_WEIGHT`); filled in by catalog.ts when the item doesn't set one. */
  rarity?: Rarity;
  /** Uploaded art (R2 key `items/<id>-<rand>.<ext>`, public URL = IMAGE_BASE_URL + key) — replaces the emoji on cards and the web. */
  image?: string;
  /** Pixel size of `image` (aspect ratio for room stickers). */
  imageSize?: [number, number];
  /** Furniture with uploaded art: real height in cm of the sticker in a room. */
  sizeCm?: number;
  /** Made on the admin page (not in items.ts). */
  custom?: boolean;
  /** Deleted on the admin page (code items can't really go): nobody can gain it, it's out of every shop, pool and list. */
  retired?: boolean;
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

/** Where an item can be bought or found. `home` = the Rouge Land butchery; continent = that continent's shop / pools. */
export interface ItemPlacement {
  shop: ('home' | Continent)[];
  /** local goods a monster may carry (per kill, LOCAL_DROPS) */
  local: Continent[];
  /** gear that fits the city tier (per kill, TIER_GEAR); 'legend' = the legend pool (LEGEND_DROPS, epic + legendary cities) */
  tiers: (Tier | 'legend')[];
  /** decoration pieces found searching after a hunt: 'any' = every city, continent = only there */
  decor: ('any' | Continent)[];
}

/** Admin edit of one item (db `items`): fields replace the code's (or define a custom item); `where` replaces its placement. */
export type ItemPatch = Partial<ItemDef> & { id: string; where?: ItemPlacement };

export interface Outcome {
  text: string;
  hp?: number;
  stamina?: number;
  flesh?: number;
  xp?: number;
  humanity?: number;
  sanity?: number;
  /** Miasma exposure: drains sanity, and some humanity. Thanatos devotees are immune. */
  miasma?: number;
  items?: Partial<Record<string, number>>;
  mutation?: string;
  enterDungeon?: IconDoor;
  travel?: Location;
  unlockRougeLand?: boolean;
}

export interface CheckResult {
  success: boolean;
  roll: number;
  total: number;
  dc: number;
  /** ready-to-print label, e.g. "พละ 🎲 9 +5 = 14 · ต้อง 12 ✅" */
  tag: string;
}

export interface EventContext {
  char: Character;
  check: (stat: StatKey, dc: number) => CheckResult;
  rand: (min: number, max: number) => number;
  chance: (p: number) => boolean;
  has: (itemId: string) => boolean;
  crimsonMoon: boolean;
}

export interface EventChoice {
  id: string;
  label: string;
  emoji?: string;
  style?: 'primary' | 'secondary' | 'success' | 'danger';
  /** Shown to those who can perceive (Hastur devotees, Survivors). */
  hint?: string;
  visible?: (char: Character) => boolean;
  resolve: (ctx: EventContext) => Outcome;
}

export interface GameEventDef {
  id: string;
  title: string;
  description: string;
  weight: number;
  /** Where it can occur when not in a dungeon. */
  where?: Location;
  /** Dungeon events: which door color. */
  door?: IconDoor;
  /** Explore event that discovers this door (Icon colours + red) — rolled on its own (`balance.exploreDoorChance`); `weight` only picks the colour. */
  finds?: DoorColor;
  /** Final-chamber guardian of a dungeon. */
  boss?: boolean;
  minLevel?: number;
  roles?: RoleId[];
  crimson?: 'only' | 'never';
  choices: EventChoice[];
}
