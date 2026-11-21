/**
 * Animated d20 roll (GIF) shown for ~2s before a hunt/event result.
 * Each frame is drawn with the card kit, then quantized + encoded with gifenc.
 * The die tumbles, lands on the real face, and the last frame holds (GIF plays once).
 */
import gifenc from 'gifenc';
import type { Canvas } from '@napi-rs/canvas';
import type { DiceRoll } from '../game/dice.js';
import { background, C, canvas, doubleFrame, fitText, font, rgba, type Ctx } from './kit.js';

const W = 440;
const H = 360;
const CX = W / 2;
const CY = 196;
const R = 66;
/** baseline of the equation row (captions sit 17px under it) */
const EQ_Y = 290;
const GOLD = '#e3b341';
const LAST_HOLD = 60_000; // final frame: effectively "stay here"

type Face = 'roll' | 'hit' | 'miss' | 'crit' | 'fumble';

interface FaceStyle {
  top: string;
  bottom: string;
  facet: string;
  center: string;
  line: string;
  num: string;
  glow?: string;
}

const FACES: Record<Face, FaceStyle> = {
  roll: { top: '#c4182a', bottom: '#4a080d', facet: 'rgba(0,0,0,.28)', center: 'rgba(255,255,255,.10)', line: 'rgba(233,224,212,.45)', num: C.bone },
  hit: { top: '#ff3b52', bottom: '#7a0c14', facet: 'rgba(0,0,0,.22)', center: 'rgba(255,255,255,.16)', line: 'rgba(255,240,230,.7)', num: '#ffffff', glow: 'rgba(224,30,55,.55)' },
  miss: { top: '#3a1a1a', bottom: '#140909', facet: 'rgba(0,0,0,.35)', center: 'rgba(255,255,255,.05)', line: 'rgba(154,129,120,.5)', num: C.muted },
  crit: { top: '#ffe08a', bottom: '#9a6a12', facet: 'rgba(90,50,0,.25)', center: 'rgba(255,255,255,.25)', line: 'rgba(255,250,220,.9)', num: '#2a0505', glow: 'rgba(227,179,65,.7)' },
  fumble: { top: '#221616', bottom: '#000000', facet: 'rgba(0,0,0,.4)', center: 'rgba(255,255,255,.03)', line: 'rgba(163,18,27,.7)', num: C.blood },
};

const hexPt = (k: number, r: number): [number, number] => {
  const a = ((-90 + 60 * k) * Math.PI) / 180;
  return [Math.cos(a) * r, Math.sin(a) * r];
};

function poly(ctx: Ctx, pts: [number, number][]): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

/** Front view of an icosahedron: hexagon outline, up-pointing center face, 9 facets around it. */
function drawDie(ctx: Ctx, x: number, y: number, opts: { angle?: number; scale?: number; squash?: number; num: number; face: Face; alpha?: number }): void {
  const s = FACES[opts.face];
  const r = R * (opts.scale ?? 1);
  ctx.save();
  ctx.globalAlpha = opts.alpha ?? 1;
  ctx.translate(x, y);
  if (s.glow) {
    const g = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 1.9);
    g.addColorStop(0, s.glow);
    g.addColorStop(1, rgba('#000000', 0));
    ctx.fillStyle = g;
    ctx.fillRect(-r * 2, -r * 2, r * 4, r * 4);
  }
  ctx.rotate(opts.angle ?? 0);
  ctx.scale(1, opts.squash ?? 1);

  const hex = [0, 1, 2, 3, 4, 5].map((k) => hexPt(k, r));
  const inner = [0, 2, 4].map((k) => hexPt(k, r * 0.56));
  const grad = ctx.createLinearGradient(0, -r, 0, r);
  grad.addColorStop(0, s.top);
  grad.addColorStop(1, s.bottom);
  poly(ctx, hex);
  ctx.fillStyle = grad;
  ctx.fill();

  // corner facets (darker) and edge facets
  ctx.fillStyle = s.facet;
  for (let i = 0; i < 3; i++) {
    const k = i * 2;
    poly(ctx, [inner[i]!, hex[k]!, hex[(k + 1) % 6]!]);
    ctx.fill();
    poly(ctx, [inner[i]!, hex[(k + 5) % 6]!, hex[k]!]);
    ctx.fill();
  }
  poly(ctx, inner);
  ctx.fillStyle = s.center;
  ctx.fill();

  ctx.strokeStyle = s.line;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  poly(ctx, hex);
  ctx.stroke();
  poly(ctx, inner);
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const k = i * 2;
    for (const h of [(k + 5) % 6, k, (k + 1) % 6]) {
      ctx.moveTo(...inner[i]!);
      ctx.lineTo(...hex[h]!);
    }
  }
  ctx.stroke();

  ctx.fillStyle = s.num;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  font(ctx, Math.round(r * (opts.num >= 10 ? 0.42 : 0.5)), 700, 'Cinzel');
  ctx.fillText(String(opts.num), 0, r * 0.06);
  ctx.restore();
}

