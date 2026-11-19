/**
 * Private rooms: a side-view template background + furniture stickers + the player's paper doll (grab + throw, puppet physics).
 * Catalog = src/data/rooms.json (built by `npm run web:rooms` from assets/rooms-src). Layout = bot CharRoom.
 * Furniture is a game item (bot ItemDef.furniture = catalog id): a room holds as many of one as the player owns.
 * All positions are fractions of the room image (x of width, y of height), so art resolution can change freely.
 */
import catalog from "@/data/rooms.json";

export interface RoomTemplate {
  id: string;
  name: string;
  /** background pixel size (aspect ratio) */
  w: number;
  h: number;
  /** real height of the whole image → sprites stand at their real cm height */
  heightCm: number;
  /** walkable floor band (feet y), fractions of the height */
  floorTop: number;
  floorBottom: number;
}

export interface RoomFurniture {
  id: string;
  name: string;
  /** template it was drawn for */
  room: string;
  /** default placement (top-left) and size, fractions of the room */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlacedItem {
  id: string;
  x: number;
  y: number;
  flip?: boolean;
  front?: boolean;
}

export interface RoomLayout {
  template: string;
  items: PlacedItem[];
  at?: number;
}

export const ROOM_TEMPLATES = catalog.templates as RoomTemplate[];
export const FURNITURE = catalog.items as RoomFurniture[];
/** keep in sync with src/game/account.ts ROOM_MAX_ITEMS */
export const ROOM_MAX_ITEMS = 60;

export const roomBg = (t: RoomTemplate) => `/rooms/${t.id}.webp`;
export const furnitureSrc = (f: RoomFurniture) => `/rooms/items/${f.id}.webp`;
export const furniture = (id: string) => FURNITURE.find((f) => f.id === id);
export const template = (id?: string) => ROOM_TEMPLATES.find((t) => t.id === id) ?? ROOM_TEMPLATES[0];

/** Empty room for players who never decorated. */
export const defaultRoom = (): RoomLayout => ({ template: ROOM_TEMPLATES[0]?.id ?? "", items: [] });

/** How many of each furniture id a layout uses. */
export function placedCounts(items: { id: string }[]): Map<string, number> {
  const n = new Map<string, number>();
  for (const it of items) n.set(it.id, (n.get(it.id) ?? 0) + 1);
  return n;
}

/** New sticker at the spot it was painted on in the template. */
export const placeNew = (f: RoomFurniture): PlacedItem => ({ id: f.id, x: f.x, y: f.y });
