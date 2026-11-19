/**
 * Run the web API without the bot: `npm run api` (the Next.js site in web/ talks to it).
 * Reads the live player database fresh on every request (read-only connection) and points the
 * game store at a throwaway file, so this process can never overwrite real saves.
 */
import 'dotenv/config';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Character } from '../game/types.js';

const liveFile = process.env.DATA_FILE || 'data/db.sqlite';
process.env.DATA_FILE = join(tmpdir(), 'fleshfall-web-sandbox.sqlite');
const { readCharacters } = await import('../db/store.js');

const players = (): Character[] => {
  try {
    return readCharacters(liveFile);
  } catch {
    return [];
  }
};

const { startApi } = await import('./server.js');
startApi(Number(process.env.API_PORT ?? 3001), { players });
