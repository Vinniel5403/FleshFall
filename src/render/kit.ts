/**
 * Shared canvas kit for rendered UI cards (@napi-rs/canvas / Skia).
 * Visual language = web/designsystem.md: dark blood palette, dot background,
 * double frames with ◆ corners, tapered crimson lines, Cinzel (EN) + Kanit (Thai).
 * Emoji render through the Twemoji COLR fallback font.
 */
import { fileURLToPath } from 'node:url';
import { createCanvas, GlobalFonts, loadImage, type Canvas, type Image, type SKRSContext2D } from '@napi-rs/canvas';
import type { DoorColor, IconId, RoleId } from '../game/types.js';
import type { Tier } from '../game/zones.js';

export type Ctx = SKRSContext2D;

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const FONT_DIR = ROOT + 'assets/fonts/';
const ART_DIR = ROOT + 'web/public/';

// ---------- fonts ----------

let fontsReady = false;
export function ensureFonts(): void {
  if (fontsReady) return;
  for (const f of ['Kanit-Regular', 'Kanit-Medium', 'Kanit-SemiBold', 'Kanit-Bold']) GlobalFonts.registerFromPath(`${FONT_DIR}${f}.ttf`, 'Kanit');
  GlobalFonts.registerFromPath(`${FONT_DIR}Cinzel.ttf`, 'Cinzel');
  GlobalFonts.registerFromPath(`${FONT_DIR}UnifrakturMaguntia.ttf`, 'Unifraktur');
  GlobalFonts.registerFromPath(`${FONT_DIR}TwemojiMozilla.ttf`, 'Twemoji');
  fontsReady = true;
}

export function canvas(w: number, h: number): { cv: Canvas; ctx: Ctx } {
  ensureFonts();
  const cv = createCanvas(w, h);
  return { cv, ctx: cv.getContext('2d') };
}

// ---------- palette (web/designsystem.md tokens) ----------

export const C = {
  bg: '#0b0606',
  bg2: '#140909',
  panel: '#1a0c0c',
  line: '#3a1717',
  crimson: '#e01e37',
  blood: '#a3121b',
  flesh: '#e6b8a2',
  bone: '#e9e0d4',
  muted: '#9a8178',
  hair: 'rgba(230,184,162,.55)',
  frameOuter: 'rgba(230,184,162,.35)',
  frameInner: 'rgba(230,184,162,.14)',
  good: '#7fb069',
};

export const DOOR_HEX: Record<DoorColor, string> = {
  green: '#3fa34d',
  yellow: '#e3c341',
  gray: '#9a9a9a',
  orange: '#e57a2b',
  white: '#e8e8e8',
  blue: '#3b6fd6',
  purple: '#8e44ad',
  red: '#c0392b',
  black: '#555555',
};

export const TIER_HEX: Record<Tier, string> = { easy: '#4caf50', normal: '#e3b341', hard: '#e5533d', epic: '#a265e0' };

/** Hex → rgba string. */
export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ---------- art ----------

/** Role portraits (transparent cut-outs). */
export const ROLE_ART: Record<RoleId, string> = {
  maid: 'asset/maid-cleaver.webp',
  hound: 'asset/hound-axe.webp',
  bar: 'asset/bar-owner.webp',
  patron: 'asset/patron-bride.webp',
  outsider: 'asset/outsider.webp',
  survivor: 'asset/lady-doll.webp',
};

export const ICON_ART: Record<IconId, string> = {
  beelzebub: 'icons/beelzebub-0.webp',
  hastur: 'icons/hastur.webp',
  loki: 'icons/loki-00.webp',
  belphegor: 'icons/belphegor.webp',
  sophia: 'icons/sophia.webp',
  thanatos: 'icons/thanatos.webp',
  wendigo: 'icons/wendigo.webp',
};

export const SCENE_ART = {
  door: 'background/02-green-door-wide.webp',
  diner: 'background/03-diner-maid.webp',
  halo: 'background/01-halo-embrace.webp',
  bar: 'asset/bar-owner.webp',
  shop: 'asset/maid-cookbook.webp',
};

const imageCache = new Map<string, Promise<Image | null>>();
export function art(path: string): Promise<Image | null> {
  let p = imageCache.get(path);
  if (!p) {
    p = loadImage(ART_DIR + path).catch((err) => {
      console.warn(`[render] missing art ${path}:`, err?.message ?? err);
      return null;
    });
    imageCache.set(path, p);
  }
  return p;
}

/** Draw an image covering (x,y,w,h), focus point fx/fy in 0..1. */
export function cover(ctx: Ctx, img: Image, x: number, y: number, w: number, h: number, fx = 0.5, fy = 0.5): void {
  const s = Math.max(w / img.width, h / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x - (dw - w) * fx, y - (dh - h) * fy, dw, dh);
  ctx.restore();
}

