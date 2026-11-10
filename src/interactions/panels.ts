/**
 * Menu panels: a persistent message (image + buttons) posted in a locked channel.
 * Every click answers ephemerally, so the channel shows only the panel.
 *
 * customIds:
 *   pn:<action>                 panel button (shared by everyone)
 *   pn:hunt:<zoneId>            zone panel hunt button
 *   pn:buyq:<itemId>:<qty>      buy confirm (on the clicker's ephemeral message)
 *   pn:sellq:<itemId>:<qty|all> sell confirm
 *   pns:<use|equip|buy|sell|cook|travel|travelc> select menus on ephemeral messages
 */
import { fileURLToPath } from 'node:url';
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  type ButtonInteraction,
  type MessageCreateOptions,
  type StringSelectMenuInteraction,
} from 'discord.js';
import { itemCount, saveCharacter } from '../game/character.js';
import { getItem, itemLabel } from '../game/items.js';
import type { Character } from '../game/types.js';
import { CONTINENTS, citiesByContinent, currentZone, tierLabel, ZONES, type Continent } from '../game/zones.js';
import {
  buyItem,
  buyPrice,
  cookRecipe,
  drinkAction,
  upgradePayload,
  upgradeGear,
  type GearSlot,
  equipItem,
  inventoryPayload,
  needsText,
  ownedItems,
  prayAction,
  RECIPES,
  restAction,
  sellItem,
  sellPrice,
  shopPayload,
  homeError,
  shopError,
  shopStock,
  type ShopSrc,
  toReply,
  toUpdate,
  travelAction,
  travelPayload,
  useItem,
  type ActionResult,
} from '../commands/actions.js';
import { requireActive, requireCharacter } from '../commands/guard.js';
import { COLORS, profilePayload } from '../ui.js';
import { exploreStart, exploreView } from '../commands/explore.js';
import { openHunt } from './hunt.js';

export type PanelType = string;

interface PanelDef {
  label: string;
  image?: string;
  color: number;
  title: string;
  description: string;
  buttons: { id: string; label: string; emoji: string; style?: ButtonStyle }[][];
}

const STATIC_PANELS: Record<string, PanelDef> = {
  butchery: {
    label: '🔪 Butchery — เมนูตัวละคร',
    image: 'butchery.png',
    color: COLORS.blood,
    title: '🔪 ร้านเนื้อสาขา M.A.I.D.S',
    description: 'เมดสาวยืนนิ่งหลังเคาน์เตอร์ มีดอีโต้ยังหยดเลือด\n*"ต้องการอะไรคะ"*',
    buttons: [
      [
        { id: 'profile', label: 'โปรไฟล์', emoji: '📜', style: ButtonStyle.Danger },
        { id: 'inv', label: 'กระเป๋า', emoji: '🎒', style: ButtonStyle.Danger },
        { id: 'use', label: 'กิน/ใช้ของ', emoji: '🍽️' },
        { id: 'equip', label: 'สวมใส่', emoji: '🗡️' },
      ],
      [
        { id: 'travel', label: 'ออกสำรวจ', emoji: '🗺️', style: ButtonStyle.Success },
        { id: 'rest', label: 'พักผ่อน', emoji: '😴' },
        { id: 'pray', label: 'สวดภาวนา', emoji: '🙏' },
      ],
    ],
  },
  cafe: {
    label: '☕ Cafe — ร้านค้า',
    image: 'cafe.png',
    color: COLORS.crimson,
    title: '☕ Cafe',
    description: 'ดวงตาบนผนังกะพริบตามจังหวะเพลง\nเจ้าของร้านไร้ใบหน้ารอรับออเดอร์',
    buttons: [
      [
        { id: 'buy', label: 'ซื้อของ', emoji: '🛒', style: ButtonStyle.Danger },
        { id: 'sell', label: 'ขายของ', emoji: '⚖️', style: ButtonStyle.Danger },
        { id: 'inv', label: 'กระเป๋า', emoji: '🎒' },
      ],
    ],
  },
  bar: {
    label: '🍷 Bar — ร้าน/อัปเกรด',
    image: 'bar.png',
    color: COLORS.crimson,
    title: '🍷 Bar',
    description: 'เบาะหนังสีเลือดนก พื้นลายหมากรุกเปื้อนคราบ\nบาร์เทนเดอร์เช็ดแก้วรอคุณอยู่',
    buttons: [
      [
        { id: 'buy', label: 'ร้านค้า', emoji: '🛒', style: ButtonStyle.Danger },
        { id: 'upgrade', label: 'อัปเกรด', emoji: '⚒️', style: ButtonStyle.Danger },
        { id: 'drink', label: 'เครื่องดื่ม', emoji: '🍷' },
        { id: 'cook', label: 'ปรุงอาหาร', emoji: '🍳' },
      ],
    ],
  },
};

