import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Character, MarketOrder } from '../game/types.js';

interface DbShape {
  version: 1;
  characters: Record<string, Character>;
  /** Player market orders (sell listings + buy requests), escrowed. */
  market?: Record<string, MarketOrder>;
  /** RP proxy: webhook message id → who wrote it (for ❌ delete / ✏️ edit). Capped, oldest dropped. */
  proxied?: Record<string, ProxiedMessage>;
}

export interface ProxiedMessage {
  authorId: string;
  /** Channel that owns the webhook (thread parent when posted in a thread). */
  channelId: string;
  threadId?: string;
  at: number;
}

const PROXIED_MAX = 5000;

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

  getProxied(messageId: string): ProxiedMessage | undefined {
    return this.data.proxied?.[messageId];
  }

  saveProxied(messageId: string, p: ProxiedMessage): void {
    const all = (this.data.proxied ??= {});
    all[messageId] = p;
    const ids = Object.keys(all);
    if (ids.length > PROXIED_MAX) {
      // insertion order ≈ age; drop the oldest overflow
      for (const id of ids.slice(0, ids.length - PROXIED_MAX)) delete all[id];
    }
    this.scheduleFlush();
  }

  deleteProxied(messageId: string): void {
    if (this.data.proxied) delete this.data.proxied[messageId];
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
