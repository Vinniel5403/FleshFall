/**
 * PSD → sprite parts, in the player's browser (a Procreate PSD expands to hundreds of MB — keep it
 * off our servers). Each visible top-level group = one part: composited (opacity respected),
 * trimmed to its pixels, scaled to fit the upload budget, encoded webp (png fallback).
 * Canvas-agnostic via `kit`, so it also runs under @napi-rs/canvas for tests.
 */
import type { Layer, Psd } from "ag-psd";
import { classify, kindOf, REQUIRED_KINDS, type Rig, type RigPart } from "./rig";

export const PSD_MAX_BYTES = 150 * 1024 * 1024;
/** Vercel request body cap is 4.5MB; leave room for multipart overhead. */
export const SPRITE_BUDGET = 3.8 * 1024 * 1024;
const MAX_EDGE = 2048;
const MAX_PARTS = 40;

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface CanvasKit {
  create(w: number, h: number): any; // canvas with getContext('2d')
  /** encode → bytes + real type ("image/webp" | "image/png") */
  encode(canvas: any): Promise<{ data: Blob | Uint8Array; type: string; size: number }>;
}

export interface ParsedSprite {
  rig: Rig;
  files: Map<string, Blob | Uint8Array>;
  warnings: string[];
  /** group name → part id (for showing the mapping) */
  mapping: { name: string; id: string }[];
}

interface Cut {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  canvas: any; // trimmed, full resolution
  /** anchors relative to the crop (full res) */
  top: [number, number] | null;
  bot: [number, number] | null;
}

/** Centroid of opaque pixels in rows [from, to) of a crop — where a limb really attaches. */
function bandCentroid(px: Uint8ClampedArray, w: number, from: number, to: number): [number, number] | null {
  let sx = 0, sy = 0, n = 0;
  for (let y = from; y < to; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 128) (sx += x), (sy += y), n++;
    }
  }
  return n ? [sx / n, sy / n] : null;
}

function drawLayer(ctx: any, node: Layer, alpha: number, warn: Set<string>): void {
  if (node.hidden) return;
  const a = alpha * (node.opacity ?? 1);
  if (node.clipping) warn.add(`"${node.name}" เป็น clipping mask — ระบบยังไม่รองรับ (วาดแบบปกติ)`);
  if (node.mask && !node.mask.disabled) warn.add(`"${node.name}" มี layer mask — ระบบไม่ใช้ mask`);
  if (node.children) {
    for (const ch of node.children) drawLayer(ctx, ch, a, warn);
  } else if (node.canvas) {
    ctx.globalAlpha = a;
    ctx.drawImage(node.canvas, node.left ?? 0, node.top ?? 0);
    ctx.globalAlpha = 1;
  }
}

