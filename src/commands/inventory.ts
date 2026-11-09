import { MessageFlags, SlashCommandBuilder, type AutocompleteInteraction } from 'discord.js';
import { loadCharacter } from '../game/character.js';
import type { ItemType } from '../game/types.js';
import { equipItem, inventoryEmbed, ownedItems, toReply, useItem } from './actions.js';
import { requireActive, requireCharacter } from './guard.js';
import type { Command } from './types.js';

/** Autocomplete from the caller's own inventory, optionally filtered by type. */
export function inventoryAutocomplete(types?: ItemType[]) {
  return async (i: AutocompleteInteraction) => {
    const char = loadCharacter(i.user.id);
    const q = i.options.getFocused().toLowerCase();
    const opts = (char ? ownedItems(char, types) : [])
      .filter((x) => x.def.name.toLowerCase().includes(q) || x.id.includes(q))
      .slice(0, 25)
      .map((x) => ({ name: `${x.def.name} ×${x.qty}`, value: x.id }));
    return i.respond(opts);
  };
}

export const inventory: Command = {
  data: new SlashCommandBuilder().setName('inventory').setDescription('ดูของในกระเป๋า'),
  async execute(i) {
    const char = await requireCharacter(i);
    if (!char) return;
    return i.reply({ embeds: [inventoryEmbed(char)], flags: MessageFlags.Ephemeral });
  },
};

export const use: Command = {
  data: new SlashCommandBuilder()
    .setName('use')
    .setDescription('กิน/ใช้ไอเทม')
    .addStringOption((o) => o.setName('item').setDescription('ไอเทม').setRequired(true).setAutocomplete(true)),
  autocomplete: inventoryAutocomplete(['consumable']),
  async execute(i) {
    const char = await requireActive(i);
    if (!char) return;
    return i.reply(toReply(useItem(char, i.options.getString('item', true))));
  },
};

export const equip: Command = {
  data: new SlashCommandBuilder()
    .setName('equip')
    .setDescription('สวมอาวุธหรือเกราะ')
    .addStringOption((o) => o.setName('item').setDescription('ไอเทม').setRequired(true).setAutocomplete(true)),
  autocomplete: inventoryAutocomplete(['weapon', 'armor']),
  async execute(i) {
    const char = await requireActive(i);
    if (!char) return;
    return i.reply(toReply(equipItem(char, i.options.getString('item', true))));
  },
};
