/** Inventory, shop and upgrade cards. Callers pass pre-computed data (no commands/ imports here). */
import { gearAtk, gearDef } from '../game/character.js';
import { getItem } from '../game/items.js';
import type { Character, ItemType } from '../game/types.js';
import { art, background, box, C, canvas, diamond, fitText, font, logo, noEmoji, png, rgba, SCENE_ART, sectionHead, wrap, type Ctx } from './kit.js';

const W = 1200;
const PAD = 48;

const TYPE_ORDER: ItemType[] = ['weapon', 'armor', 'consumable', 'material', 'vintage'];
const TYPE_TITLE: Record<ItemType, string> = {
  weapon: 'อาวุธ',
  armor: 'เกราะ',
  consumable: 'ของกิน / ยา',
  material: 'วัตถุดิบ',
  vintage: 'ของวินเทจจากโลกจริง',
};

function groupHead(ctx: Ctx, label: string, y: number): void {
  diamond(ctx, PAD + 5, y - 7, 5, C.crimson);
  font(ctx, 20, 600);
  ctx.fillStyle = C.flesh;
  ctx.fillText(label, PAD + 20, y);
  const lw = ctx.measureText(label).width;
  const g = ctx.createLinearGradient(PAD + 36 + lw, 0, W - PAD, 0);
  g.addColorStop(0, 'rgba(230,184,162,.45)');
  g.addColorStop(1, 'rgba(230,184,162,0)');
  ctx.fillStyle = g;
  ctx.fillRect(PAD + 36 + lw, y - 7, W - PAD * 2 - 36 - lw, 1);
}

function footer(ctx: Ctx, h: number, left: string): void {
  ctx.fillStyle = C.hair;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(PAD, h - 66, W - PAD * 2, 1);
  ctx.globalAlpha = 1;
  font(ctx, 18, 500);
  ctx.fillStyle = C.flesh;
  ctx.fillText(left, PAD, h - 30);
  logo(ctx, W - PAD, h - 28);
}

function gearLine(char: Character, slot: 'weapon' | 'armor'): { emoji: string; name: string; effect: string } {
  const id = char.equipped[slot];
  const effect = slot === 'weapon' ? `พละ +${gearAtk(char)}` : `ลดดาเมจ ${gearDef(char)}`;
  if (!id) return { emoji: '', name: 'ไม่ได้สวม', effect };
  const it = getItem(id);
  const lv = char.gearLevels?.[id];
  return { emoji: it?.emoji ?? '', name: (it?.name ?? id) + (lv ? ` +${lv}` : ''), effect };
}

// ---------- inventory ----------

