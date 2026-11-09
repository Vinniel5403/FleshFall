import { config } from '../config.js';
import { Store } from './store.js';

export const db = new Store(config.dataFile);

// Discord user ids are numeric snowflakes; anything else is a stray test record.
for (const c of db.allCharacters()) {
  if (!/^\d+$/.test(c.userId)) {
    console.warn(`purging non-Discord character ${c.userId} (${c.name})`);
    db.deleteCharacter(c.userId);
  }
}

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    db.flush();
    process.exit(0);
  });
}