// ---------- text ----------

/** Strip emoji (for display-type text where glyphs would clash). */
export function noEmoji(s: string): string {
  return s.replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]/gu, '').replace(/\s{2,}/g, ' ').trim();
}

/** Discord markdown → plain text (keeps emoji). */
export function plain(s: string): string {
  return s
    .replace(/^-#\s*/gm, '')
    .replace(/<t:(\d+)(:\w)?>/g, (_, t) => new Date(Number(t) * 1000).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }))
    .replace(/\*\*|__|~~|`/g, '')
    .replace(/(^|\s)\*([^*]+)\*/g, '$1$2')
    .trim();
}

export function font(ctx: Ctx, size: number, weight: number | string = 400, family = 'Kanit'): void {
  ctx.font = `${weight} ${size}px ${family}, Twemoji`;
}

/** Draw text, shrinking the font until it fits maxW, then ellipsizing. */
export function fitText(ctx: Ctx, text: string, x: number, y: number, maxW: number, size: number, weight: number | string = 400, family = 'Kanit', min = 12): void {
  let s = size;
  font(ctx, s, weight, family);
  while (s > min && ctx.measureText(text).width > maxW) font(ctx, --s, weight, family);
  ctx.fillText(ellipsize(ctx, text, maxW), x, y);
}

export function ellipsize(ctx: Ctx, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  const g = [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(text)].map((s) => s.segment);
  while (g.length > 1 && ctx.measureText(g.join('') + '…').width > maxW) g.pop();
  return g.join('') + '…';
}

const wordSeg = new Intl.Segmenter('th', { granularity: 'word' });
/** Word-wrap (Thai-aware via Intl.Segmenter). Uses the current ctx.font. */
export function wrap(ctx: Ctx, text: string, maxW: number, maxLines = Infinity): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const { segment } of wordSeg.segment(para)) {
      const next = line + segment;
      if (line && ctx.measureText(next).width > maxW) {
        out.push(line.trimEnd());
        line = segment.trimStart();
      } else line = next;
    }
    out.push(line.trimEnd());
  }
  if (out.length > maxLines) {
    const cut = out.slice(0, maxLines);
    cut[maxLines - 1] = ellipsize(ctx, cut[maxLines - 1] + '…', maxW);
    return cut;
  }
  return out;
}

/** Letter-spaced text (EN only — never Thai, per design rules). Returns width. */
export function spaced(ctx: Ctx, text: string, x: number, y: number, spacing: number, align: 'left' | 'center' | 'right' = 'left'): number {
  const w = spacedWidth(ctx, text, spacing);
  let cx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = prev;
  return w;
}

export function spacedWidth(ctx: Ctx, text: string, spacing: number): number {
  return [...text].reduce((a, ch) => a + ctx.measureText(ch).width + spacing, -spacing);
}

// ---------- ornaments ----------

export function diamond(ctx: Ctx, x: number, y: number, r: number, fill: string, stroke = false): void {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
  if (stroke) {
    ctx.strokeStyle = fill;
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

/** Tapered line: thick at `x`, fading toward x+len (len may be negative). */
export function taper(ctx: Ctx, x: number, y: number, len: number, thick = 3, color = C.crimson): void {
  const g = ctx.createLinearGradient(x, 0, x + len, 0);
  g.addColorStop(0, color);
  g.addColorStop(1, rgba(color.startsWith('#') ? color : C.crimson, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y - thick / 2);
  ctx.lineTo(x + len, y);
  ctx.lineTo(x, y + thick / 2);
  ctx.closePath();
  ctx.fill();
}

/** Ornamented divider: ◆ in the middle, tapered lines both sides. */
export function divider(ctx: Ctx, x: number, y: number, w: number, color = C.crimson): void {
  const mid = x + w / 2;
  taper(ctx, mid - 10, y, -(w / 2 - 10), 2, color);
  taper(ctx, mid + 10, y, w / 2 - 10, 2, color);
  diamond(ctx, mid, y, 5, color);
}

export function doubleFrame(ctx: Ctx, x: number, y: number, w: number, h: number, corner = C.crimson): void {
  ctx.lineWidth = 1;
  ctx.strokeStyle = C.frameOuter;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.strokeStyle = C.frameInner;
  ctx.strokeRect(x + 8.5, y + 8.5, w - 17, h - 17);
  for (const [cx, cy] of [
    [x, y],
    [x + w, y],
    [x, y + h],
    [x + w, y + h],
  ] as const)
    diamond(ctx, cx, cy, 6, corner);
}

/** Single-line card box (web `.card`). */
export function box(ctx: Ctx, x: number, y: number, w: number, h: number, opts: { fill?: string; line?: string; inner?: boolean } = {}): void {
  ctx.fillStyle = opts.fill ?? 'rgba(26,12,12,.85)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = opts.line ?? C.line;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  if (opts.inner !== false) {
    ctx.strokeStyle = 'rgba(230,184,162,.07)';
    ctx.strokeRect(x + 6.5, y + 6.5, w - 13, h - 13);
  }
}

/** Dark background with dot pattern (+ optional red glow at gx,gy). */
export function background(ctx: Ctx, w: number, h: number, glow?: { x: number; y: number; r: number; color?: string }): void {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.035)';
  for (let y = 11; y < h; y += 22) for (let x = 11; x < w; x += 22) ctx.fillRect(x, y, 1.6, 1.6);
  if (glow) {
    const g = ctx.createRadialGradient(glow.x, glow.y, 10, glow.x, glow.y, glow.r);
    g.addColorStop(0, glow.color ?? 'rgba(163,18,27,.35)');
    g.addColorStop(1, 'rgba(163,18,27,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

/**
 * Section head (web `<SectionHead>`): EN Cinzel with tapered lines + Thai sub-heading in flesh.
 * Returns the y below it.
 */
export function sectionHead(ctx: Ctx, en: string, th: string | undefined, cx: number, y: number, color = C.crimson): number {
  font(ctx, 34, 600, 'Cinzel');
  ctx.fillStyle = C.bone;
  const w = spaced(ctx, en, cx, y, 6, 'center');
  taper(ctx, cx - w / 2 - 22, y - 12, -150, 3, color);
  taper(ctx, cx + w / 2 + 22, y - 12, 150, 3, color);
  if (!th) return y + 18;
  font(ctx, 20, 500);
  ctx.fillStyle = C.flesh;
  ctx.textAlign = 'center';
  ctx.fillText(th, cx, y + 36);
  const tw = ctx.measureText(th).width;
  ctx.textAlign = 'left';
  ctx.fillStyle = C.hair;
  ctx.globalAlpha = 0.6;
  ctx.fillRect(cx - tw / 2 - 70, y + 29, 52, 1);
  ctx.fillRect(cx + tw / 2 + 18, y + 29, 52, 1);
  ctx.globalAlpha = 1;
  return y + 56;
}

export function bar(ctx: Ctx, x: number, y: number, w: number, label: string, cur: number, max: number, color: string, note?: string, size = 19): void {
  font(ctx, size, 500);
  ctx.fillStyle = C.flesh;
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y);
  if (note) {
    const lw = ctx.measureText(label).width;
    font(ctx, size - 4, 400);
    ctx.fillStyle = C.muted;
    ctx.fillText(note, x + lw + 10, y);
  }
  font(ctx, size, 600);
  ctx.fillStyle = C.bone;
  ctx.textAlign = 'right';
  ctx.fillText(`${cur}/${max}`, x + w, y);
  ctx.textAlign = 'left';
  meter(ctx, x, y + 12, w, 10, cur, max, color);
}

export function meter(ctx: Ctx, x: number, y: number, w: number, h: number, cur: number, max: number, color: string): void {
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.fillRect(x, y, w, h);
  const pct = Math.max(0, Math.min(1, max > 0 ? cur / max : 0));
  if (pct > 0) {
    const g = ctx.createLinearGradient(x, 0, x + w * pct, 0);
    g.addColorStop(0, rgba(color, 0.6));
    g.addColorStop(1, color);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w * pct, h);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(x, y, w * pct, Math.min(2, h / 4));
  }
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

/** Compact player status strip: HP / stamina / sanity / humanity meters across `w`. */
export function statusStrip(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  s: { hp: number; maxHp: number; stamina: number; maxStamina: number; sanity: number; humanity: number },
): void {
  const items: [string, number, number, string][] = [
    ['เนื้อกาย', s.hp, s.maxHp, '#e01e37'],
    ['แรง', s.stamina, s.maxStamina, '#d98b2b'],
    ['สติ', s.sanity, 100, '#8c9bb5'],
    ['มนุษย์', s.humanity, 100, '#e6b8a2'],
  ];
  const gap = 28;
  const cw = (w - gap * (items.length - 1)) / items.length;
  items.forEach(([label, cur, max, color], i) => bar(ctx, x + i * (cw + gap), y, cw, label, cur, max, color, undefined, 16));
}

/** Blackletter logo, right-aligned. */
export function logo(ctx: Ctx, rightX: number, y: number, size = 30): void {
  ctx.textAlign = 'right';
  ctx.font = `400 ${size}px Unifraktur`;
  ctx.fillStyle = C.crimson;
  ctx.fillText('Fleshfall', rightX, y);
  ctx.textAlign = 'left';
}

export function png(cv: Canvas): Buffer {
  return cv.toBuffer('image/png');
}