export async function renderInventoryCard(char: Character): Promise<Buffer> {
  const groups = new Map<ItemType, { id: string; qty: number }[]>();
  for (const [id, qty] of Object.entries(char.inventory)) {
    if (qty <= 0) continue;
    const t = getItem(id)?.type ?? 'material';
    (groups.get(t) ?? groups.set(t, []).get(t)!).push({ id, qty });
  }
  const COLS = 4, GAP = 14, TH = 72;
  const tw = (W - PAD * 2 - GAP * (COLS - 1)) / COLS;
  const order = TYPE_ORDER.filter((t) => groups.has(t));
  let H = 150 + 118 + 40;
  for (const t of order) H += 44 + Math.ceil(groups.get(t)!.length / COLS) * (TH + GAP);
  if (!order.length) H += 90;
  H += 90;

  const { cv, ctx } = canvas(W, H);
  background(ctx, W, H, { x: W / 2, y: 60, r: 520 });
  let y = sectionHead(ctx, 'INVENTORY', `กระเป๋าของ ${noEmoji(char.name)}`, W / 2, 72);

  // equipped strip
  y += 18;
  const half = (W - PAD * 2 - 24) / 2;
  (['weapon', 'armor'] as const).forEach((slot, i) => {
    const x = PAD + i * (half + 24);
    const g = gearLine(char, slot);
    box(ctx, x, y, half, 100, { line: rgba(C.crimson, 0.45) });
    font(ctx, 52);
    ctx.fillText(g.emoji || '·', x + 22, y + 68);
    font(ctx, 15);
    ctx.fillStyle = C.muted;
    ctx.fillText(`${slot === 'weapon' ? 'อาวุธที่ใช้' : 'เกราะที่สวม'} · ${g.effect}`, x + 98, y + 38);
    ctx.fillStyle = g.emoji ? C.bone : C.muted;
    fitText(ctx, g.name, x + 98, y + 72, half - 118, 24, 600);
  });
  y += 100 + 52;

  const equipped = new Set([char.equipped.weapon, char.equipped.armor].filter(Boolean));
  if (!order.length) {
    font(ctx, 22, 400);
    ctx.fillStyle = C.muted;
    ctx.textAlign = 'center';
    ctx.fillText('ว่างเปล่า มีแต่คราบเลือด', W / 2, y + 30);
    ctx.textAlign = 'left';
    y += 90;
  }
  for (const t of order) {
    groupHead(ctx, TYPE_TITLE[t], y);
    y += 22;
    groups.get(t)!.forEach(({ id, qty }, i) => {
      const x = PAD + (i % COLS) * (tw + GAP);
      const ty = y + Math.floor(i / COLS) * (TH + GAP);
      const it = getItem(id);
      const on = equipped.has(id);
      box(ctx, x, ty, tw, TH, { line: on ? rgba(C.crimson, 0.7) : C.line, fill: on ? 'rgba(60,10,14,.55)' : undefined });
      font(ctx, 34);
      ctx.fillText(it?.emoji ?? '❔', x + 14, ty + 48);
      ctx.fillStyle = C.bone;
      fitText(ctx, it?.name ?? id, x + 62, ty + (on ? 34 : 44), tw - 62 - 56, 18, 500);
      if (on) {
        font(ctx, 13, 500);
        ctx.fillStyle = C.crimson;
        ctx.fillText('สวมอยู่' + (char.gearLevels?.[id] ? ` · +${char.gearLevels[id]}` : ''), x + 62, ty + 56);
      }
      font(ctx, 20, 600);
      ctx.fillStyle = C.flesh;
      ctx.textAlign = 'right';
      ctx.fillText(`×${qty}`, x + tw - 14, ty + 44);
      ctx.textAlign = 'left';
    });
    y += Math.ceil(groups.get(t)!.length / COLS) * (TH + GAP) + 22;
  }
  footer(ctx, H, `🥩 ${char.flesh} เนื้อสด`);
  return png(cv);
}

// ---------- shop ----------

export interface ShopCardData {
  en: string;
  th: string;
  flavor?: string;
  stock: { id: string; price: number }[];
  notes: string[];
}

export async function renderShopCard(char: Character, d: ShopCardData): Promise<Buffer> {
  const COLS = 2, GAP = 16, TH = 112;
  const tw = (W - PAD * 2 - GAP) / COLS;
  const rows = Math.ceil(d.stock.length / COLS);
  const H = 150 + (d.flavor ? 40 : 0) + rows * (TH + GAP) + 110;
  const { cv, ctx } = canvas(W, H);
  background(ctx, W, H, { x: W / 2, y: 60, r: 520 });
  let y = sectionHead(ctx, d.en, d.th, W / 2, 72);
  if (d.flavor) {
    font(ctx, 17, 400);
    ctx.fillStyle = C.muted;
    ctx.textAlign = 'center';
    ctx.fillText(d.flavor, W / 2, y + 8);
    ctx.textAlign = 'left';
    y += 40;
  }
  y += 14;
  d.stock.forEach(({ id, price }, i) => {
    const x = PAD + (i % COLS) * (tw + GAP);
    const ty = y + Math.floor(i / COLS) * (TH + GAP);
    const it = getItem(id);
    const afford = char.flesh >= price;
    const owned = char.inventory[id] ?? 0;
    box(ctx, x, ty, tw, TH);
    font(ctx, 44);
    ctx.fillText(it?.emoji ?? '❔', x + 18, ty + 66);
    const tx = x + 86;
    const priceW = 110;
    ctx.fillStyle = C.bone;
    fitText(ctx, it?.name ?? id, tx, ty + 38, tw - (tx - x) - priceW - 10, 21, 600);
    font(ctx, 15, 400);
    ctx.fillStyle = C.muted;
    wrap(ctx, it?.description ?? '', tw - (tx - x) - priceW - 10, 2).forEach((ln, k) => ctx.fillText(ln, tx, ty + 64 + k * 21));
    // price
    ctx.textAlign = 'right';
    font(ctx, 30, 600);
    ctx.fillStyle = afford ? C.bone : rgba(C.crimson, 0.8);
    ctx.fillText(String(price), x + tw - 18, ty + 48);
    font(ctx, 14, 400);
    ctx.fillStyle = C.muted;
    ctx.fillText('🥩 เนื้อสด', x + tw - 18, ty + 70);
    if (owned) ctx.fillText(`มี ${owned}`, x + tw - 18, ty + 94);
    ctx.textAlign = 'left';
  });
  footer(ctx, H, [`🥩 คุณมี ${char.flesh}`, ...d.notes].join('   ·   '));
  return png(cv);
}

