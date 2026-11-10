/** Profile card — character portrait + stats. */
import { balance } from '../config.js';
import { gearAtk, gearDef, humanityTier, statMod } from '../game/character.js';
import { ICONS } from '../game/icons.js';
import { getItem } from '../game/items.js';
import { maidGrade, ROLES } from '../game/roles.js';
import type { Character, RoleId, StatKey } from '../game/types.js';
import { STAT_NAMES } from '../game/world.js';
import { currentZone, getZone } from '../game/zones.js';
import {
  art,
  background,
  bar,
  box,
  C,
  canvas,
  diamond,
  divider,
  doubleFrame,
  fitText,
  font,
  ICON_ART,
  logo,
  noEmoji,
  png,
  ROLE_ART,
  spaced,
  taper,
  type Ctx,
} from './kit.js';

const ROLE_EN: Record<RoleId, string> = {
  maid: 'MAID',
  hound: 'HOUND',
  bar: 'BAR STAFF',
  patron: 'PATRON',
  outsider: 'OUTSIDER',
  survivor: 'SURVIVOR',
};

function statBox(ctx: Ctx, x: number, y: number, w: number, h: number, key: StatKey, base: number, mod: number): void {
  box(ctx, x, y, w, h);
  font(ctx, 15, 700, 'Cinzel');
  ctx.fillStyle = C.crimson;
  spaced(ctx, key.toUpperCase(), x + w / 2, y + 30, 4, 'center');
  ctx.textAlign = 'center';
  font(ctx, 46, 600);
  ctx.fillStyle = C.bone;
  ctx.fillText(String(base), x + w / 2, y + 82);
  font(ctx, 16, 400);
  ctx.fillStyle = C.muted;
  ctx.fillText(`${STAT_NAMES[key]}  ·  เช็ค ${mod >= 0 ? '+' : ''}${mod}`, x + w / 2, y + h - 16);
  ctx.textAlign = 'left';
}

function gearName(char: Character, slot: 'weapon' | 'armor'): string {
  const id = char.equipped[slot];
  if (!id) return '—';
  const lv = char.gearLevels?.[id];
  const it = getItem(id);
  return `${it?.emoji ?? ''} ${it?.name ?? id}`.trim() + (lv ? ` +${lv}` : '');
}

function statusText(char: Character): string {
  if (char.traveling) return `กำลังเดินทางไป ${noEmoji(getZone(char.traveling.to)?.name ?? char.traveling.to)}`;
  const z = currentZone(char);
  const where = z.region === 'old_realm' ? `${noEmoji(z.name)} · Old Realm` : noEmoji(z.name);
  if (char.run) return `${where} · ในดันเจียน ห้อง ${char.run.depth}/${char.run.maxDepth}`;
  if (char.hunt && !char.hunt.won) return `${where} · กำลังล่า`;
  return where;
}

export const CARD_W = 1200;
export const CARD_H = 720;

