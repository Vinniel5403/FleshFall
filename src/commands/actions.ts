import { isGod } from '../game/god.js';
/**
 * Shared player actions used by both slash commands and menu-panel buttons.
 * Each returns an ActionResult; callers decide reply vs update and visibility.
 */
import { EmbedBuilder, MessageFlags, type InteractionReplyOptions, type InteractionUpdateOptions } from 'discord.js';
import { balance } from '../config.js';
import { addItem, applyOutcome, consume, cooldownLeft, itemCount, removeItem, saveCharacter, setCooldown } from '../game/character.js';
import { chance } from '../game/engine.js';
import { mods } from '../game/icons.js';
import { getItem, itemLabel } from '../game/items.js';
import type { Character, ItemType, Outcome } from '../game/types.js';
import { CONTINENTS, citiesByContinent, currentZone, getZone, startTravel, TIERS, zoneLabel, type Continent } from '../game/zones.js';
import { renderInventoryCard, renderShopCard, renderUpgradeCard } from '../render/itemCards.js';
import { renderMapCard } from '../render/mapCard.js';
import { imagePayload, type ImagePayload } from '../render/view.js';
import { COLORS, fmtDuration, resultEmbed } from '../ui.js';
import { idleError } from './guard.js';

export interface ActionResult {
  ok: boolean;
  content?: string;
  embeds?: EmbedBuilder[];
}

const fail = (content: string): ActionResult => ({ ok: false, content });
const done = (...embeds: EmbedBuilder[]): ActionResult => ({ ok: true, embeds });

/** Failures are always ephemeral; successes only if `ephemeral`. */
export function toReply(r: ActionResult, ephemeral = false): InteractionReplyOptions {
  return { content: r.content, embeds: r.embeds ?? [], flags: !r.ok || ephemeral ? MessageFlags.Ephemeral : undefined };
}

/** `files: []` clears any card image left on the message being updated. */
export function toUpdate(r: ActionResult): InteractionUpdateOptions {
  return { content: r.content ?? '', embeds: r.embeds ?? [], files: [] };
}


// ---------- inventory ----------

const TYPE_TITLES: Record<ItemType, string> = {
  consumable: '🍽️ ของกิน / ยา',
  weapon: '🗡️ อาวุธ',
  armor: '🛡️ เกราะ',
  material: '⚙️ วัตถุดิบ',
  vintage: '📻 ของวินเทจจากโลกจริง',
};

export function inventoryEmbed(char: Character): EmbedBuilder {
  const groups: Partial<Record<ItemType, string[]>> = {};
  for (const [id, qty] of Object.entries(char.inventory)) {
    const def = getItem(id);
    const eq = char.equipped.weapon === id || char.equipped.armor === id ? ' *(สวมอยู่)*' : '';
    (groups[def?.type ?? 'material'] ??= []).push(`${itemLabel(id, qty)}${eq}`);
  }
  const embed = new EmbedBuilder()
    .setColor(COLORS.bone)
    .setTitle(`🎒 กระเป๋าของ ${char.name}`)
    .setFooter({ text: `🥩 ${char.flesh} เนื้อสด` });
  const entries = Object.entries(groups) as [ItemType, string[]][];
  if (entries.length === 0) embed.setDescription('*ว่างเปล่า มีแต่คราบเลือด*');
  for (const [type, lines] of entries) embed.addFields({ name: TYPE_TITLES[type], value: lines.join('\n').slice(0, 1024) });
  return embed;
}

export function inventoryPayload(char: Character): Promise<ImagePayload> {
  return imagePayload('inventory', COLORS.bone, () => renderInventoryCard(char), () => [inventoryEmbed(char)]);
}

/** Inventory entries of the given types, for pickers. */
export function ownedItems(char: Character, types?: ItemType[]) {
  return Object.entries(char.inventory)
    .map(([id, qty]) => ({ id, qty, def: getItem(id) }))
    .filter((x): x is { id: string; qty: number; def: NonNullable<typeof x.def> } => !!x.def && (!types || types.includes(x.def.type)));
}

export function useItem(char: Character, id: string): ActionResult {
  const lines = consume(char, id);
  if (!lines) return fail('ใช้ไม่ได้ หรือไม่มีของชิ้นนี้');
  saveCharacter(char);
  return done(resultEmbed(char, `${char.name} ใช้ ${itemLabel(id)}`, lines.length ? lines : ['ไม่มีอะไรเกิดขึ้น']));
}