// ---------- upgrade ----------

export interface UpgradeSlotData {
  slot: 'weapon' | 'armor';
  id?: string;
  lv: number;
  max: number;
  /** Next level cost; undefined when maxed or nothing equipped. */
  cost?: { flesh: number; items: Record<string, number> };
}

export async function renderUpgradeCard(char: Character, slots: UpgradeSlotData[]): Promise<Buffer> {
  const H = 640;
  const { cv, ctx } = canvas(W, H);
  background(ctx, W, H, { x: W / 2, y: 80, r: 560 });
  let y = sectionHead(ctx, 'THE FORGE', 'ช่างหลังบาร์', W / 2, 72);
  font(ctx, 17, 400);
  ctx.fillStyle = C.muted;
  ctx.textAlign = 'center';
  ctx.fillText('“กระดูกกับเขี้ยว... เอามา แล้วข้าจะทำให้มันหิวกว่าเดิม”', W / 2, y + 8);
  ctx.textAlign = 'left';
  y += 44;

  const pw = (W - PAD * 2 - 28) / 2;
  const ph = H - y - 100;
  slots.forEach((s, i) => {
    const x = PAD + i * (pw + 28);
    box(ctx, x, y, pw, ph, { line: rgba(C.crimson, 0.35) });
    const it = s.id ? getItem(s.id) : undefined;
    font(ctx, 15, 500);
    ctx.fillStyle = C.muted;
    ctx.fillText(s.slot === 'weapon' ? 'อาวุธ  ·  พละ +1 ต่อขั้น' : 'เกราะ  ·  ลดดาเมจ +1 ต่อขั้น', x + 26, y + 40);
    if (!s.id) {
      font(ctx, 24, 500);
      ctx.fillStyle = C.muted;
      ctx.fillText('ไม่ได้สวม', x + 26, y + 110);
      return;
    }
    font(ctx, 64);
    ctx.fillText(it?.emoji ?? '❔', x + 24, y + 126);
    ctx.fillStyle = C.bone;
    fitText(ctx, it?.name ?? s.id, x + 112, y + 92, pw - 140, 26, 600);
    // level pips
    for (let k = 0; k < s.max; k++) diamond(ctx, x + 122 + k * 26, y + 118, 8, k < s.lv ? C.crimson : 'rgba(230,184,162,.35)', k >= s.lv);
    font(ctx, 18, 600);
    ctx.fillStyle = C.flesh;
    ctx.fillText(s.lv >= s.max ? `+${s.lv}  ·  เต็มขั้น` : `+${s.lv}  →  +${s.lv + 1}`, x + 122 + s.max * 26 + 10, y + 125);

    let cy = y + 178;
    ctx.fillStyle = C.hair;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(x + 26, cy - 24, pw - 52, 1);
    ctx.globalAlpha = 1;
    if (!s.cost) {
      font(ctx, 19, 400);
      ctx.fillStyle = C.muted;
      ctx.fillText('ช่างส่ายหน้า — มันหิวที่สุดเท่าที่จะเป็นได้แล้ว', x + 26, cy + 10);
      return;
    }
    font(ctx, 15, 500);
    ctx.fillStyle = C.muted;
    ctx.fillText('ค่าตีขั้นถัดไป', x + 26, cy);
    cy += 34;
    const rows: [string, string, number, number][] = [
      ['🥩', 'เนื้อสด', s.cost.flesh, char.flesh],
      ...Object.entries(s.cost.items).map(([id, n]) => [getItem(id)?.emoji ?? '❔', getItem(id)?.name ?? id, n, char.inventory[id] ?? 0] as [string, string, number, number]),
    ];
    for (const [emo, name, need, have] of rows) {
      const ok = have >= need;
      font(ctx, 22);
      ctx.fillText(emo, x + 26, cy);
      font(ctx, 19, 500);
      ctx.fillStyle = C.bone;
      ctx.fillText(name, x + 62, cy);
      ctx.textAlign = 'right';
      font(ctx, 19, 600);
      ctx.fillStyle = ok ? C.good : C.crimson;
      ctx.fillText(`${have} / ${need}`, x + pw - 26, cy);
      ctx.textAlign = 'left';
      cy += 36;
    }
  });
  footer(ctx, H, `🥩 คุณมี ${char.flesh}  ·  อัปได้สูงสุด +${slots[0]?.max ?? 5}`);
  return png(cv);
}