/** Every zone with a channel gets a location panel. */
const ZONE_PANELS: Record<string, PanelDef> = Object.fromEntries(
  Object.values(ZONES)
    .filter((z) => z.channel)
    .map((z) => [
      z.id,
      {
        label: `${z.emoji} ${z.name} — แผนที่`,
        image: z.image,
        color: COLORS.rot,
        title: `${z.emoji} ${z.name}`,
        description: `${z.desc.split('\n')[0]!}\n-# ${tierLabel(z)}`,
        buttons: [
          [
            ...(z.monsters.length ? [{ id: `hunt:${z.id}`, label: 'ออกล่า', emoji: '🎲', style: ButtonStyle.Danger }] : []),
            { id: `explore:${z.id}`, label: 'สำรวจ', emoji: '🔍', style: z.monsters.length ? ButtonStyle.Secondary : ButtonStyle.Danger },
            { id: 'use', label: 'กิน/ใช้ของ', emoji: '🍽️' },
            { id: 'profile', label: 'โปรไฟล์', emoji: '📜' },
          ],
          [
            { id: 'buy:field', label: 'ร้านค้า', emoji: '🛒' },
            { id: 'sell:field', label: 'ขายของ', emoji: '⚖️' },
            { id: 'travel', label: 'เดินทาง', emoji: '🧭' },
            { id: 'home', label: 'กลับ Rouge Land', emoji: '🏠' },
          ],
        ],
      } satisfies PanelDef,
    ]),
);

export const PANELS: Record<PanelType, PanelDef> = { ...STATIC_PANELS, ...ZONE_PANELS };

const ASSET_DIR = fileURLToPath(new URL('../../assets/panels/', import.meta.url));

export function panelMessage(type: PanelType): MessageCreateOptions {
  const p = PANELS[type];
  if (!p) throw new Error(`unknown panel ${type}`);
  const embed = new EmbedBuilder().setColor(p.color).setTitle(p.title).setDescription(p.description);
  const files = p.image ? [new AttachmentBuilder(ASSET_DIR + p.image, { name: p.image })] : [];
  if (p.image) embed.setImage(`attachment://${p.image}`);
  const components = p.buttons.map((row) =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      row.map((b) =>
        new ButtonBuilder()
          .setCustomId(`pn:${b.id}`)
          .setLabel(b.label)
          .setEmoji(b.emoji)
          .setStyle(b.style ?? ButtonStyle.Secondary),
      ),
    ),
  );
  return { embeds: [embed], files, components };
}

export const isPanelMessage = (customIds: string[]) => customIds.some((id) => id.startsWith('pn:'));

// ---------- pickers (ephemeral) ----------

const ephemeral = MessageFlags.Ephemeral;

function select(id: string, placeholder: string, options: { label: string; value: string; description?: string; emoji?: string }[]) {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`pns:${id}`)
      .setPlaceholder(placeholder)
      .addOptions(
        options.slice(0, 25).map((o) => ({
          label: o.label.slice(0, 100),
          value: o.value,
          description: o.description?.slice(0, 100),
          emoji: o.emoji,
        })),
      ),
  );
}