export function equipItem(char: Character, id: string): ActionResult {
  const def = getItem(id);
  if (!def || (def.type !== 'weapon' && def.type !== 'armor')) return fail('สวมไม่ได้');
  if (itemCount(char, id) < 1) return fail('คุณไม่มีของชิ้นนี้');
  const prev = char.equipped[def.type];
  char.equipped[def.type] = id;
  saveCharacter(char);
  return done(resultEmbed(char, `🗡️ ${char.name} สวม ${itemLabel(id)}`, prev && prev !== id ? [`ถอด ${itemLabel(prev)} ออก`] : [], COLORS.bone));
}

// ---------- shop ----------

/** Branch butchery stock (Rouge Land only). */
export const STOCK = ['bandage', 'alchemy_salve', 'blood_wine', 'fetal_flesh', 'fresh_cut', 'wild_flour', 'lighter', 'leather_coat', 'bone_saw', 'rusted_armor', 'sigil'];

export const buyPrice = (c: Character, id: string) => Math.ceil((getItem(id)?.value ?? 0) * (c.role === 'patron' ? 0.75 : 1));
export const sellPrice = (c: Character, id: string) => {
  const def = getItem(id);
  if (!def) return 0;
  // Patrons pay full for real-world relics; maids grade meat perfectly
  const base = def.type === 'vintage' ? 1 : 0.5;
  return Math.floor(def.value * base * (c.role === 'maid' ? 1.5 : 1));
};

/** Old Realm continent shops — each city sells its continent's stock. */
export const CONTINENT_STOCK: Record<Continent, string[]> = {
  europe: ['bandage', 'absinthe', 'blood_wine', 'walking_cane', 'kris', 'leather_coat', 'lighter'],
  asia: ['bandage', 'spice_jerky', 'instant_noodle', 'alchemy_salve', 'carving_knife', 'sigil'],
  america: ['bandage', 'canned_beans', 'grilled_meat', 'leather_coat', 'old_shotgun', 'lighter'],
  south_america: ['bandage', 'mate_tea', 'fetal_flesh', 'bone_club', 'blood_apron'],
  africa: ['myrrh_balm', 'alchemy_salve', 'wild_flour', 'bone_saw', 'sigil'],
  australia: ['eucalyptus_oil', 'alchemy_salve', 'fresh_cut', 'rusted_armor'],
  antarctica: ['whale_blubber', 'fresh_cut', 'alchemy_salve', 'rusted_armor', 'old_shotgun'],
};

/** home = Rouge Land shops (cafe/bar/butchery) · field = continent shop in an Old Realm city. */
export type ShopSrc = 'home' | 'field';
export const autoSrc = (c: Character): ShopSrc => (c.location === 'rouge_land' ? 'home' : 'field');

/** Rouge Land facilities (shop, bar, upgrades, cooking) need you to be home. */
export function homeError(char: Character): string | undefined {
  if (isGod(char)) return undefined;
  if (char.traveling) {
    return char.traveling.to === 'rouge_land' ? '🧭 กำลังเดินทางกลับ Rouge Land — รอให้ถึงก่อน' : '🧭 คุณกำลังเดินทางอยู่ใน Old Realm — ร้านใน Rouge Land ใช้ไม่ได้';
  }
  if (char.location === 'cypress') {
    return `🟥 คุณอยู่บน **Cypress Isle** (เข้ามาทางประตูสีแดง) — ร้านใน Rouge Land ใช้ไม่ได้
สำรวจบนเกาะเพื่อหาคนพายเรือ หรือกด 🏠 กลับ Rouge Land`;
  }
  if (char.location !== 'rouge_land') {
    return `🗺️ คุณออกสำรวจอยู่ที่ **${currentZone(char).name}** — ร้านใน Rouge Land ใช้ไม่ได้
ใช้ 🛒 ร้านประจำทวีปในห้องเมือง หรือกด 🏠 กลับ Rouge Land`;
  }
  return undefined;
}

