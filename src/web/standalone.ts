/**
 * Run the web API without the bot: `npm run api` (the Next.js site in web/ talks to it).
 * Reads the live player file fresh on every request (read-only) and points the
 * game store at a throwaway file, so this process can never overwrite real saves.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Character } from '../game/types.js';

const liveFile = process.env.DATA_FILE || 'data/db.json';
process.env.DATA_FILE = join(tmpdir(), 'fleshfall-web-sandbox.json');

const players = (): Character[] => {
  try {
    return Object.values((JSON.parse(readFileSync(liveFile, 'utf8')) as { characters: Record<string, Character> }).characters);
  } catch {
    return [];
  }
};

const { startApi } = await import('./server.js');
startApi(Number(process.env.API_PORT ?? 3001), players);