function itemPicker(char: Character, kind: 'use' | 'equip' | 'sell', src: ShopSrc = 'home') {
  const types = kind === 'use' ? (['consumable'] as const) : kind === 'equip' ? (['weapon', 'armor'] as const) : undefined;
  const items = ownedItems(char, types ? [...types] : undefined);
  if (items.length === 0) return null;
  const placeholder = kind === 'use' ? 'เลือกของที่จะกิน/ใช้' : kind === 'equip' ? 'เลือกอาวุธหรือเกราะ' : 'เลือกของที่จะขาย';
  return select(
    kind === 'sell' && src === 'field' ? 'sell:field' : kind,
    placeholder,
    items.map((x) => ({
      label: `${x.def.name} ×${x.qty}`,
      value: x.id,
      emoji: x.def.emoji,
      description:
        kind === 'sell'
          ? `ขายได้ ${sellPrice(char, x.id)} เนื้อสด/ชิ้น`
          : kind === 'equip' && (char.equipped.weapon === x.id || char.equipped.armor === x.id)
            ? 'สวมอยู่'
            : x.def.description,
    })),
  );
}

function buyPicker(char: Character, src: ShopSrc) {
  return select(
    src === 'field' ? 'buy:field' : 'buy',
    'เลือกของที่จะซื้อ',
    shopStock(char, src).map((id) => ({ label: `${getItem(id)!.name} — ${buyPrice(char, id)} เนื้อสด`, value: id, emoji: getItem(id)!.emoji, description: getItem(id)!.description })),
  );
}

function cookPicker() {
  return select(
    'cook',
    'เลือกสูตรอาหาร',
    RECIPES.map((r) => ({ label: r.name, value: r.id, emoji: getItem(r.makes)!.emoji, description: Object.entries(r.needs).map(([id, n]) => `${getItem(id)!.name}×${n}`).join(' + ') })),
  );
}

function qtyRow(kind: 'buyq' | 'sellq', id: string, qtys: (number | 'all')[], src: ShopSrc) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    qtys.map((q) =>
      new ButtonBuilder()
        .setCustomId(`pn:${kind}:${id}:${q}${src === 'field' ? ':field' : ''}`)
        .setLabel(q === 'all' ? 'ทั้งหมด' : `×${q}`)
        .setStyle(kind === 'buyq' ? ButtonStyle.Success : ButtonStyle.Danger),
    ),
  );
}

/**
 * Travel picker: continent dropdown, then that continent's city dropdown.
 * (A message holds max 5 rows, so one dropdown per continent doesn't fit.)
 */
function cityPickers(char: Character, continent?: Continent) {
  const here = currentZone(char);
  const pick = continent ?? here.continent;
  const groups = citiesByContinent();
  const rows = [
    select(
      'travelc',
      'เลือกทวีป',
      groups.map(([c, zs]) => ({
        label: `${CONTINENTS[c].name}${c === here.continent ? ' (อยู่ที่นี่)' : ''}`,
        value: c,
        emoji: CONTINENTS[c].emoji,
        description: `${zs.length} เมือง · ${CONTINENTS[c].icon}`,
      })),
    ),
  ];
  const zs = groups.find(([c]) => c === pick)?.[1];
  if (zs)
    rows.push(
      select(
        `travel:${pick}`,
        `${CONTINENTS[pick!].emoji} ${CONTINENTS[pick!].name} — เลือกเมือง`,
        zs.map((z) => ({
          label: z.id === here.id ? `${z.name} (อยู่ที่นี่)` : z.name,
          value: z.id,
          emoji: z.emoji,
          description: z.id === here.id ? '📍 คุณอยู่ที่นี่' : tierLabel(z),
        })),
      ),
    );
  return rows;
}