/** Continent shop: must be standing in an Old Realm city. */
export function fieldError(char: Character): string | undefined {
  if (char.traveling) return '🧭 กำลังเดินทาง — ร้านอยู่ในเมือง รอให้ถึงก่อน';
  if (char.location === 'cypress') {
    return `🟥 คุณอยู่บน **Cypress Isle** (เข้ามาทางประตูสีแดง) — บนเกาะไม่มีร้าน
กด ⚔️ สำรวจบนเกาะเพื่อหาคนพายเรือ / ประตูดำ หรือใช้ 🧭 เดินทางไปเมืองใน Old Realm`;
  }
  if (!currentZone(char).continent) return '🛒 ร้านประจำทวีปอยู่ในเมืองของ Old Realm — กด 🗺️ ออกสำรวจ ที่ Butchery';
  return undefined;
}

export const shopError = (char: Character, src: ShopSrc) => (src === 'home' ? homeError(char) : fieldError(char));

export function shopStock(char: Character, src: ShopSrc): string[] {
  if (src === 'home') return STOCK;
  const c = currentZone(char).continent;
  return c ? CONTINENT_STOCK[c] : [];
}

export function shopEmbed(char: Character, src: ShopSrc = autoSrc(char)): EmbedBuilder {
  const z = currentZone(char);
  const title =
    src === 'home' ? '🏪 ร้านของ M.A.I.D.S — Grade D ยิ้มให้คุณอย่างไร้อารมณ์' : `🛒 ร้านประจำ ${z.continent ? CONTINENTS[z.continent].name : ''} — ${z.emoji} ${z.name}`;
  const stock = shopStock(char, src);
  return new EmbedBuilder()
    .setColor(COLORS.blood)
    .setTitle(title)
    .setDescription((src === 'field' ? '*พ่อค้าเงาไร้หน้าวางของบนผ้าเปื้อนเลือด รับแต่เนื้อสด*\n\n' : '') + stock.map((id) => `${itemLabel(id)} — **${buyPrice(char, id)}** 🥩\n-# ${getItem(id)!.description}`).join('\n'))
    .setFooter({
      text: `คุณมี 🥩 ${char.flesh}${char.role === 'maid' ? ' · Maid ขายได้ +50%' : ''}${char.role === 'patron' ? ' · Patron ลด 25%' : ''}`,
    });
}

export function shopPayload(char: Character, src: ShopSrc = autoSrc(char), extraNote?: string): Promise<ImagePayload> {
  const z = currentZone(char);
  const ct = z.continent ? CONTINENTS[z.continent] : undefined;
  const notes = [char.role === 'maid' ? 'Maid ขายได้ +50%' : '', char.role === 'patron' ? 'Patron ลด 25%' : '', extraNote ?? ''].filter(Boolean);
  return imagePayload(
    'shop',
    COLORS.blood,
    () =>
      renderShopCard(char, {
        en: src === 'home' ? 'M.A.I.D.S STORE' : `${(ct?.name ?? 'FIELD').toUpperCase()} MARKET`,
        th: src === 'home' ? 'ร้านของ M.A.I.D.S' : `ร้านประจำทวีป · ${z.name}`,
        flavor: src === 'home' ? 'Grade D ยิ้มให้คุณอย่างไร้อารมณ์' : 'พ่อค้าเงาไร้หน้าวางของบนผ้าเปื้อนเลือด รับแต่เนื้อสด',
        stock: shopStock(char, src).map((id) => ({ id, price: buyPrice(char, id) })),
        notes,
      }),
    () => [shopEmbed(char, src)],
  );
}

export function buyItem(char: Character, id: string, qty: number, src: ShopSrc = autoSrc(char)): ActionResult {
  const err = shopError(char, src);
  if (err) return fail(err);
  if (!shopStock(char, src).includes(id)) return fail('ร้านนี้ไม่มีของชิ้นนี้');
  const cost = isGod(char) ? 0 : buyPrice(char, id) * qty;
  if (char.flesh < cost) return fail(`เนื้อสดไม่พอ ต้องการ ${cost} มี ${char.flesh}`);
  char.flesh -= cost;
  addItem(char, id, qty);
  saveCharacter(char);
  return done(resultEmbed(char, '🏪 ซื้อของ', [`📦 +${itemLabel(id, qty)}`, `🥩 -${cost} เนื้อสด (เหลือ ${char.flesh})`], COLORS.blood));
}

