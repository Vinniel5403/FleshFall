import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { loadCharacter } from '../game/character.js';
import { getItem } from '../game/items.js';
import { autoSrc, buyItem, buyPrice, cookRecipe, RECIPES, sellItem, shopError, shopPayload, shopStock, STOCK, toReply } from './actions.js';
import { requireActive } from './guard.js';
import { inventoryAutocomplete } from './inventory.js';
import type { Command } from './types.js';

export const shop: Command = {
  data: new SlashCommandBuilder().setName('shop').setDescription('ร้านค้า — Rouge Land หรือร้านประจำทวีปในเมืองที่อยู่'),
  async execute(i) {
    const char = await requireActive(i);
    if (!char) return;
    const err = shopError(char, autoSrc(char));
    if (err) return i.reply({ content: err, flags: MessageFlags.Ephemeral });
    await i.deferReply({ flags: MessageFlags.Ephemeral }); // card render can exceed the 3s window
    return i.editReply(await shopPayload(char, autoSrc(char), 'ซื้อ /buy · ขาย /sell'));
  },
};

export const buy: Command = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('ซื้อของจากร้านเนื้อ')
    .addStringOption((o) => o.setName('item').setDescription('ไอเทม').setRequired(true).setAutocomplete(true))
    .addIntegerOption((o) => o.setName('qty').setDescription('จำนวน').setMinValue(1).setMaxValue(20)),
  autocomplete: async (i) => {
    const char = loadCharacter(i.user.id);
    const q = i.options.getFocused().toLowerCase();
    return i.respond(
      (char ? shopStock(char, autoSrc(char)) : STOCK).filter((id) => getItem(id)!.name.toLowerCase().includes(q) || id.includes(q))
        .slice(0, 25)
        .map((id) => ({ name: `${getItem(id)!.name} — ${char ? buyPrice(char, id) : getItem(id)!.value} เนื้อสด`, value: id })),
    );
  },
  async execute(i) {
    const char = await requireActive(i);
    if (!char) return;
    return i.reply(toReply(buyItem(char, i.options.getString('item', true), i.options.getInteger('qty') ?? 1)));
  },
};

export const sell: Command = {
  data: new SlashCommandBuilder()
    .setName('sell')
    .setDescription('ขายของให้ร้าน/Patron (ของวินเทจได้ราคาเต็ม)')
    .addStringOption((o) => o.setName('item').setDescription('ไอเทม').setRequired(true).setAutocomplete(true))
    .addIntegerOption((o) => o.setName('qty').setDescription('จำนวน').setMinValue(1)),
  autocomplete: inventoryAutocomplete(),
  async execute(i) {
    const char = await requireActive(i);
    if (!char) return;
    return i.reply(toReply(sellItem(char, i.options.getString('item', true), i.options.getInteger('qty') ?? 1)));
  },
};

export const cook: Command = {
  data: new SlashCommandBuilder()
    .setName('cook')
    .setDescription('ปรุงเนื้อที่บาร์ (Rouge Land) — Bar Staff ไม่มีวันพลาด')
    .addStringOption((o) =>
      o
        .setName('recipe')
        .setDescription('สูตร')
        .setRequired(true)
        .addChoices(
          ...RECIPES.map((r) => ({
            name: `${getItem(r.makes)!.emoji} ${r.name} = ${Object.entries(r.needs).map(([id, n]) => `${getItem(id)!.name}×${n}`).join(' + ')}`.slice(0, 100),
            value: r.id,
          })),
        ),
    ),
  async execute(i) {
    const char = await requireActive(i);
    if (!char) return;
    return i.reply(toReply(cookRecipe(char, i.options.getString('recipe', true))));
  },
};
