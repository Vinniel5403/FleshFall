/** Hunt battle card + scene banner (events / dungeon). Long prose stays in the embed text. */
import { getMonster } from '../game/hunt.js';
import { ICON_BY_DOOR } from '../game/icons.js';
import { getItem } from '../game/items.js';
import type { Character, DoorColor, IconDoor } from '../game/types.js';
import { isCrimsonMoon } from '../game/world.js';
import { currentZone, getZone, TIERS, type Tier } from '../game/zones.js';
import {
  art,
  background,
  box,
  C,
  canvas,
  cover,
  diamond,
  DOOR_HEX,
  fitText,
  font,
  ICON_ART,
  logo,
  meter,
  noEmoji,
  png,
  rgba,
  SCENE_ART,
  spaced,
  statusStrip,
  TIER_HEX,
  wrap,
  type Ctx,
} from './kit.js';

const W = 1200;
const PAD = 48;

export const DOOR_EN: Record<DoorColor, string> = {
  green: 'GREEN',
  yellow: 'YELLOW',
  gray: 'GRAY',
  orange: 'ORANGE',
  white: 'PALE WHITE',
  blue: 'BLUE',
  purple: 'PURPLE',
  red: 'RED',
  black: 'BLACK',
};

function crimsonWash(ctx: Ctx, h: number): void {
  if (!isCrimsonMoon()) return;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(200,30,40,.55)';
  ctx.fillRect(0, 0, W, h);
  ctx.restore();
  font(ctx, 15, 700, 'Cinzel');
  ctx.fillStyle = C.crimson;
  spaced(ctx, 'CRIMSON MOON', W - PAD, 40, 4, 'right');
}

// ---------- hunt ----------