export function sellItem(char: Character, id: string, qty: number, src: ShopSrc = autoSrc(char)): ActionResult {
  const err = shopError(char, src);
  if (err) return fail(err);
  const n = Math.min(qty, itemCount(char, id));
  if (n < 1) return fail('คุณไม่มีของชิ้นนี้');
  if (!sellPrice(char, id)) return fail('ร้านไม่รับซื้อของชิ้นนี้');
  const price = sellPrice(char, id) * n;
  removeItem(char, id, n);
  char.flesh += price;
  saveCharacter(char);
  return done(resultEmbed(char, '⚖️ ขายของ', [`🗑️ -${itemLabel(id, n)}`, `🥩 +${price} เนื้อสด (มี ${char.flesh})`], COLORS.blood));
}

// ---------- cooking ----------

export interface Recipe {
  id: string;
  name: string;
  needs: Record<string, number>;
  makes: string;
}

/** From "สูตรลับตำหรับโลกเก่า" (Archive 3) + the bar's specialty. */
export const RECIPES: Recipe[] = [
  { id: 'bourguignon', name: 'มีตบูร์กีญง', needs: { eye_fruit: 1, rotten_flesh: 1, blood_wine: 1, wild_flour: 1 }, makes: 'bourguignon' },
  { id: 'taragege', name: 'ทารกเกะ', needs: { fetal_flesh: 2, wild_flour: 1 }, makes: 'taragege' },
  { id: 'remnant_stew', name: 'สตูว์ถักทอเศษเนื้อ', needs: { rotten_flesh: 2 }, makes: 'remnant_stew' },
  { id: 'grilled_meat', name: 'เนื้อดิบย่างถ่าน', needs: { raw_meat: 2 }, makes: 'grilled_meat' },
];

export const needsText = (r: Recipe) => Object.entries(r.needs).map(([id, n]) => itemLabel(id, n)).join(' + ');

export function cookRecipe(char: Character, recipeId: string): ActionResult {
  const err = homeError(char) ?? idleError(char);
  if (err) return fail(err);
  const r = RECIPES.find((x) => x.id === recipeId);
  if (!r) return fail('ไม่มีสูตรนี้');
  const god = isGod(char);
  if (!god && Object.entries(r.needs).some(([id, n]) => itemCount(char, id) < n)) return fail(`วัตถุดิบไม่พอ — ต้องใช้ ${needsText(r)}`);
  if (!god) for (const [id, n] of Object.entries(r.needs)) removeItem(char, id, n);

  const isBar = char.role === 'bar' || god;
  if (!isBar && chance(0.4)) {
    const a = applyOutcome(char, { text: '', miasma: 10 });
    saveCharacter(char);
    return done(
      resultEmbed(char, `💥 ${r.name} ล้มเหลว`, ['เนื้อเน่าเดือดพลุ่งพล่าน Miasma ฟุ้งเต็มครัว — มีแค่คนของบาร์เท่านั้นที่ปรุงได้อย่างปลอดภัย', '', ...a.lines], COLORS.blood),
    );
  }
  const qty = isBar && chance(0.3) ? 2 : 1;
  addItem(char, r.makes, qty);
  const xp = applyOutcome(char, { text: '', xp: isBar ? 12 : 6 });
  saveCharacter(char);
  return done(
    resultEmbed(char, `🍳 ${char.name} ปรุง ${r.name}`, [
      isBar ? 'มือของคุณถักทอเศษเนื้อให้กลายเป็นอาหารที่บรรเทาคำสาป' : 'กลิ่นออกมาดีกว่าที่คิด',
      `📦 +${itemLabel(r.makes, qty)}`,
      ...xp.lines,
    ]),
  );
}

// ---------- rest / pray ----------

