import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Character, ItemPatch, MarketOrder } from '../game/types.js';

/** The old single-JSON-file shape (imported once into SQLite). */
interface LegacyDb {
  version: 1;
  characters: Record<string, Character>;
  market?: Record<string, MarketOrder>;
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

/** `DATA_FILE` may still name the old `db.json`: the database lives next to it as `db.sqlite`. */
export const sqlitePath = (file: string) => file.replace(/\.json$/, '.sqlite');

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS characters (
    user_id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    name TEXT GENERATED ALWAYS AS (json_extract(data, '$.name')) VIRTUAL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS market (id TEXT PRIMARY KEY, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS proxied (message_id TEXT PRIMARY KEY, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL);
`;

/**
 * SQLite store (better-sqlite3, synchronous). Characters + market orders are cached in memory and every save
 * writes its row straight through, so a load -> mutate -> save sequence with no `await` in between can't race,
 * and loaded objects behave exactly like the old JSON store's. Edits made from outside while the bot runs
 * (sqlite3 CLI, DB Browser, `npm run db`) bump `PRAGMA data_version` → the cache reloads on the next access.
 * Character data stays a JSON column (no migrations when the shape changes); query it with json_extract.
 */
export class Store {
  private sql: Database.Database;
  private chars = new Map<string, Character>();
  private orders = new Map<string, MarketOrder>();
  private version = -1;
  private proxiedWrites = 0;
  private q;

  constructor(file: string) {
    const path = sqlitePath(file);
    mkdirSync(dirname(path), { recursive: true });
    const fresh = !existsSync(path);
    this.sql = new Database(path);
    this.sql.pragma('journal_mode = WAL'); // readers (web API, editors) never block the bot
    this.sql.pragma('synchronous = NORMAL');
    this.sql.pragma('busy_timeout = 3000');
    this.sql.exec(SCHEMA);
    this.q = {
      chars: this.sql.prepare<[], { data: string }>('SELECT data FROM characters'),
      putChar: this.sql.prepare<[string, string, number]>(
        'INSERT INTO characters (user_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at',
      ),
      delChar: this.sql.prepare<[string]>('DELETE FROM characters WHERE user_id = ?'),
      orders: this.sql.prepare<[], { data: string }>('SELECT data FROM market'),
      putOrder: this.sql.prepare<[string, string]>('INSERT OR REPLACE INTO market (id, data) VALUES (?, ?)'),
      delOrder: this.sql.prepare<[string]>('DELETE FROM market WHERE id = ?'),
      items: this.sql.prepare<[], { data: string }>('SELECT data FROM items ORDER BY rowid'),
      putItem: this.sql.prepare<[string, string, number]>(
        'INSERT INTO items (id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at',
      ),
      delItem: this.sql.prepare<[string]>('DELETE FROM items WHERE id = ?'),
      getProxied: this.sql.prepare<[string], { data: string }>('SELECT data FROM proxied WHERE message_id = ?'),
      putProxied: this.sql.prepare<[string, string]>('INSERT OR REPLACE INTO proxied (message_id, data) VALUES (?, ?)'),
      delProxied: this.sql.prepare<[string]>('DELETE FROM proxied WHERE message_id = ?'),
      trimProxied: this.sql.prepare<[number]>(
        'DELETE FROM proxied WHERE rowid NOT IN (SELECT rowid FROM proxied ORDER BY rowid DESC LIMIT ?)',
      ),
    };
    if (fresh && file !== path && existsSync(file)) this.importJson(file);
    this.refresh();
  }

  /** One-time move from the old db.json; the file is kept, renamed, as a backup. */
  private importJson(file: string): void {
    const old = JSON.parse(readFileSync(file, 'utf8')) as LegacyDb;
    const now = Date.now();
    this.sql.transaction(() => {
      for (const c of Object.values(old.characters ?? {})) this.q.putChar.run(c.userId, JSON.stringify(c), now);
      for (const o of Object.values(old.market ?? {})) this.q.putOrder.run(o.id, JSON.stringify(o));
      for (const [id, p] of Object.entries(old.proxied ?? {})) this.q.putProxied.run(id, JSON.stringify(p)); // insertion order = age
    })();
    renameSync(file, `${file}.migrated`);
    console.log(`imported ${file} into SQLite (${Object.keys(old.characters ?? {}).length} characters); old file kept as ${file}.migrated`);
  }

  /** Reload the cache when another connection changed the database. */
  private refresh(): void {
    const v = this.sql.pragma('data_version', { simple: true }) as number;
    if (v === this.version) return;
    this.version = v;
    this.chars = new Map(this.q.chars.all().map((r) => JSON.parse(r.data) as Character).map((c) => [c.userId, c]));
    this.orders = new Map(this.q.orders.all().map((r) => JSON.parse(r.data) as MarketOrder).map((o) => [o.id, o]));
  }

  getCharacter(userId: string): Character | undefined {
    this.refresh();
    return this.chars.get(userId);
  }

  saveCharacter(char: Character): void {
    this.refresh();
    this.chars.set(char.userId, char);
    this.q.putChar.run(char.userId, JSON.stringify(char), Date.now());
  }

  deleteCharacter(userId: string): void {
    this.refresh();
    this.chars.delete(userId);
    this.q.delChar.run(userId);
  }

  allCharacters(): Character[] {
    this.refresh();
    return [...this.chars.values()];
  }

  allOrders(): MarketOrder[] {
    this.refresh();
    return [...this.orders.values()];
  }

  getOrder(id: string): MarketOrder | undefined {
    this.refresh();
    return this.orders.get(id);
  }

  saveOrder(o: MarketOrder): void {
    this.refresh();
    this.orders.set(o.id, o);
    this.q.putOrder.run(o.id, JSON.stringify(o));
  }

  deleteOrder(id: string): void {
    this.refresh();
    this.orders.delete(id);
    this.q.delOrder.run(id);
  }

  /** Admin item edits (catalog.ts applies them). Not cached: read on startup and after each edit. */
  allItemPatches(): ItemPatch[] {
    return this.q.items.all().map((r) => JSON.parse(r.data) as ItemPatch);
  }

  saveItemPatch(p: ItemPatch): void {
    this.q.putItem.run(p.id, JSON.stringify(p), Date.now());
  }

  deleteItemPatch(id: string): void {
    this.q.delItem.run(id);
  }

  getProxied(messageId: string): ProxiedMessage | undefined {
    const row = this.q.getProxied.get(messageId);
    return row ? (JSON.parse(row.data) as ProxiedMessage) : undefined;
  }

  saveProxied(messageId: string, p: ProxiedMessage): void {
    this.q.putProxied.run(messageId, JSON.stringify(p));
    if (++this.proxiedWrites % 100 === 0) this.q.trimProxied.run(PROXIED_MAX); // rowid order ≈ age; drop the oldest overflow
  }

  deleteProxied(messageId: string): void {
    this.q.delProxied.run(messageId);
  }

  /** Writes are already on disk; fold the WAL back into the main file before exit. */
  flush(): void {
    this.sql.pragma('wal_checkpoint(TRUNCATE)');
  }

  close(): void {
    this.flush();
    this.sql.close();
  }
}

/** Read-only snapshot of every character, for a separate process (web API) — never writes. */
export function readCharacters(file: string): Character[] {
  const path = sqlitePath(file);
  if (!existsSync(path)) {
    // bot not migrated yet: fall back to the old JSON file
    if (file === path || !existsSync(file)) return [];
    return Object.values((JSON.parse(readFileSync(file, 'utf8')) as LegacyDb).characters ?? {});
  }
  const sql = new Database(path, { readonly: true, fileMustExist: true });
  try {
    return sql.prepare<[], { data: string }>('SELECT data FROM characters').all().map((r) => JSON.parse(r.data) as Character);
  } finally {
    sql.close();
  }
}