function upgradeRow(char: Character) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('pn:upg:weapon').setLabel('อัปอาวุธ').setEmoji('🗡️').setStyle(ButtonStyle.Danger).setDisabled(!char.equipped.weapon),
    new ButtonBuilder().setCustomId('pn:upg:armor').setLabel('อัปเกราะ').setEmoji('🛡️').setStyle(ButtonStyle.Danger).setDisabled(!char.equipped.armor),
  );
}

// ---------- handlers ----------

/** Panel buttons: open an ephemeral view for the clicker. */
export async function handlePanelButton(i: ButtonInteraction): Promise<unknown> {
  const [, action, arg, qtyArg, srcArg] = i.customId.split(':');

  if (action === 'profile' || action === 'inv') {
    const char = await requireCharacter(i);
    if (!char) return;
    saveCharacter(char); // persist regen
    await i.deferReply({ flags: ephemeral }); // card render can exceed the 3s window on small hosts
    return i.editReply(await (action === 'inv' ? inventoryPayload(char) : profilePayload(char)));
  }

  const char = await requireActive(i);
  if (!char) return;

  switch (action) {
    case 'hunt':
      return openHunt(i, arg!);
    case 'explore': {
      const step = exploreStart(char, arg); // sync: mutate + save before any await
      if (step.kind === 'error') return i.reply({ content: step.content, flags: ephemeral });
      await i.deferReply({ flags: ephemeral });
      return i.editReply(await exploreView(char, step));
    }
    case 'home': {
      const r = travelAction(char, 'rouge_land');
      return i.reply(toReply(r, true));
    }
    case 'upgrade':
      if (homeError(char)) return i.reply({ content: homeError(char), flags: ephemeral });
      await i.deferReply({ flags: ephemeral });
      return i.editReply({ ...(await upgradePayload(char)), components: [upgradeRow(char)] });
    case 'upg': {
      const r = upgradeGear(char, arg as GearSlot);
      await i.deferUpdate();
      const v = await upgradePayload(char);
      return i.editReply({ content: r.ok ? '' : `⚠️ ${r.content}`, embeds: [...v.embeds, ...(r.embeds ?? [])], files: v.files, components: [upgradeRow(char)] });
    }
    case 'drink':
      return i.reply(toReply(drinkAction(char), true));
    case 'travel': {
      await i.deferReply({ flags: ephemeral }); // map render can exceed the 3s window
      return i.editReply({ ...(await travelPayload(char, currentZone(char).continent)), components: cityPickers(char) });
    }
    case 'go': {
      const r = travelAction(char, arg!);
      if (!r.ok) return i.reply({ content: r.content, flags: ephemeral });
      return i.update({ ...toUpdate(r), components: [] });
    }
    case 'rest':
      return i.reply(toReply(restAction(char), true));
    case 'pray':
      return i.reply(toReply(prayAction(char), true));
    case 'use':
    case 'equip':
    case 'sell': {
      const src: ShopSrc = arg === 'field' ? 'field' : 'home';
      if (action === 'sell' && shopError(char, src)) return i.reply({ content: shopError(char, src), flags: ephemeral });
      const row = itemPicker(char, action, src);
      if (!row) return i.reply({ content: action === 'equip' ? 'ไม่มีอาวุธหรือเกราะในกระเป๋า' : 'ไม่มีของที่ใช้ได้ในกระเป๋า', flags: ephemeral });
      return i.reply({ content: `🥩 ${char.flesh} เนื้อสด`, components: [row], flags: ephemeral });
    }
    case 'buy': {
      const src: ShopSrc = arg === 'field' ? 'field' : 'home';
      const err = shopError(char, src);
      if (err) return i.reply({ content: err, flags: ephemeral });
      await i.deferReply({ flags: ephemeral });
      return i.editReply({ ...(await shopPayload(char, src)), components: [buyPicker(char, src)] });
    }
    case 'cook':
      if (homeError(char)) return i.reply({ content: homeError(char), flags: ephemeral });
      return i.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.rot)
            .setTitle('🍳 ครัวหลังบาร์')
            .setDescription(RECIPES.map((r) => `**${itemLabel(r.makes)}**\n-# ${needsText(r)}`).join('\n'))
            .setFooter({ text: char.role === 'bar' ? 'Bar Staff ปรุงไม่มีวันพลาด' : 'คนนอกบาร์มีโอกาสพลาด 40% (Miasma ฟุ้ง)' }),
        ],
        components: [cookPicker()],
        flags: ephemeral,
      });
    case 'buyq':
    case 'sellq': {
      const id = arg!;
      const src: ShopSrc = srcArg === 'field' ? 'field' : 'home';
      const r =
        action === 'buyq'
          ? buyItem(char, id, Number(qtyArg), src)
          : sellItem(char, id, qtyArg === 'all' ? itemCount(char, id) : Number(qtyArg), src);
      return i.update(withPicker(char, r, action === 'buyq' ? buyPicker(char, src) : itemPicker(char, 'sell', src)));
    }
  }
  return i.reply({ content: 'ปุ่มนี้ใช้ไม่ได้แล้ว', flags: ephemeral });
}