export function restAction(char: Character): ActionResult {
  const err = idleError(char);
  if (err) return fail(err);
  const left = cooldownLeft(char, 'rest');
  if (left > 0) return fail(`ยังพักไม่ได้ อีก ${fmtDuration(left)}`);

  const m = mods(char.icon);
  const mult = m.restMult ?? 1;
  const o: Outcome = { text: '' };
  const flavor: string[] = [];
  if (char.location === 'old_realm') {
    // sleep isn't needed here; body doesn't recover
    o.stamina = Math.ceil(char.maxStamina * 0.4 * mult);
    o.sanity = 5;
    flavor.push('ใน Old Realm การนอนไม่จำเป็น ร่างกายไม่ฟื้นฟู... แต่อย่างน้อยก็ได้หยุดวิ่ง');
  } else {
    o.stamina = Math.ceil(char.maxStamina * 0.5 * mult);
    o.sanity = 10;
    if (m.noNaturalHeal) flavor.push('💀 ร่างของสาวก Thanatos ไม่ฟื้นฟูเอง — ต้องใช้ยา');
    else o.hp = Math.ceil(char.maxHp * 0.5 * mult);
    flavor.push(char.location === 'rouge_land' ? 'คุณนอนในห้องพักสไตล์นีโอคลาสสิก กลิ่นเนื้อสดลอยมาจากโถงทางเดิน' : 'คุณพักพิงซากเสาหินกรีก ฟังเสียงคลื่นข้นเหมือนเลือด');
  }
  if (m.restMult && m.restMult < 1) flavor.push('🦌 ความทรมานของ Wendigo ไม่เคยหยุด — พักได้ผลครึ่งเดียว');
  const applied = applyOutcome(char, o);
  setCooldown(char, 'rest', balance.restCooldownMs);
  saveCharacter(char);
  return done(resultEmbed(char, `😴 ${char.name} พักผ่อน`, [...flavor, '', ...applied.lines]));
}

export function prayAction(char: Character): ActionResult {
  const left = cooldownLeft(char, 'pray');
  if (left > 0) return fail(`ยังสวดไม่ได้ อีก ${fmtDuration(left)}`);
  const h = 3 + Math.floor(Math.random() * 4);
  const applied = applyOutcome(char, { text: '', humanity: h, sanity: 8 });
  setCooldown(char, 'pray', 60 * 60_000);
  saveCharacter(char);
  return done(resultEmbed(char, `🙏 ${char.name} สวดภาวนา`, ['คุณท่องบท First Verses สรรเสริญรูปบูชา จิตใจสงบลง ความอยากถูกกดไว้', '', ...applied.lines]));
}

// ---------- bar ----------

const DRINK_COST = 8;

/** Bar drink: restores sanity. Free for bar staff. Rouge Land only. */
export function drinkAction(char: Character): ActionResult {
  const away = homeError(char);
  if (away) return fail(away);
  const left = cooldownLeft(char, 'drink');
  if (left > 0) return fail(`บาร์เทนเดอร์ส่ายหน้า — ดื่มได้อีกใน ${fmtDuration(left)}`);
  const free = char.role === 'bar' || isGod(char);
  if (!free && char.flesh < DRINK_COST) return fail(`เนื้อสดไม่พอ — แก้วละ ${DRINK_COST} 🥩`);
  if (!free) char.flesh -= DRINK_COST;
  const applied = applyOutcome(char, { text: '', sanity: 15, stamina: 2 });
  setCooldown(char, 'drink', 20 * 60_000);
  saveCharacter(char);
  return done(
    resultEmbed(
      char,
      `🍷 ${char.name} สั่งเครื่องดื่ม`,
      [
        'ไวน์โลหิตอุ่น ๆ ไหลลงคอ เสียงเพลงแจ๊สจากตู้เพลงกลบเสียงกระซิบในหัว',
        free ? '-# พนักงานบาร์ดื่มฟรี' : `🥩 -${DRINK_COST} เนื้อสด`,
        '',
        ...applied.lines,
      ],
      COLORS.crimson,
    ),
  );
}

// ---------- travel ----------

export function travelEmbed(char: Character): EmbedBuilder {
  const here = currentZone(char);
  const mins = Math.round(balance.travelMs / 60_000);
  const home = char.location === 'rouge_land';
  return new EmbedBuilder()
    .setColor(COLORS.bone)
    .setTitle(home ? '🗺️ ออกสำรวจ Old Realm' : '🧭 เดินทาง')
    .setDescription(
      [
        home
          ? 'ประตูหลังร้านเนื้อเปิดสู่ Old Realm ได้ทุกเมือง — เลือกปลายทาง แล้วคุณจะไปถึงทันที'
          : `ตอนนี้อยู่ที่ **${zoneLabel(here)}**`,
        '',
        citiesByContinent()
          .map(([c, zs]) => {
            const ct = CONTINENTS[c];
            const list = zs.map((z) => `${z.id === here.id ? '📍' : z.emoji} ${z.name} ${TIERS[z.tier ?? 'easy'].emoji}`).join(' · ');
            return `**${ct.emoji} ${ct.name}** — ${ct.icon}
${list}`;
          })
          .join('\n\n'),
        '',
        `-# ${Object.values(TIERS).map((t) => `${t.emoji} ${t.name} Lv ${t.rec}+`).join(' · ')}`,
        '',
        home
          ? `-# ออกจาก Rouge Land ถึงทันที · กลับมาใช้เวลา ${mins} นาที · ข้างนอกใช้ร้านใน Rouge Land ไม่ได้ มีแต่ร้านประจำทวีป`
          : `-# ข้ามเมือง / กลับ Rouge Land ใช้เวลา ${mins} นาที · ระหว่างทางล่า/สำรวจ/ซื้อของไม่ได้`,
      ].join('\n'),
    );
}

