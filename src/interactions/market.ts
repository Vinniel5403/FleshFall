/**
 * Market UI (🏛️ ตลาดมืดหลังบาร์). Panel buttons arrive as pn:mkt*, selects as pns:mkt*, modals as pnm:<sell|buy>:<item>.
 * All views are ephemeral. Logic lives in game/market.ts.
 */
import {
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Client,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from 'discord.js';
import { itemCount } from '../game/character.js';
import { getItem, TRADEABLE_IDS } from '../game/items.js';
import { cancelOrder, fillOrder, listOrders, marketError, maxOrders, myOrders, orderLine, postOrder, type MarketResult } from '../game/market.js';
import type { Character, ItemType, MarketOrder } from '../game/types.js';
import { requireActive } from '../commands/guard.js';
import { ownedItems } from '../commands/actions.js';
import { COLORS, resultEmbed } from '../ui.js';

const ephemeral = MessageFlags.Ephemeral;

function select(id: string, placeholder: string, options: { label: string; value: string; description?: string; emoji?: string }[]) {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`pns:${id}`)
      .setPlaceholder(placeholder)
      .addOptions(
        options.slice(0, 25).map((o) => ({ label: o.label.slice(0, 100), value: o.value, description: o.description?.slice(0, 100), emoji: o.emoji })),
      ),
  );
}

// ---------- views ----------

/** Board: every open order + a picker to buy from / deliver to one. */
export function boardView(char: Character) {
  const orders = listOrders();
  const sells = orders.filter((o) => o.kind === 'sell');
  const buys = orders.filter((o) => o.kind === 'buy');
  const block = (os: MarketOrder[]) => (os.length ? os.slice(0, 12).map((o) => `• ${orderLine(o)}`).join('\n') : '*ว่าง*');
  const e = new EmbedBuilder()
    .setColor(COLORS.crimson)
    .setTitle('🏛️ ตลาดมืดหลังบาร์')
    .setDescription('*กระดานไม้เปื้อนเลือดเต็มไปด้วยกระดาษโน้ต ทุกใบมีตราประทับของ M.A.I.D.S รับรองการมัดจำ*')
    .addFields(
      { name: `🏷️ ขาย (${sells.length})`, value: block(sells).slice(0, 1024) },
      { name: `📜 รับซื้อ (${buys.length})`, value: block(buys).slice(0, 1024) },
    )
    .setFooter({ text: `🥩 ${char.flesh} เนื้อสด · ซื้อขายได้ใน Rouge Land เท่านั้น · ส่งของให้ออเดอร์ของ 🎩 Patron ได้ทิป +20%` });
  const others = orders.filter((o) => o.owner !== char.userId);
  const rows = others.length
    ? [
        select(
          'mktfill',
          'เลือกออเดอร์ — ซื้อของ / ส่งของ',
          others.map((o) => ({
            label: `${o.kind === 'sell' ? 'ซื้อ' : 'ส่งของ'} ${getItem(o.item)?.name ?? o.item} ×${o.qty} · ${o.price} 🥩/ชิ้น`,
            value: o.id,
            emoji: getItem(o.item)?.emoji,
            description: o.kind === 'sell' ? `ขายโดย ${o.ownerName}` : `${o.ownerName} รับซื้อ · คุณมี ${itemCount(char, o.item)}${o.ownerRole === 'patron' ? ' · ทิป +20%' : ''}`,
          })),
        ),
      ]
    : [];
  return { content: '', embeds: [e], files: [], components: rows };
}