export async function renderHuntCard(char: Character, ended?: string): Promise<Buffer> {
  const h = char.hunt;
  const zone = getZone(h?.zone) ?? currentZone(char);
  const tier: Tier = zone.tier ?? 'easy';
  const won = !!h?.won || ended === 'won';
  const died = ended === 'died';
  const loot = Object.entries(h?.loot ?? {});
  const CH = 300;
  const H = 150 + CH + (won && (loot.length || h?.door) ? 120 : 0) + (died ? 70 : 0) + 140;
  const { cv, ctx } = canvas(W, H);
  background(ctx, W, H);
  const scene = await art(SCENE_ART.door);
  if (scene) {
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.filter = 'grayscale(1)';
    cover(ctx, scene, 0, 0, W, 170, 0.5, 0.55);
    ctx.restore();
    const f = ctx.createLinearGradient(0, 60, 0, 170);
    f.addColorStop(0, 'rgba(11,6,6,0)');
    f.addColorStop(1, C.bg);
    ctx.fillStyle = f;
    ctx.fillRect(0, 60, W, 110);
  }
  // red glow drawn after the header art so there's no seam
  const glow = ctx.createRadialGradient(W / 2, 150 + CH / 2, 10, W / 2, 150 + CH / 2, 640);
  glow.addColorStop(0, died ? 'rgba(140,0,0,.45)' : 'rgba(163,18,27,.28)');
  glow.addColorStop(1, 'rgba(163,18,27,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // header
  font(ctx, 16, 700, 'Cinzel');
  ctx.fillStyle = TIER_HEX[tier];
  const ew = spaced(ctx, `HUNT · ${TIERS[tier].name.toUpperCase()}`, PAD, 62, 4);
  ctx.fillStyle = C.muted;
  font(ctx, 15, 400);
  ctx.fillText(`แนะนำ Lv ${TIERS[tier].rec}+`, PAD + ew + 16, 62);
  ctx.fillStyle = C.bone;
  fitText(ctx, noEmoji(zone.name), PAD, 112, W - PAD * 2 - 200, 44, 700);
  crimsonWash(ctx, 0);

  // monsters
  const mons = h?.monsters ?? [];
  const GAP = 22;
  const cw = (W - PAD * 2 - GAP * 2) / 3;
  const y0 = 150;
  mons.slice(0, 3).forEach((m, i) => {
    const x = PAD + i * (cw + GAP);
    const d = getMonster(m.id);
    const dead = m.hp <= 0;
    box(ctx, x, y0, cw, CH, { line: dead ? C.line : rgba(TIER_HEX[tier], 0.45) });
    const g = ctx.createRadialGradient(x + cw / 2, y0 + 120, 5, x + cw / 2, y0 + 120, 130);
    g.addColorStop(0, dead ? 'rgba(60,60,60,.15)' : rgba(C.blood, 0.45));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x + 1, y0 + 1, cw - 2, CH - 2);

    ctx.save();
    if (dead) {
      ctx.globalAlpha = 0.25;
      ctx.filter = 'grayscale(1)';
    }
    font(ctx, 112);
    ctx.textAlign = 'center';
    ctx.fillText(d?.emoji ?? '👁️', x + cw / 2, y0 + 160);
    ctx.restore();
    ctx.textAlign = 'left';

    // number badge
    diamond(ctx, x + 30, y0 + 30, 16, dead ? '#3a3a3a' : C.crimson);
    font(ctx, 17, 700, 'Cinzel');
    ctx.fillStyle = C.bone;
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), x + 30, y0 + 36);

    font(ctx, 22, 600);
    ctx.fillStyle = dead ? C.muted : C.bone;
    ctx.fillText(d?.name ?? m.id, x + cw / 2, y0 + 216);
    ctx.textAlign = 'left';
    if (dead) {
      const tw = ctx.measureText(d?.name ?? m.id).width;
      ctx.fillStyle = C.crimson;
      ctx.fillRect(x + cw / 2 - tw / 2 - 6, y0 + 208, tw + 12, 2);
      font(ctx, 18, 600);
      ctx.fillStyle = C.crimson;
      ctx.textAlign = 'center';
      ctx.fillText('💀 ล้มลงแล้ว', x + cw / 2, y0 + 262);
      ctx.textAlign = 'left';
    } else {
      meter(ctx, x + 26, y0 + 240, cw - 52, 12, m.hp, m.maxHp, '#e01e37');
      font(ctx, 16, 600);
      ctx.fillStyle = C.flesh;
      ctx.textAlign = 'center';
      ctx.fillText(`${m.hp} / ${m.maxHp}`, x + cw / 2, y0 + 280);
      ctx.textAlign = 'left';
    }
  });

  let y = y0 + CH + 30;
  if (died) {
    font(ctx, 30, 700, 'Cinzel');
    ctx.fillStyle = C.crimson;
    spaced(ctx, 'YOU FELL', W / 2, y + 26, 10, 'center');
    y += 70;
  }
  if (won && (loot.length || h?.door)) {
    box(ctx, PAD, y, W - PAD * 2, 96, { line: h?.door ? rgba(DOOR_HEX[h.door], 0.7) : rgba(C.crimson, 0.4) });
    font(ctx, 16, 700, 'Cinzel');
    ctx.fillStyle = C.crimson;
    spaced(ctx, 'VICTORY', PAD + 24, y + 36, 5);
    if (loot.length) {
      let lx = PAD + 24;
      for (const [id, n] of loot.slice(0, 8)) {
        const it = getItem(id);
        const label = `${it?.emoji ?? ''} ${it?.name ?? id} ×${n}`;
        font(ctx, 17, 500);
        const lw = ctx.measureText(label).width + 22;
        if (lx + lw > W - PAD - 320) break;
        ctx.fillStyle = 'rgba(230,184,162,.08)';
        ctx.fillRect(lx, y + 52, lw, 30);
        ctx.fillStyle = C.bone;
        ctx.fillText(label, lx + 11, y + 74);
        lx += lw + 10;
      }
    }
    if (h?.door) {
      const dc = DOOR_HEX[h.door];
      ctx.fillStyle = rgba(dc, 0.18);
      ctx.fillRect(W - PAD - 300, y + 1, 299, 94);
      ctx.fillStyle = dc;
      ctx.fillRect(W - PAD - 300, y + 1, 4, 94);
      font(ctx, 14, 700, 'Cinzel');
      ctx.fillStyle = dc;
      spaced(ctx, `${DOOR_EN[h.door]} DOOR`, W - PAD - 276, y + 38, 3);
      font(ctx, 18, 500);
      ctx.fillStyle = C.bone;
      ctx.fillText('ประตูปรากฏขึ้นกลางหมอก', W - PAD - 276, y + 70);
    }
    y += 120;
  }

  ctx.fillStyle = C.hair;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(PAD, H - 110, W - PAD * 2, 1);
  ctx.globalAlpha = 1;
  statusStrip(ctx, PAD, H - 70, W - PAD * 2 - 170, char);
  logo(ctx, W - PAD, H - 44);
  return png(cv);
}

// ---------- scene banner ----------

export interface SceneData {
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Dungeon door (sets color + Icon art). */
  door?: IconDoor;
  /** Room progress [done, total]. */
  pips?: [number, number];
  boss?: boolean;
  /** Door chips (exit stage). */
  chips?: { label: string; color: DoorColor }[];
}