/** Show the result and keep a fresh picker under it, so players can keep going. */
function withPicker(char: Character, r: ActionResult, row: ActionRowBuilder<StringSelectMenuBuilder> | null) {
  const u = toUpdate(r);
  return { ...u, content: r.ok ? `🥩 ${char.flesh} เนื้อสด` : `⚠️ ${r.content}`, components: row ? [row] : [] };
}

export async function handlePanelSelect(i: StringSelectMenuInteraction): Promise<unknown> {
  const [, action, sub] = i.customId.split(':');
  const src: ShopSrc = sub === 'field' ? 'field' : 'home';
  const value = i.values[0]!;
  const active = await requireActive(i);
  if (!active) return;

  switch (action) {
    case 'travelc':
      await i.deferUpdate();
      return i.editReply({ ...(await travelPayload(active, value as Continent)), components: cityPickers(active, value as Continent) });
    case 'travel': {
      const r = travelAction(active, value);
      if (!r.ok) return i.reply({ content: r.content, flags: ephemeral });
      return i.update({ ...toUpdate(r), components: [] });
    }
    case 'use':
      return i.update(withPicker(active, useItem(active, value), itemPicker(active, 'use')));
    case 'equip':
      return i.update(withPicker(active, equipItem(active, value), itemPicker(active, 'equip')));
    case 'cook':
      return i.update(withPicker(active, cookRecipe(active, value), cookPicker()));
    case 'buy': {
      const def = getItem(value)!;
      const price = buyPrice(active, value);
      const e = new EmbedBuilder()
        .setColor(COLORS.blood)
        .setTitle(`🛒 ${itemLabel(value)}`)
        .setDescription(`${def.description}\n\nราคา **${price}** 🥩 ต่อชิ้น · คุณมี 🥩 ${active.flesh}`);
      return i.update({ content: '', embeds: [e], components: [qtyRow('buyq', value, [1, 3, 5, 10], src), buyPicker(active, src)] });
    }
    case 'sell': {
      const have = itemCount(active, value);
      if (have < 1) return i.update(withPicker(active, { ok: false, content: 'คุณไม่มีของชิ้นนี้แล้ว' }, itemPicker(active, 'sell', src)));
      const e = new EmbedBuilder()
        .setColor(COLORS.blood)
        .setTitle(`⚖️ ขาย ${itemLabel(value, have)}`)
        .setDescription(`ได้ **${sellPrice(active, value)}** 🥩 ต่อชิ้น`);
      const qtys: (number | 'all')[] = have > 1 ? [1, ...(have > 5 ? [5] : []), 'all'] : [1];
      const picker = itemPicker(active, 'sell', src);
      return i.update({ content: '', embeds: [e], components: [qtyRow('sellq', value, qtys, src), ...(picker ? [picker] : [])] });
    }
  }
  return i.update({ content: 'เมนูนี้ใช้ไม่ได้แล้ว', embeds: [], components: [] });
}