function rays(ctx: Ctx, color: string, len: number, phase = 0): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, CY - R - 4, W, R * 2 + 8); // keep clear of the header and footer text
  ctx.clip();
  ctx.translate(CX, CY);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + phase;
    const r0 = R * 1.15;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    ctx.lineTo(Math.cos(a) * (r0 + len), Math.sin(a) * (r0 + len));
    ctx.stroke();
  }
  ctx.restore();
}

let bgCache: Canvas | null = null;
function base(ctx: Ctx): void {
  if (!bgCache) {
    const { cv, ctx: b } = canvas(W, H);
    background(b, W, H, { x: CX, y: CY, r: 220 });
    doubleFrame(b, 10, 10, W - 20, H - 20);
    bgCache = cv;
  }
  ctx.drawImage(bgCache, 0, 0);
}

const signed = (n: number) => `${n < 0 ? '−' : '+'}${Math.abs(n)}`;

/** Title, then what has to happen in words, then where the bonus comes from. */
function header(ctx: Ctx, d: DiceRoll): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.flesh;
  fitText(ctx, d.label, CX, 42, W - 80, 21, 600);
  const what = d.modLabel ?? 'โบนัส';
  ctx.fillStyle = C.bone;
  fitText(ctx, d.mod ? `ลูกเต๋า ${signed(d.mod)} ${what} ต้องถึง ${d.target}` : `ลูกเต๋าต้องออก ${d.target} ขึ้นไป`, CX, 66, W - 70, 16);
  const from = (d.parts ?? []).filter(([, v]) => v !== 0);
  const notes = [
    from.length > 1 ? `${what} ${signed(d.mod)} = ${from.map(([l, v], i) => `${i ? (v < 0 ? '− ' : '+ ') : v < 0 ? '−' : ''}${l} ${Math.abs(v)}`).join(' ')}` : '',
    d.targetNote ? `ต้องถึง ${d.target}: ${d.targetNote}` : '',
  ].filter(Boolean);
  ctx.fillStyle = C.muted;
  notes.forEach((n, i) => fitText(ctx, n, CX, 86 + i * 17, W - 60, 13, 400, 'Kanit', 10));
}

interface Cell {
  text: string;
  /** small caption under the number */
  cap?: string;
  color?: string;
}

/** `2 + 16 = 18 ≥ 6`, each number captioned (ทอยได้ / พละกำลัง / รวม / ต้องถึง). */
function equation(ctx: Ctx, cells: Cell[]): void {
  const gap = 12;
  const NUM = 24;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const widths = cells.map((c) => {
    font(ctx, NUM, 700, 'Cinzel');
    const num = ctx.measureText(c.text).width;
    if (!c.cap) return num;
    font(ctx, 12);
    return Math.max(num, ctx.measureText(c.cap).width);
  });
  let x = CX - (widths.reduce((s, w) => s + w, 0) + gap * (cells.length - 1)) / 2;
  cells.forEach((c, i) => {
    const mid = x + widths[i]! / 2;
    ctx.fillStyle = c.color ?? (c.cap ? C.bone : C.muted);
    font(ctx, NUM, 700, 'Cinzel');
    ctx.fillText(c.text, mid, EQ_Y);
    if (c.cap) {
      ctx.fillStyle = C.muted;
      font(ctx, 12);
      ctx.fillText(c.cap, mid, EQ_Y + 17);
    }
    x += widths[i]! + gap;
  });
}

function footer(ctx: Ctx, eq: Cell[] | null, verdict: string, color: string): void {
  if (eq) equation(ctx, eq);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  fitText(ctx, verdict, CX, eq ? H - 22 : H - 44, W - 60, 22, 600);
}

interface Landing {
  face: Face;
  eq: Cell[];
  verdict: string;
  color: string;
}

function landing(d: DiceRoll, roll: number, final: boolean): Landing {
  const total = roll + d.mod;
  const success = final ? d.success : false; // an earlier roll was re-rolled, so it failed
  const reached = total >= d.target;
  const tone = success ? C.good : C.crimson;
  const eq: Cell[] = [
    { text: String(roll), cap: 'ทอยได้' },
    ...(d.mod ? [{ text: d.mod < 0 ? '−' : '+' }, { text: String(Math.abs(d.mod)), cap: d.modLabel ?? 'โบนัส' }, { text: '=' }, { text: String(total), cap: 'รวม', color: reached ? C.good : C.crimson }] : []),
    { text: reached ? '≥' : '<' },
    { text: String(d.target), cap: 'ต้องถึง' },
  ];
  const win = d.win ?? 'สำเร็จ';
  const lose = d.lose ?? 'ล้มเหลว';
  // a natural 20 / 1 decides on its own, whatever the sum says
  if (roll === 20) return { face: 'crit', eq, verdict: `NAT 20 — ${win}${reached ? '' : ' (ออก 20 = ผ่านเสมอ)'}`, color: GOLD };
  if (roll === 1) return { face: 'fumble', eq, verdict: `NAT 1 — ${lose}${reached ? ' (ออก 1 = พลาดเสมอ)' : ''}`, color: C.crimson };
  if (success) return { face: 'hit', eq, verdict: total === d.target ? `${win} ฉิวเฉียด!` : win, color: tone };
  const gap = d.target - total;
  return { face: 'miss', eq, verdict: gap <= 2 ? `${lose} — ขาดอีก ${gap}!` : lose, color: tone };
}

