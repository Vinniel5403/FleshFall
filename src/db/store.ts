import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Character, MarketOrder } from '../game/types.js';

interface DbShape {
  version: 1;
  characters: Record<string, Character>;
  /** Player market orders (sell listings + buy requests), escrowed. */
  market?: Record<string, MarketOrder>;
}

/**
 * Tiny JSON-file store. Reads/writes are synchronous in memory, so a
 * load -> mutate -> save sequence with no `await` in between can't race.
 * Disk writes are debounced and atomic (tmp file + rename).
 * To move to SQLite/Postgres later, reimplement this class with the same API.
 */
export class Store {
  private data: DbShape;
  private timer: NodeJS.Timeout | null = null;

  constructor(private file: string) {
    mkdirSync(dirname(file), { recursive: true });
    this.data = existsSync(file)
      ? (JSON.parse(readFileSync(file, 'utf8')) as DbShape)
      : { version: 1, characters: {} };
  }

  getCharacter(userId: string): Character | undefined {
    return this.data.characters[userId];
  }

  saveCharacter(char: Character): void {
    this.data.characters[char.userId] = char;
    this.scheduleFlush();
  }

  deleteCharacter(userId: string): void {
    delete this.data.characters[userId];
    this.scheduleFlush();
  }

  allCharacters(): Character[] {
    return Object.values(this.data.characters);
  }

  allOrders(): MarketOrder[] {
    return Object.values(this.data.market ?? {});
  }

  getOrder(id: string): MarketOrder | undefined {
    return this.data.market?.[id];
  }

  saveOrder(o: MarketOrder): void {
    (this.data.market ??= {})[o.id] = o;
    this.scheduleFlush();
  }

  deleteOrder(id: string): void {
    if (this.data.market) delete this.data.market[id];
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => this.flush(), 500);
  }

  flush(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    renameSync(tmp, this.file);
  }
}