export function mineView(char: Character) {
  const mine = myOrders(char.userId);
  const e = new EmbedBuilder()
    .setColor(COLORS.bone)
    .setTitle('📋 ออเดอร์ของฉัน')
    .setDescription(mine.length ? mine.map((o) => `${o.kind === 'sell' ? '🏷️' : '📜'} ${orderLine(o)} · \`${o.id}\``).join('\n') : '*ยังไม่มีออเดอร์*')
    .setFooter({ text: `เปิดได้ ${mine.length}/${maxOrders(char)} · หมดอายุ 3 วัน คืนของ/มัดจำอัตโนมัติ` });
  const rows = mine.length
    ? [select('mktcancel', 'ยกเลิกออเดอร์ (คืนของ/มัดจำ)', mine.map((o) => ({ label: `${o.kind === 'sell' ? 'ขาย' : 'รับซื้อ'} ${getItem(o.item)?.name ?? o.item} ×${o.qty}`, value: o.id, emoji: '❌' })))]
    : [];
  return { content: '', embeds: [e], files: [], components: rows };
}

const BUY_CATS: { id: string; label: string; emoji: string; types: ItemType[] }[] = [
  { id: 'consumable', label: 'ของกิน / ยา / อาหารบัฟ', emoji: '🍽️', types: ['consumable'] },
  { id: 'material', label: 'วัตถุดิบ', emoji: '⚙️', types: ['material'] },
  { id: 'gear', label: 'อาวุธ / เกราะ', emoji: '🗡️', types: ['weapon', 'armor'] },
  { id: 'vintage', label: 'ของวินเทจจากโลกจริง', emoji: '📻', types: ['vintage'] },
];

function qtyPriceModal(kind: 'sell' | 'buy', item: string, have?: number) {
  const def = getItem(item)!;
  return new ModalBuilder()
    .setCustomId(`pnm:${kind}:${item}`)
    .setTitle(`${kind === 'sell' ? 'ตั้งขาย' : 'ตั้งรับซื้อ'} ${def.name}`.slice(0, 45))
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('qty')
          .setLabel(have !== undefined ? `จำนวน (มี ${have})` : 'จำนวน')
          .setStyle(TextInputStyle.Short)
          .setValue(String(Math.min(have ?? 1, 99) || 1))
          .setRequired(true),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('price')
          .setLabel(`ราคาต่อชิ้น (ร้านรับซื้อ ~${Math.floor(def.value / 2)} · ขาย ${def.value})`)
          .setStyle(TextInputStyle.Short)
          .setValue(String(Math.max(1, Math.round(def.value * 0.75))))
          .setRequired(true),
      ),
    );
}

// ---------- notify ----------

function notifyOwner(client: Client, r: MarketResult): void {
  if (!r.ok || !r.notify) return;
  const { userId, text } = r.notify;
  void client.users.send(userId, text).catch(() => {}); // DMs may be closed — the goods are delivered regardless
}

const resultPayload = (char: Character, title: string, r: MarketResult) =>
  r.ok ? { embeds: [resultEmbed(char, title, r.lines, COLORS.crimson)] } : { content: `⚠️ ${r.error}`, embeds: [] };

// ---------- panel entry points ----------

/** pn:mkt / pn:mktmine / pn:mktsell / pn:mktbuy */
export async function marketButton(i: ButtonInteraction, char: Character, action: string): Promise<unknown> {
  const err = marketError(char);
  if (err) return i.reply({ content: err, flags: ephemeral });
  switch (action) {
    case 'mkt':
      return i.reply({ ...boardView(char), flags: ephemeral });
    case 'mktmine':
      return i.reply({ ...mineView(char), flags: ephemeral });
    case 'mktsell': {
      const items = ownedItems(char).filter((x) => TRADEABLE_IDS.includes(x.id));
      if (!items.length) return i.reply({ content: 'ไม่มีของที่ขายได้ในกระเป๋า', flags: ephemeral });
      return i.reply({
        content: '🏷️ เลือกของที่จะตั้งขาย',
        components: [select('mktsellitem', 'เลือกของ', items.map((x) => ({ label: `${x.def.name} ×${x.qty}`, value: x.id, emoji: x.def.emoji, description: `ราคาร้าน ${x.def.value}` })))],
        flags: ephemeral,
      });
    }
    case 'mktbuy':
      return i.reply({
        content: '📜 ตั้งรับซื้อ — ต้องการของประเภทไหน? (มัดจำเนื้อสดไว้กับตลาด)',
        components: [select('mktbuycat', 'เลือกประเภท', BUY_CATS.map((c) => ({ label: c.label, value: c.id, emoji: c.emoji })))],
        flags: ephemeral,
      });
  }
  return i.reply({ content: 'ปุ่มนี้ใช้ไม่ได้แล้ว', flags: ephemeral });
}