interface Frame {
  draw: (ctx: Ctx) => void;
  delay: number;
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;

function tumbleFrames(d: DiceRoll, frames: Frame[]): void {
  const n = 15;
  const spin = (Math.random() < 0.5 ? -1 : 1) * (Math.PI * (3 + Math.random()));
  let prevAngle = spin;
  let num = 1 + Math.floor(Math.random() * 20);
  for (let f = 0; f < n; f++) {
    const t = f / (n - 1);
    const angle = spin * (1 - easeOut(t));
    const ghost = prevAngle;
    prevAngle = angle;
    const squash = 0.72 + 0.28 * Math.abs(Math.cos(angle * 1.3));
    const bounce = -22 * Math.abs(Math.sin(t * Math.PI * 2.5)) * (1 - t);
    let next = 1 + Math.floor(Math.random() * 20);
    if (next === num) next = (next % 20) + 1;
    num = next;
    const shown = num;
    const dots = '.'.repeat(1 + (f % 3));
    frames.push({
      delay: Math.round(35 + 95 * t * t),
      draw: (ctx) => {
        base(ctx);
        header(ctx, d);
        if (t < 0.6) drawDie(ctx, CX, CY + bounce, { angle: ghost, squash, num: shown, face: 'roll', alpha: 0.25 });
        drawDie(ctx, CX, CY + bounce, { angle, squash, num: shown, face: 'roll' });
        footer(ctx, null, `กำลังทอย${dots}`, C.muted);
      },
    });
  }
}

function landFrames(d: DiceRoll, roll: number, final: boolean, hold: number, frames: Frame[]): void {
  const l = landing(d, roll, final);
  const still = (ctx: Ctx, scale: number, dx = 0, behind?: () => void) => {
    base(ctx);
    header(ctx, d);
    behind?.();
    drawDie(ctx, CX + dx, CY, { num: roll, face: l.face, scale });
  };
  frames.push({ delay: 70, draw: (ctx) => still(ctx, 1.14) });
  frames.push({ delay: 50, draw: (ctx) => still(ctx, 0.97, 4) });
  if (l.face === 'crit') {
    frames.push({
      delay: 90,
      draw: (ctx) => {
        still(ctx, 1.04, 0, () => rays(ctx, rgba(GOLD, 0.95), 44));
        footer(ctx, l.eq, l.verdict, l.color);
      },
    });
  }
  frames.push({
    delay: hold,
    draw: (ctx) => {
      still(ctx, 1, l.face === 'fumble' ? -2 : 0, l.face === 'crit' ? () => rays(ctx, rgba(GOLD, 0.55), 30, Math.PI / 12) : undefined);
      footer(ctx, l.eq, l.verdict, l.color);
    },
  });
}

function lokiFrame(d: DiceRoll, roll: number, frames: Frame[]): void {
  frames.push({
    delay: 900,
    draw: (ctx) => {
      base(ctx);
      header(ctx, d);
      drawDie(ctx, CX, CY, { num: roll, face: 'miss', angle: 0.18 });
      footer(ctx, null, 'Loki บิดกฎฟิสิกส์ — ทอยใหม่!', '#b9b4c9');
    },
  });
}

/** Build the roll GIF. `ms` = how long to show it before swapping in the result. `onFrame` is for offline previews. */
export function renderDiceGif(dice: DiceRoll[], onFrame?: (cv: Canvas, idx: number) => void): { gif: Buffer; ms: number } {
  const frames: Frame[] = [];
  const list = dice.slice(0, 3);
  list.forEach((d, di) => {
    d.rolls.forEach((roll, ri) => {
      const final = ri === d.rolls.length - 1;
      const lastOfAll = final && di === list.length - 1;
      tumbleFrames(d, frames);
      landFrames(d, roll, final, lastOfAll ? LAST_HOLD : final ? 1100 : 650, frames);
      if (!final) lokiFrame(d, roll, frames);
    });
  });

  const { cv, ctx } = canvas(W, H);
  const enc = gifenc.GIFEncoder();
  frames.forEach((f, idx) => {
    ctx.clearRect(0, 0, W, H);
    f.draw(ctx);
    onFrame?.(cv, idx);
    const { data } = ctx.getImageData(0, 0, W, H);
    const palette = gifenc.quantize(data, 128);
    enc.writeFrame(gifenc.applyPalette(data, palette), W, H, { palette, delay: f.delay, ...(idx === 0 ? { repeat: -1 } : {}) });
  });
  enc.finish();
  const shown = frames.slice(0, -1).reduce((s, f) => s + f.delay, 0);
  return { gif: Buffer.from(enc.bytes()), ms: shown + 1300 };
}
