/**
 * Snapshot the static game data (world, Icons, roles, items, bestiary) into the website,
 * so the site works on hosts where the bot API isn't reachable (e.g. Vercel).
 * Live data (status, leaderboard) still comes from the bot's /api.
 *
 *   npm run web:data     → writes web/src/data/game.json (commit it)
 *
 * Re-run whenever game content changes.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// game modules open the player store on import — point it at a throwaway file
process.env.DATA_FILE = join(tmpdir(), 'fleshfall-export-sandbox.json');
const api = await import('./api.js');

const out = fileURLToPath(new URL('../../web/src/data/game.json', import.meta.url));
const data = { world: api.world(), icons: api.icons(), roles: api.roles(), items: api.items(), bestiary: api.bestiary() };
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(data, null, 1) + '\n');
console.log(`✓ ${out} — ${data.icons.length} icons, ${data.roles.length} roles, ${data.items.length} items, ${data.bestiary.length} monsters, ${data.world.continents.length} continents`);
process.exit(0);
