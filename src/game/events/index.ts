import type { GameEventDef } from '../types.js';
import { CYPRESS_EVENTS } from './cypress.js';
import { DUNGEON_EVENTS } from './dungeons.js';
import { OLD_REALM_EVENTS } from './oldRealm.js';
import { ROUGE_LAND_EVENTS } from './rougeLand.js';

/** All action events. Add new ones in the files above. */
export const EVENTS: GameEventDef[] = [...OLD_REALM_EVENTS, ...CYPRESS_EVENTS, ...ROUGE_LAND_EVENTS, ...DUNGEON_EVENTS];

export const EVENTS_BY_ID: Record<string, GameEventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

// guard against duplicate ids at startup
if (Object.keys(EVENTS_BY_ID).length !== EVENTS.length) throw new Error('Duplicate event id in EVENTS');