/** Alpha bounding box of a full-canvas RGBA buffer. */
function bounds(px: Uint8ClampedArray, W: number, H: number) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    const row = y * W * 4;
    for (let x = 0; x < W; x++) {
      if (px[row + x * 4 + 3] > 2) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export async function parsePsd(psd: Psd, kit: CanvasKit): Promise<ParsedSprite> {
  const W = psd.width, H = psd.height;
  const warn = new Set<string>();
  const top = psd.children ?? [];
  // a part = any visible top-level group OR layer (merged art is often one layer per part)
  const groups = top.filter((l) => !l.hidden && !/^(background|bg|พื้นหลัง)$/i.test((l.name ?? "").trim()));
  if (!groups.length) throw new Error("ไม่พบเลเยอร์/group ที่มองเห็นในไฟล์");
  if (groups.length > MAX_PARTS) throw new Error(`ชิ้นส่วนเยอะเกินไป (สูงสุด ${MAX_PARTS})`);

  // composite + trim each group
  const cuts: Cut[] = [];
  const full = kit.create(W, H);
  const fctx = full.getContext("2d");
  groups.forEach((g, z) => {
    fctx.clearRect(0, 0, W, H);
    if (g.children) {
      for (const ch of g.children) drawLayer(fctx, ch, g.opacity ?? 1, warn);
      for (const ch of g.children) {
        if (!ch.hidden && !ch.children && (ch.opacity ?? 1) < 0.95) warn.add(`"${g.name} › ${ch.name}" ความทึบ ${Math.round((ch.opacity ?? 1) * 100)}% — จะโปร่งตามนั้น`);
      }
    } else {
      drawLayer(fctx, g, 1, warn);
      if ((g.opacity ?? 1) < 0.95) warn.add(`"${g.name}" ความทึบ ${Math.round((g.opacity ?? 1) * 100)}% — จะโปร่งตามนั้น`);
    }
    const b = bounds(fctx.getImageData(0, 0, W, H).data, W, H);
    if (!b) return warn.add(`"${g.name}" ว่างเปล่า — ข้าม`);
    const c = kit.create(b.w, b.h);
    c.getContext("2d").drawImage(full, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
    const cpx = c.getContext("2d").getImageData(0, 0, b.w, b.h).data;
    const top = bandCentroid(cpx, b.w, 0, Math.max(1, Math.round(b.h * 0.08)));
    const bot = bandCentroid(cpx, b.w, Math.round(b.h * 0.82), b.h);
    cuts.push({ name: g.name ?? "part", ...b, z, canvas: c, top, bot });
  });
  if (!cuts.length) throw new Error("ทุก group ว่างเปล่า");

  const ids = classify(cuts, W);
  const mapping = cuts.map((c, i) => ({ name: c.name, id: ids[i] }));
  for (const k of REQUIRED_KINDS) if (!ids.includes(k)) warn.add(`ไม่พบส่วน "${k}" — แอนิเมชันจะไม่สมบูรณ์`);
  for (const m of mapping) if (!kindOf(m.id).kind) warn.add(`"${m.name}" ไม่ตรงชื่อในเทมเพลต — แสดงผลและติดไปกับลำตัว (ไม่มีท่าของตัวเอง)`);

  // scale down until every part fits the upload budget
  let s = Math.min(1, MAX_EDGE / Math.max(W, H));
  for (let attempt = 0; attempt < 6; attempt++) {
    const files = new Map<string, Blob | Uint8Array>();
    const parts: RigPart[] = [];
    let total = 0;
    for (let i = 0; i < cuts.length; i++) {
      const c = cuts[i];
      const x = Math.floor(c.x * s), y = Math.floor(c.y * s);
      const w = Math.max(1, Math.ceil((c.x + c.w) * s) - x), h = Math.max(1, Math.ceil((c.y + c.h) * s) - y);
      const out = kit.create(w, h);
      const octx = out.getContext("2d");
      octx.imageSmoothingQuality = "high";
      octx.drawImage(c.canvas, 0, 0, c.w, c.h, c.x * s - x, c.y * s - y, c.w * s, c.h * s);
      const enc = await kit.encode(out);
      total += enc.size;
      files.set(ids[i], enc.data);
      const at = (a: [number, number] | null): [number, number] | undefined =>
        a ? [Math.round((c.x + a[0]) * s), Math.round((c.y + a[1]) * s)] : undefined;
      parts.push({ id: ids[i], x, y, w, h, z: c.z, ext: enc.type === "image/webp" ? "webp" : "png", top: at(c.top), bot: at(c.bot) });
    }
    if (total <= SPRITE_BUDGET) {
      if (s < 1) warn.add(`ย่อขนาดเป็น ${Math.round(s * 100)}% ให้พอดีกับการอัปโหลด`);
      return { rig: { width: Math.round(W * s), height: Math.round(H * s), parts }, files, warnings: [...warn], mapping };
    }
    s *= Math.sqrt(SPRITE_BUDGET / total) * 0.95;
  }
  throw new Error("ภาพละเอียดเกินกว่าจะอัปโหลดได้ ลองลดขนาด canvas");
}

/** Browser entry: File → ParsedSprite (ag-psd loaded on demand). */
export async function parsePsdFile(file: File): Promise<ParsedSprite> {
  if (file.size > PSD_MAX_BYTES) throw new Error("ไฟล์ใหญ่เกิน 150MB");
  const { readPsd } = await import("ag-psd");
  let psd: Psd;
  try {
    psd = readPsd(await file.arrayBuffer(), { skipCompositeImageData: true, skipThumbnail: true });
  } catch (e) {
    throw new Error(`อ่านไฟล์ PSD ไม่ได้: ${(e as Error).message}`);
  }
  const kit: CanvasKit = {
    create(w, h) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      return c;
    },
    encode: (c: HTMLCanvasElement) =>
      new Promise((resolve, reject) =>
        c.toBlob((b) => (b ? resolve({ data: b, type: b.type, size: b.size }) : reject(new Error("encode failed"))), "image/webp", 0.9),
      ),
  };
  return parsePsd(psd, kit);
}