/** Travel picker as a world map (zoomed to `focus` once a continent is picked). City list lives in the dropdowns. */
export function travelPayload(char: Character, focus?: Continent): Promise<ImagePayload> {
  const mins = Math.round(balance.travelMs / 60_000);
  const home = char.location === 'rouge_land';
  const text = [
    home ? 'ประตูหลังร้านเนื้อเปิดสู่ Old Realm ได้ทุกเมือง — เลือกทวีป แล้วเลือกเมืองปลายทาง คุณจะไปถึงทันที' : `ตอนนี้อยู่ที่ **${zoneLabel(currentZone(char))}**`,
    `-# ${Object.values(TIERS).map((t) => `${t.emoji} ${t.name} Lv ${t.rec}+`).join(' · ')}`,
    home
      ? `-# ออกจาก Rouge Land ถึงทันที · กลับมาใช้เวลา ${mins} นาที · ข้างนอกใช้ร้านใน Rouge Land ไม่ได้ มีแต่ร้านประจำทวีป`
      : `-# ข้ามเมือง / กลับ Rouge Land ใช้เวลา ${mins} นาที · ระหว่างทางล่า/สำรวจ/ซื้อของไม่ได้`,
  ].join('\n');
  return imagePayload('map', COLORS.bone, () => renderMapCard(char, focus), () => [travelEmbed(char)], text);
}

export function travelAction(char: Character, to: string): ActionResult {
  const err = idleError(char);
  if (err) return fail(err);
  const fromHome = char.location === 'rouge_land';
  const r = startTravel(char, to);
  if (!r.ok) return fail(r.error);
  delete char.hunt; // any leftover door fades when you leave
  saveCharacter(char);
  const z = getZone(to)!;
  if (!char.traveling) {
    if (fromHome) {
      return done(
        resultEmbed(
          char,
          `🗺️ ${z.emoji} ${z.name}`,
          ['ประตูหลังร้านเนื้อเปิดออก อากาศเหม็นเปรี้ยวของ Old Realm ปะทะหน้า ถนนยืดยาวออกไปไม่สิ้นสุด', '', `-# ไปที่ห้อง **#${z.id.replace(/_/g, '-')}** เพื่อล่า/สำรวจ`],
          COLORS.bone,
        ),
      );
    }
    return done(resultEmbed(char, `⚡ ${z.emoji} ${z.name}`, ['พลังของ God ฉีกมิติ — คุณมาถึงทันที'], COLORS.bone));
  }
  const flavor =
    z.region === 'old_realm'
      ? 'คุณออกเดินบนถนนที่ยืดยาวกว่าโลกจริงสิบเท่า เมืองถัดไปยังอยู่อีกไกล'
      : 'คุณหันหลังให้ Old Realm มุ่งหน้ากลับ — กลิ่นเนื้อสดหอมหวานของ Le Fontaine de Sang ลอยมาแต่ไกล';
  const title = to === 'rouge_land' ? '🏠 เดินทางกลับ Rouge Land' : `🧭 ออกเดินทางไป ${z.emoji} ${z.name}`;
  return done(resultEmbed(char, title, [flavor, '', `⏳ ถึง <t:${Math.ceil(r.arriveAt / 1000)}:R> (<t:${Math.ceil(r.arriveAt / 1000)}:t>)`], COLORS.bone));
}

// ---------- upgrades (bar) ----------

export const MAX_GEAR_LEVEL = 5;
export type GearSlot = 'weapon' | 'armor';

