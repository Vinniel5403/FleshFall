/**
 * Player market (ตลาดมืดหลังบาร์): sell listings and buy requests between players.
 * Everything is escrowed when posted, so filling never needs the other player online.
 * Trading happens in Rouge Land only — loot has to be brought home first (see expedition.ts).
 *
 * Role hooks: Patrons hire — fillers of a Patron's buy request get a 20% tip on top,
 * and Patrons may keep more orders open.
 *
 * Sync on purpose: load both characters → mutate → save, never await in between.
 */
import { db } from '../db/index.js';
import { addItem, itemCount, loadCharacter, removeItem, saveCharacter } from './character.js';
import { isDev } from './dev.js';
import { getItem, itemLabel, TRADEABLE_IDS } from './items.js';
import { ROLES } from './roles.js';
import type { Character, MarketOrder } from './types.js';

export const ORDER_TTL_MS = 3 * 86_400_000;
export const PATRON_TIP = 0.2;
export const MAX_QTY = 99;
export const MAX_PRICE = 9999;
export const maxOrders = (c: Character) => (c.role === 'patron' ? 6 : 3);

export type MarketResult = { ok: true; lines: string[]; notify?: { userId: string; text: string } } | { ok: false; error: string };

const fail = (error: string): MarketResult => ({ ok: false, error });

/** Trading needs you standing in Rouge Land. */
export function marketError(char: Character): string | undefined {
  if (isDev(char)) return undefined;
  if (char.traveling || char.location !== 'rouge_land') {
    return '🏛️ ตลาดอยู่หลังบาร์ใน **Rouge Land** — ต้องกลับบ้านก่อน';
  }
  return undefined;
}

// ---------- listing ----------

/** Give back what an order holds in escrow. */
function refund(o: MarketOrder, owner: Character): void {
  if (o.kind === 'sell') addItem(owner, o.item, o.qty);
  else owner.flesh += o.qty * o.price;
}

