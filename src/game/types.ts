export type StatKey = 'str' | 'agi' | 'int';
export type RoleId = 'maid' | 'hound' | 'bar' | 'patron' | 'outsider' | 'survivor';
export type IconId = 'beelzebub' | 'hastur' | 'loki' | 'belphegor' | 'sophia' | 'thanatos' | 'wendigo';
export type Location = 'old_realm' | 'cypress' | 'rouge_land';
/** Door colors of the Old Realm. Icon doors + red (to Cypress Isle) + black (exit). */
export type DoorColor = 'green' | 'yellow' | 'gray' | 'orange' | 'white' | 'blue' | 'purple' | 'red' | 'black';
export type IconDoor = Exclude<DoorColor, 'red' | 'black'>;
export type ItemType = 'consumable' | 'weapon' | 'armor' | 'material' | 'vintage';

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
}

/** Active hunt: 3 monsters spawned in a zone. door = lucky dungeon door revealed after victory. */
export interface Hunt {
  zone: ZoneId;
  monsters: MonsterState[];
  door?: IconDoor;
  log: string[];
  loot: Record<string, number>;
  xp: number;
  won?: boolean;
}

export const CHAR_VERSION = 2;

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
  /** Blessing tier per Icon (0–5), earned at Icon shrines. */
  blessings?: Partial<Record<IconId, number>>;
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
}

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
  /** ready-to-print label, e.g. "🎲 พละ 14/12 ✅" */
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
  /** Final-chamber guardian of a dungeon. */
  boss?: boolean;
  minLevel?: number;
  roles?: RoleId[];
  crimson?: 'only' | 'never';
  choices: EventChoice[];
}