/** Cost of raising equipment to level n. Weapons eat bone, armor eats hide (raw meat); fangs from +3. */
export function upgradeCost(slot: GearSlot, n: number): { flesh: number; items: Record<string, number> } {
  const items: Record<string, number> = slot === 'weapon' ? { bone: n * 2 } : { raw_meat: n * 2 };
  if (n >= 3) items.fiend_fang = n - 2;
  return { flesh: 15 * n, items };
}

export const gearLevel = (char: Character, id: string | undefined) => (id ? (char.gearLevels?.[id] ?? 0) : 0);

export function upgradeEmbed(char: Character): EmbedBuilder {
  const field = (slot: GearSlot) => {
    const id = char.equipped[slot];
    if (!id) return { name: slot === 'weapon' ? '🗡️ อาวุธ' : '🛡️ เกราะ', value: '*ไม่ได้สวม*' };
    const lv = gearLevel(char, id);
    const head = `${itemLabel(id)} **+${lv}**`;
    if (lv >= MAX_GEAR_LEVEL) return { name: slot === 'weapon' ? '🗡️ อาวุธ' : '🛡️ เกราะ', value: `${head} — เต็มขั้นแล้ว` };
    const c = upgradeCost(slot, lv + 1);
    const need = [`🥩 ${c.flesh}`, ...Object.entries(c.items).map(([it, n]) => `${itemLabel(it, n)} (มี ${itemCount(char, it)})`)].join(' · ');
    return { name: slot === 'weapon' ? '🗡️ อาวุธ' : '🛡️ เกราะ', value: `${head} → +${lv + 1} ${slot === 'weapon' ? '(พละ +1)' : '(ลดดาเมจ +1)'}
-# ${need}` };
  };
  return new EmbedBuilder()
    .setColor(COLORS.bone)
    .setTitle('⚒️ ช่างหลังบาร์')
    .setDescription('ช่างตาเดียวหยิบอาวุธของคุณขึ้นมาส่อง *"กระดูกกับเขี้ยว... เอามา แล้วข้าจะทำให้มันหิวกว่าเดิม"*')
    .addFields(field('weapon'), field('armor'))
    .setFooter({ text: `คุณมี 🥩 ${char.flesh} · อัปได้สูงสุด +${MAX_GEAR_LEVEL}` });
}

export function upgradePayload(char: Character): Promise<ImagePayload> {
  const slots = (['weapon', 'armor'] as const).map((slot) => {
    const id = char.equipped[slot];
    const lv = gearLevel(char, id);
    return { slot, id, lv, max: MAX_GEAR_LEVEL, cost: id && lv < MAX_GEAR_LEVEL ? upgradeCost(slot, lv + 1) : undefined };
  });
  return imagePayload('forge', COLORS.bone, () => renderUpgradeCard(char, slots), () => [upgradeEmbed(char)]);
}

export function upgradeGear(char: Character, slot: GearSlot): ActionResult {
  const away = homeError(char);
  if (away) return fail(away);
  const id = char.equipped[slot];
  if (!id) return fail(slot === 'weapon' ? 'ไม่ได้สวมอาวุธ' : 'ไม่ได้สวมเกราะ');
  const lv = gearLevel(char, id);
  if (lv >= MAX_GEAR_LEVEL) return fail('เต็มขั้นแล้ว');
  const c = upgradeCost(slot, lv + 1);
  const god = isGod(char);
  if (god) c.flesh = 0;
  if (char.flesh < c.flesh) return fail(`เนื้อสดไม่พอ ต้องการ ${c.flesh}`);
  const missing = god ? [] : Object.entries(c.items).filter(([it, n]) => itemCount(char, it) < n);
  if (missing.length) return fail(`วัตถุดิบไม่พอ — ต้องใช้ ${missing.map(([it, n]) => itemLabel(it, n)).join(', ')}`);
  char.flesh -= c.flesh;
  if (!god) for (const [it, n] of Object.entries(c.items)) removeItem(char, it, n);
  (char.gearLevels ??= {})[id] = lv + 1;
  saveCharacter(char);
  return done(resultEmbed(char, `⚒️ ${itemLabel(id)} +${lv + 1}`, ['ค้อนกระดูกกระทบโลหะ เสียงกรีดร้องเบา ๆ ดังออกมาจากตัวอาวุธ'], COLORS.bone));
}