/** Open orders, newest first. Expired ones are refunded and removed on the way. */
export function listOrders(now = Date.now()): MarketOrder[] {
  const out: MarketOrder[] = [];
  for (const o of db.allOrders()) {
    if (now - o.createdAt < ORDER_TTL_MS) {
      out.push(o);
      continue;
    }
    const owner = loadCharacter(o.owner);
    if (owner) {
      refund(o, owner);
      saveCharacter(owner);
    }
    db.deleteOrder(o.id);
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

export const myOrders = (userId: string) => listOrders().filter((o) => o.owner === userId);

/** "🫀 เนื้อล่าสด ×3 · 20 🥩/ชิ้น — 🎩 Lady X" */
export function orderLine(o: MarketOrder): string {
  const who = `${ROLES[o.ownerRole].emoji} ${o.ownerName}`;
  const tip = o.kind === 'buy' && o.ownerRole === 'patron' ? ' · 💰 ทิป +20%' : '';
  return `${itemLabel(o.item, o.qty)} · **${o.price}** 🥩/ชิ้น — ${who}${tip}`;
}

// ---------- post / fill / cancel ----------

export function postOrder(char: Character, kind: MarketOrder['kind'], item: string, qty: number, price: number): MarketResult {
  const err = marketError(char);
  if (err) return fail(err);
  const def = getItem(item);
  if (!def || !TRADEABLE_IDS.includes(item)) return fail('ของชิ้นนี้ซื้อขายไม่ได้');
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return fail(`จำนวนต้องเป็น 1–${MAX_QTY}`);
  if (!Number.isInteger(price) || price < 1 || price > MAX_PRICE) return fail(`ราคาต้องเป็น 1–${MAX_PRICE} เนื้อสดต่อชิ้น`);
  if (myOrders(char.userId).length >= maxOrders(char)) {
    return fail(`เปิดออเดอร์ได้สูงสุด ${maxOrders(char)} รายการ${char.role === 'patron' ? '' : ' (Patron ได้ 6)'} — ยกเลิกอันเก่าก่อน`);
  }
  if (kind === 'sell') {
    if (itemCount(char, item) < qty) return fail(`คุณมี ${itemLabel(item)} แค่ ${itemCount(char, item)} ชิ้น`);
    removeItem(char, item, qty);
  } else {
    const cost = qty * price;
    if (char.flesh < cost) return fail(`ต้องวางมัดจำ ${cost} 🥩 แต่คุณมี ${char.flesh}`);
    char.flesh -= cost;
  }
  const o: MarketOrder = {
    id: Math.random().toString(36).slice(2, 8),
    kind,
    owner: char.userId,
    ownerName: char.name,
    ownerRole: char.role,
    item,
    qty,
    price,
    createdAt: Date.now(),
  };
  saveCharacter(char);
  db.saveOrder(o);
  return {
    ok: true,
    lines: [
      kind === 'sell' ? `🏷️ ตั้งขาย ${itemLabel(item, qty)} ชิ้นละ **${price}** 🥩` : `📜 ตั้งรับซื้อ ${itemLabel(item, qty)} ชิ้นละ **${price}** 🥩`,
      kind === 'sell' ? '-# ของถูกฝากไว้กับตลาดแล้ว ขายได้เมื่อไหร่เนื้อสดเข้ากระเป๋าคุณทันที' : `-# มัดจำ ${qty * price} 🥩 ไว้กับตลาดแล้ว ใครส่งของมา ของเข้ากระเป๋าคุณทันที`,
      `-# หมดอายุใน 3 วัน (คืนของ/มัดจำอัตโนมัติ) · รหัส \`${o.id}\``,
    ],
  };
}

/** Fill as much of an order as the filler can (affordable / owned). */
export function fillOrder(filler: Character, id: string): MarketResult {
  const err = marketError(filler);
  if (err) return fail(err);
  const o = listOrders().find((x) => x.id === id);
  if (!o) return fail('ออเดอร์นี้ไม่มีแล้ว — อาจมีคนตัดหน้าไปก่อน');
  if (o.owner === filler.userId) return fail('นี่เป็นออเดอร์ของคุณเอง — ยกเลิกได้ที่ "ออเดอร์ของฉัน"');
  const owner = loadCharacter(o.owner);
  if (!owner) {
    db.deleteOrder(o.id);
    return fail('เจ้าของออเดอร์ไม่อยู่แล้ว ออเดอร์ถูกยกเลิก');
  }

  let n: number;
  const lines: string[] = [];
  let notify: string;
  if (o.kind === 'sell') {
    n = Math.min(o.qty, Math.floor(filler.flesh / o.price));
    if (n < 1) return fail(`เนื้อสดไม่พอ — ชิ้นละ ${o.price} 🥩 คุณมี ${filler.flesh}`);
    const cost = n * o.price;
    filler.flesh -= cost;
    owner.flesh += cost;
    addItem(filler, o.item, n);
    lines.push(`🛒 ซื้อ ${itemLabel(o.item, n)} จาก ${o.ownerName}`, `🥩 -${cost} เนื้อสด (เหลือ ${filler.flesh})`);
    notify = `🏛️ **${filler.name}** ซื้อ ${itemLabel(o.item, n)} ของคุณ — 🥩 +${cost} เนื้อสด`;
  } else {
    n = Math.min(o.qty, itemCount(filler, o.item));
    if (n < 1) return fail(`คุณไม่มี ${itemLabel(o.item)} ในกระเป๋า`);
    removeItem(filler, o.item, n);
    addItem(owner, o.item, n);
    const pay = n * o.price;
    const tip = o.ownerRole === 'patron' ? Math.ceil(pay * PATRON_TIP) : 0;
    filler.flesh += pay + tip;
    lines.push(`📦 ส่ง ${itemLabel(o.item, n)} ให้ ${o.ownerName}`, `🥩 +${pay} เนื้อสด${tip ? ` · 💰 ทิปจาก Patron +${tip}` : ''} (มี ${filler.flesh})`);
    notify = `🏛️ **${filler.name}** ส่ง ${itemLabel(o.item, n)} ตามออเดอร์ของคุณแล้ว — ของเข้ากระเป๋าแล้ว`;
  }

  o.qty -= n;
  if (o.qty <= 0) db.deleteOrder(o.id);
  else db.saveOrder(o);
  saveCharacter(filler);
  saveCharacter(owner);
  if (o.qty > 0) lines.push(`-# ออเดอร์ยังเหลืออีก ${o.qty} ชิ้น`);
  return { ok: true, lines, notify: { userId: owner.userId, text: notify } };
}

export function cancelOrder(char: Character, id: string): MarketResult {
  const o = db.getOrder(id);
  if (!o || o.owner !== char.userId) return fail('ไม่พบออเดอร์นี้');
  refund(o, char);
  db.deleteOrder(o.id);
  saveCharacter(char);
  return { ok: true, lines: [`❌ ยกเลิกออเดอร์ ${itemLabel(o.item, o.qty)}`, o.kind === 'sell' ? '📦 ของกลับเข้ากระเป๋าแล้ว' : `🥩 คืนมัดจำ ${o.qty * o.price}`] };
}