/** pns:mktfill / mktcancel / mktsellitem / mktbuycat / mktbuyitem */
export async function marketSelect(i: StringSelectMenuInteraction, char: Character, action: string): Promise<unknown> {
  const value = i.values[0]!;
  switch (action) {
    case 'mktfill': {
      const r = fillOrder(char, value);
      notifyOwner(i.client, r);
      const board = boardView(char);
      return i.update({ ...board, content: r.ok ? '' : `⚠️ ${r.error}`, embeds: [...(r.ok ? [resultEmbed(char, '🏛️ ตลาด', r.lines, COLORS.crimson)] : []), ...board.embeds] });
    }
    case 'mktcancel': {
      const r = cancelOrder(char, value);
      const mine = mineView(char);
      return i.update({ ...mine, content: r.ok ? '' : `⚠️ ${r.error}`, embeds: [...(r.ok ? [resultEmbed(char, '🏛️ ตลาด', r.lines, COLORS.crimson)] : []), ...mine.embeds] });
    }
    case 'mktsellitem':
      return i.showModal(qtyPriceModal('sell', value, itemCount(char, value)));
    case 'mktbuycat': {
      const cat = BUY_CATS.find((c) => c.id === value);
      const ids = TRADEABLE_IDS.filter((id) => cat?.types.includes(getItem(id)!.type));
      return i.update({
        content: `📜 ${cat?.emoji ?? ''} เลือกของที่ต้องการรับซื้อ`,
        components: [select('mktbuyitem', 'เลือกของ', ids.map((id) => ({ label: getItem(id)!.name, value: id, emoji: getItem(id)!.emoji, description: `ราคาร้าน ${getItem(id)!.value}` })))],
      });
    }
    case 'mktbuyitem':
      return i.showModal(qtyPriceModal('buy', value));
  }
  return i.update({ content: 'เมนูนี้ใช้ไม่ได้แล้ว', embeds: [], components: [] });
}

/** pnm:<sell|buy>:<item> */
export async function handleMarketModal(i: ModalSubmitInteraction): Promise<unknown> {
  const [, kind, item] = i.customId.split(':');
  const char = await requireActive(i);
  if (!char) return;
  const qty = Number(i.fields.getTextInputValue('qty').trim());
  const price = Number(i.fields.getTextInputValue('price').trim());
  const r = postOrder(char, kind === 'buy' ? 'buy' : 'sell', item!, qty, price);
  return i.reply({ ...resultPayload(char, kind === 'buy' ? '📜 ตั้งรับซื้อ' : '🏷️ ตั้งขาย', r), flags: ephemeral });
}

// ---------- slash ----------

export async function marketCommand(i: ChatInputCommandInteraction): Promise<unknown> {
  const char = await requireActive(i);
  if (!char) return;
  const sub = i.options.getSubcommand();
  if (sub === 'board') return i.reply({ ...boardView(char), flags: ephemeral });
  if (sub === 'mine') return i.reply({ ...mineView(char), flags: ephemeral });
  if (sub === 'sell' || sub === 'buy') {
    const r = postOrder(char, sub, i.options.getString('item', true), i.options.getInteger('qty', true), i.options.getInteger('price', true));
    return i.reply({ ...resultPayload(char, sub === 'buy' ? '📜 ตั้งรับซื้อ' : '🏷️ ตั้งขาย', r), flags: ephemeral });
  }
  return i.reply({ content: 'ไม่รู้จักคำสั่งนี้', flags: ephemeral });
}
