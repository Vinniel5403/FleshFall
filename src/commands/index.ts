import { buy, cook, sell, shop } from './economy.js';
import { explore, pray, rest, travel } from './explore.js';
import { equip, inventory, use } from './inventory.js';
import { arrive } from './arrive.js';
import { revive } from './revive.js';
import { panel } from './panel.js';
import { icons, moon, profile, roles, world } from './profile.js';
import { start } from './start.js';
import type { Command } from './types.js';

export const commands: Command[] = [
  start,
  profile,
  inventory,
  use,
  equip,
  explore,
  travel,
  rest,
  pray,
  shop,
  buy,
  sell,
  cook,
  icons,
  roles,
  world,
  moon,
  panel,
  arrive,
  revive,
];

export const commandMap = new Map(commands.map((c) => [c.data.name, c]));