export async function renderSceneCard(char: Character, s: SceneData): Promise<Buffer> {
  const H = 470;
  const { cv, ctx } = canvas(W, H);
  const accent = s.door ? DOOR_HEX[s.door] : C.crimson;
  background(ctx, W, H);

  const z = currentZone(char);
  const bgPath = s.door ? ICON_ART[ICON_BY_DOOR[s.door].id] : z.region === 'rouge_land' ? SCENE_ART.diner : z.region === 'cypress' ? SCENE_ART.halo : SCENE_ART.door;
  const img = await art(bgPath);
  if (img) {
    ctx.save();
    ctx.globalAlpha = s.door ? 0.5 : 0.62;
    if (s.door) {
      // Icon art: full height on the right
      const ih = H * 1.15;
      const iw = (img.width / img.height) * ih;
      ctx.filter = 'grayscale(.85) contrast(1.1)';
      ctx.drawImage(img, W - iw * 0.92, -H * 0.06, iw, ih);
    } else {
      cover(ctx, img, 0, 0, W, H, 0.6, 0.45);
    }
    ctx.restore();
    if (s.door) {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = rgba(accent, 0.35);
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }
  // readability fade from the left + bottom
  const lf = ctx.createLinearGradient(0, 0, W * 0.75, 0);
  lf.addColorStop(0, 'rgba(11,6,6,.97)');
  lf.addColorStop(0.55, 'rgba(11,6,6,.8)');
  lf.addColorStop(1, 'rgba(11,6,6,.1)');
  ctx.fillStyle = lf;
  ctx.fillRect(0, 0, W, H);
  const bf = ctx.createLinearGradient(0, H - 170, 0, H);
  bf.addColorStop(0, 'rgba(11,6,6,0)');
  bf.addColorStop(1, 'rgba(11,6,6,.96)');
  ctx.fillStyle = bf;
  ctx.fillRect(0, H - 170, W, 170);
  crimsonWash(ctx, H);

  // door edge stripe
  if (s.door) {
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 6, H);
  }

  // eyebrow
  let y = 70;
  font(ctx, 16, 700, 'Cinzel');
  ctx.fillStyle = accent;
  let ex = PAD + spaced(ctx, s.eyebrow, PAD, y, 4);
  if (s.boss) {
    diamond(ctx, ex + 16, y - 6, 4, C.hair);
    ctx.fillStyle = C.crimson;
    spaced(ctx, 'GUARDIAN', ex + 32, y, 4);
  }

  // title (wrap ≤2 lines)
  font(ctx, 46, 700);
  const lines = wrap(ctx, s.title, 720, 2);
  ctx.fillStyle = C.bone;
  ctx.shadowColor = 'rgba(0,0,0,.8)';
  ctx.shadowBlur = 16;
  y += 62;
  for (const ln of lines) {
    ctx.fillText(ln, PAD, y);
    y += 56;
  }
  ctx.shadowBlur = 0;
  if (s.subtitle) {
    font(ctx, 19, 400);
    ctx.fillStyle = C.flesh;
    for (const ln of wrap(ctx, s.subtitle, 700, 2)) {
      ctx.fillText(ln, PAD, y - 12);
      y += 28;
    }
  }

  // pips
  if (s.pips) {
    const [done, total] = s.pips;
    for (let k = 0; k < total; k++) diamond(ctx, PAD + 10 + k * 30, y + 6, 9, k < done ? accent : rgba(accent, 0.5), k >= done);
    font(ctx, 16, 500);
    ctx.fillStyle = C.muted;
    ctx.fillText(`ห้อง ${done}/${total}`, PAD + total * 30 + 10, y + 12);
    y += 40;
  }
  if (s.chips?.length) {
    let cx = PAD;
    for (const c of s.chips) {
      font(ctx, 17, 600);
      const w = ctx.measureText(c.label).width + 40;
      ctx.fillStyle = rgba(DOOR_HEX[c.color], 0.2);
      ctx.fillRect(cx, y - 8, w, 38);
      ctx.fillStyle = DOOR_HEX[c.color];
      ctx.fillRect(cx, y - 8, 4, 38);
      ctx.fillStyle = C.bone;
      ctx.fillText(c.label, cx + 20, y + 18);
      cx += w + 12;
    }
  }

  statusStrip(ctx, PAD, H - 44, W - PAD * 2 - 170, char);
  logo(ctx, W - PAD, H - 20);
  return png(cv);
}
