import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { loadCharacter } from '../game/character.js';
import { getItem, TRADEABLE_IDS } from '../game/items.js';
import { MAX_PRICE, MAX_QTY } from '../game/market.js';
import { marketCommand } from '../interactions/market.js';
import { ownedItems, servableItems, serveFood, toReply } from './actions.js';
import { requireActive } from './guard.js';
import type { Command } from './types.js';

export const market: Command = {
  data: new SlashCommandBuilder()
    .setName('market')
    .setDescription('ตลาดผู้เล่นหลังบาร์ (Rouge Land) — ซื้อขายกันเอง มัดจำโดย M.A.I.D.S')
    .addSubcommand((s) => s.setName('board').setDescription('ดูกระดานออเดอร์ / ซื้อ / ส่งของ'))
    .addSubcommand((s) => s.setName('mine').setDescription('ออเดอร์ของฉัน / ยกเลิก'))
    .addSubcommand((s) =>
      s
        .setName('sell')
        .setDescription('ตั้งขายของในกระเป๋า')
        .addStringOption((o) => o.setName('item').setDescription('ไอเทม').setRequired(true).setAutocomplete(true))
        .addIntegerOption((o) => o.setName('qty').setDescription('จำนวน').setRequired(true).setMinValue(1).setMaxValue(MAX_QTY))
        .addIntegerOption((o) => o.setName('price').setDescription('ราคาต่อชิ้น (เนื้อสด)').setRequired(true).setMinValue(1).setMaxValue(MAX_PRICE)),
    )
    .addSubcommand((s) =>
      s
        .setName('buy')
        .setDescription('ตั้งรับซื้อ (มัดจำเนื้อสดไว้ก่อน)')
        .addStringOption((o) => o.setName('item').setDescription('ไอเทม').setRequired(true).setAutocomplete(true))
        .addIntegerOption((o) => o.setName('qty').setDescription('จำนวน').setRequired(true).setMinValue(1).setMaxValue(MAX_QTY))
        .addIntegerOption((o) => o.setName('price').setDescription('ราคาต่อชิ้น (เนื้อสด)').setRequired(true).setMinValue(1).setMaxValue(MAX_PRICE)),
    ),
  async autocomplete(i) {
    const char = loadCharacter(i.user.id);
    const q = i.options.getFocused().toLowerCase();
    const sell = i.options.getSubcommand() === 'sell';
    const opts = sell
      ? (char ? ownedItems(char) : []).filter((x) => TRADEABLE_IDS.includes(x.id)).map((x) => ({ name: `${x.def.name} ×${x.qty}`, value: x.id }))
      : TRADEABLE_IDS.map((id) => ({ name: `${getItem(id)!.name} (ราคาร้าน ${getItem(id)!.value})`, value: id }));
    return i.respond(opts.filter((o) => !q || o.name.toLowerCase().includes(q) || o.value.includes(q)).slice(0, 25));
  },
  execute: marketCommand,
};

export const serve: Command = {
  data: new SlashCommandBuilder()
    .setName('serve')
    .setDescription('[Maid] เสิร์ฟอาหารบัฟให้แขกใน Rouge Land — บัฟแรงขึ้น +1 นานขึ้น 1.5 เท่า ได้ทิป')
    .addUserOption((o) => o.setName('user').setDescription('แขกที่จะเสิร์ฟ').setRequired(true))
    .addStringOption((o) => o.setName('item').setDescription('อาหารบัฟ').setRequired(true).setAutocomplete(true)),
  async autocomplete(i) {
    const char = loadCharacter(i.user.id);
    const q = i.options.getFocused().toLowerCase();
    return i.respond(
      (char ? servableItems(char) : [])
        .filter((x) => !q || x.def.name.toLowerCase().includes(q))
        .slice(0, 25)
        .map((x) => ({ name: `${x.def.name} ×${x.qty}`, value: x.id })),
    );
  },
  async execute(i) {
    const maid = await requireActive(i);
    if (!maid) return;
    const target = i.options.getUser('user', true);
    const guest = loadCharacter(target.id);
    if (!guest) return i.reply({ content: `${target.username} ยังไม่มีตัวละคร`, flags: MessageFlags.Ephemeral });
    // sync: both loaded, mutated and saved inside serveFood with no await
    return i.reply(toReply(serveFood(maid, guest, i.options.getString('item', true))));
  },
};