export async function renderProfileCard(char: Character): Promise<Buffer> {
  const role = ROLES[char.role];
  const icon = ICONS[char.icon];
  const [portrait, iconImg] = await Promise.all([art(ROLE_ART[char.role]), art(ICON_ART[char.icon])]);
  const { cv, ctx } = canvas(CARD_W, CARD_H);
  const accent = char.fiend ? C.blood : C.crimson;

  background(ctx, CARD_W, CARD_H);

  // Icon art — faded, right side, behind the stats
  if (iconImg) {
    const h = CARD_H * 1.05;
    const w = (iconImg.width / iconImg.height) * h;
    ctx.save();
    ctx.globalAlpha = char.fiend ? 0.22 : 0.13;
    ctx.filter = 'grayscale(1)';
    ctx.drawImage(iconImg, CARD_W - w * 0.85, -CARD_H * 0.02, w, h);
    ctx.restore();
    const fade = ctx.createLinearGradient(440, 0, CARD_W, 0);
    fade.addColorStop(0, C.bg);
    fade.addColorStop(0.45, 'rgba(11,6,6,.55)');
    fade.addColorStop(1, 'rgba(11,6,6,.15)');
    ctx.fillStyle = fade;
    ctx.fillRect(440, 0, CARD_W - 440, CARD_H);
  }

  // red glow behind the portrait
  const PX = 40, PY = 40, PW = 380, PH = 640;
  const glow = ctx.createRadialGradient(PX + PW / 2, PY + PH * 0.55, 20, PX + PW / 2, PY + PH * 0.55, PW * 0.9);
  glow.addColorStop(0, char.fiend ? 'rgba(120,0,0,.55)' : 'rgba(163,18,27,.38)');
  glow.addColorStop(1, 'rgba(163,18,27,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, PX + PW + 120, CARD_H);

  // portrait panel
  ctx.fillStyle = 'rgba(20,9,9,.6)';
  ctx.fillRect(PX, PY, PW, PH);
  if (portrait) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(PX + 1, PY + 1, PW - 2, PH - 2);
    ctx.clip();
    const h = PH * 1.02;
    let w = (portrait.width / portrait.height) * h;
    let dh = h;
    if (w > PW * 1.35) {
      w = PW * 1.35;
      dh = (portrait.height / portrait.width) * w;
    }
    ctx.shadowColor = 'rgba(0,0,0,.8)';
    ctx.shadowBlur = 30;
    if (char.fiend) ctx.filter = 'grayscale(1) contrast(1.25) brightness(.8)';
    ctx.drawImage(portrait, PX + (PW - w) / 2, PY + PH - dh, w, dh);
    if (char.fiend) {
      // blood-red multiply tint: the remnant is gone, only the Fiend remains
      ctx.filter = 'none';
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgb(190,20,24)';
      ctx.fillRect(PX, PY, PW, PH);
    }
    ctx.restore();
  } else {
    font(ctx, 26, 700, 'Cinzel');
    ctx.fillStyle = C.muted;
    spaced(ctx, 'NO RECORD', PX + PW / 2, PY + PH / 2, 6, 'center');
  }
  // bottom fade + role plate
  const bf = ctx.createLinearGradient(0, PY + PH - 170, 0, PY + PH);
  bf.addColorStop(0, 'rgba(11,6,6,0)');
  bf.addColorStop(1, 'rgba(11,6,6,.95)');
  ctx.fillStyle = bf;
  ctx.fillRect(PX, PY + PH - 170, PW, 170);
  font(ctx, 30, 700, 'Cinzel');
  ctx.fillStyle = C.bone;
  spaced(ctx, char.fiend ? 'FIEND' : ROLE_EN[char.role], PX + PW / 2, PY + PH - 62, 6, 'center');
  taper(ctx, PX + PW / 2 - 14, PY + PH - 44, -110, 2, accent);
  taper(ctx, PX + PW / 2 + 14, PY + PH - 44, 110, 2, accent);
  diamond(ctx, PX + PW / 2, PY + PH - 44, 4, accent);
  font(ctx, 17, 400);
  ctx.fillStyle = C.flesh;
  ctx.textAlign = 'center';
  ctx.fillText(char.role === 'maid' && !char.fiend ? `M.A.I.D.S ${maidGrade(char.level)}` : noEmoji(role.name), PX + PW / 2, PY + PH - 18);
  ctx.textAlign = 'left';
  doubleFrame(ctx, PX, PY, PW, PH);

  // ---------- right column ----------
  const X = 480, W = CARD_W - X - 48;
  let y = 78;

  // eyebrow: LEVEL · ICON
  font(ctx, 17, 700, 'Cinzel');
  ctx.fillStyle = accent;
  const lvW = spaced(ctx, `LV ${char.level}`, X, y, 4);
  diamond(ctx, X + lvW + 14, y - 6, 4, C.hair);
  ctx.fillStyle = C.muted;
  spaced(ctx, `DEVOTEE OF ${icon.name.toUpperCase()}`, X + lvW + 30, y, 4);

  // name
  y += 64;
  ctx.fillStyle = C.bone;
  ctx.shadowColor = 'rgba(224,30,55,.35)';
  ctx.shadowBlur = 18;
  fitText(ctx, noEmoji(char.name) || '—', X, y, W, 60, 700);
  ctx.shadowBlur = 0;

  // subtitle
  y += 38;
  ctx.fillStyle = C.flesh;
  fitText(ctx, char.fiend ? `Fiend แห่ง ${icon.name}` : `สาวกของ ${icon.name} — ${noEmoji(icon.title)}`, X, y, W, 21, 500);
  y += 30;
  ctx.fillStyle = C.muted;
  fitText(ctx, statusText(char), X, y, W, 18, 400);

  y += 26;
  divider(ctx, X, y, W);

  // bars 2×2
  y += 40;
  const colW = (W - 40) / 2;
  bar(ctx, X, y, colW, 'เนื้อกาย', char.hp, char.maxHp, '#e01e37');
  bar(ctx, X + colW + 40, y, colW, 'แรง', char.stamina, char.maxStamina, '#d98b2b');
  y += 56;
  bar(ctx, X, y, colW, 'ความเป็นมนุษย์', char.humanity, 100, '#e6b8a2', humanityTier(char.humanity));
  bar(ctx, X + colW + 40, y, colW, 'สติ', char.sanity, 100, '#8c9bb5', char.sanity < 30 ? 'ภาพหลอน' : undefined);
  y += 56;
  const need = balance.xpForLevel(char.level);
  bar(ctx, X, y, W, 'XP', char.xp, need, '#c9a227', `สู่ Lv ${char.level + 1}`);

  // stats
  y += 44;
  const gap = 16;
  const bw = (W - gap * 2) / 3;
  (['str', 'agi', 'int'] as const).forEach((k, idx) => statBox(ctx, X + idx * (bw + gap), y, bw, 126, k, char.stats[k], statMod(char, k)));

  // equipment
  y += 126 + 38;
  const half = (W - 40) / 2;
  for (const [i, slot, label, val] of [
    [0, 'weapon', 'อาวุธ', `พละ +${gearAtk(char)}`],
    [1, 'armor', 'เกราะ', `ลดดาเมจ ${gearDef(char)}`],
  ] as const) {
    const ex = X + i * (half + 40);
    diamond(ctx, ex + 5, y - 7, 5, C.crimson);
    font(ctx, 16, 400);
    ctx.fillStyle = C.muted;
    ctx.fillText(`${label} · ${val}`, ex + 18, y);
    ctx.fillStyle = C.bone;
    fitText(ctx, gearName(char, slot), ex + 18, y + 28, half - 18, 21, 500);
  }

  // footer
  const fy = CARD_H - 34;
  ctx.fillStyle = C.hair;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(X, fy - 30, W, 1);
  ctx.globalAlpha = 1;
  font(ctx, 17, 400);
  ctx.fillStyle = C.flesh;
  let fx = X;
  [`เนื้อสด ${char.flesh}`, `ดันเจียน ${char.dungeonsCleared}`, `ตาย ${char.deaths}`, `สติแตก ${char.breakdowns}`].forEach((t, idx) => {
    if (idx) {
      diamond(ctx, fx + 10, fy - 6, 3, C.crimson);
      fx += 22;
    }
    ctx.fillStyle = C.flesh;
    ctx.fillText(t, fx, fy);
    fx += ctx.measureText(t).width;
  });
  logo(ctx, X + W, fy + 2);

  return png(cv);
}
