/**
 * Run SQL against the live player database — safe while the bot is running (it notices the change and reloads).
 *
 *   npm run db -- "SELECT user_id, name, json_extract(data,'$.flesh') AS flesh FROM characters"
 *   npm run db -- "UPDATE characters SET data = json_set(data,'$.flesh',1000) WHERE name = 'Sonya'"
 *
 * Tables: characters (user_id, name, data JSON, updated_at) · market (id, data) · proxied (message_id, data).
 */
import 'dotenv/config';
import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { sqlitePath } from './store.js';

const path = sqlitePath(process.env.DATA_FILE || 'data/db.sqlite');
const query = process.argv.slice(2).join(' ').trim();
if (!query) {
  console.log(`usage: npm run db -- "<SQL>"   (database: ${path})`);
  console.log(`  npm run db -- "SELECT user_id, name FROM characters"`);
  console.log(`  npm run db -- "UPDATE characters SET data = json_set(data,'$.flesh',1000) WHERE name = 'Sonya'"`);
  process.exit(0);
}
if (!existsSync(path)) {
  console.error(`no database at ${path} (start the bot once to create / import it)`);
  process.exit(1);
}

const sql = new Database(path);
sql.pragma('busy_timeout = 3000');
try {
  const stmt = sql.prepare(query);
  if (stmt.reader) {
    const rows = stmt.all() as Record<string, unknown>[];
    if (rows.length) console.table(rows);
    console.log(`${rows.length} row(s)`);
  } else {
    console.log(`${stmt.run().changes} row(s) changed`);
  }
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
} finally {
  sql.close();
}
