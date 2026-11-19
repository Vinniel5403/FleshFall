/**
 * Build private-room art for the website.
 *
 *   npm run web:rooms   (repo root)
 *
 * Input  assets/rooms-src/
 *   rooms.json               names, floor band, real height (cm) per template
 *   <Template>.png           room background
 *   <Template>-<item>.png    furniture, painted on a canvas the same size as the room —
 *                            where it sits there is its default placement
 * Output web/public/rooms/<template>.webp        background (≤2560 wide)
 *        web/public/rooms/items/<item>.webp      trimmed furniture
 *        web/src/data/rooms.json                 catalog (positions as fractions of the room)
 *
 * Source PNGs are gitignored, so a machine may only have some of them: templates whose
 * <Template>.png is missing keep their previous catalog entry + webp files untouched.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

interface Template { id: string; name: string; w: number; h: number; heightCm: number; floorTop: number; floorBottom: number }
interface Item { id: string; name: string; room: string; x: number; y: number; w: number; h: number }
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const req = createRequire(root('web/package.json'));
const { createCanvas, loadImage } = req('@napi-rs/canvas') as typeof import('@napi-rs/canvas');

const SRC = root('assets/rooms-src');
const OUT = root('web/public/rooms');
const DATA = root('web/src/data/rooms.json');
const BG_W = 2560;
/** furniture is exported at 2× the background's scale so it stays sharp when the room is zoomed */
const ITEM_SCALE = 2;

interface Config {
  templates: Record<string, { name: string; heightCm: number; floorTop: number; floorBottom: number }>;
  items: Record<string, { name: string }>;
}
const cfg = JSON.parse(readFileSync(`${SRC}/rooms.json`, 'utf8')) as Config;
const id = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Alpha bounding box of the whole canvas. */
function bbox(img: import('@napi-rs/canvas').Image) {
  const { width: W, height: H } = img;
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    const row = y * W * 4;
    for (let x = 0; x < W; x++) {
      if (d[row + x * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

const files = readdirSync(SRC).filter((f) => f.toLowerCase().endsWith('.png'));
const names = files.map((f) => f.slice(0, -4));
const templateNames = names.filter((n) => !n.includes('-'));

const prev: { templates: Template[]; items: Item[] } = existsSync(DATA) ? JSON.parse(readFileSync(DATA, 'utf8')) : { templates: [], items: [] };
mkdirSync(`${OUT}/items`, { recursive: true });

const templates: Template[] = [];
const items: Item[] = [];
for (const t of templateNames) {
  const conf = cfg.templates[t];
  if (!conf) {
    console.log(`⚠ ${t}.png has no entry in rooms.json → skipped`);
    continue;
  }
  // rebuilding this room: drop its old furniture files (re-exported below)
  for (const old of prev.items.filter((i) => i.room === id(t))) rmSync(`${OUT}/items/${old.id}.webp`, { force: true });
  const img = await loadImage(`${SRC}/${t}.png`);
  const s = Math.min(1, BG_W / img.width);
  const w = Math.round(img.width * s), h = Math.round(img.height * s);
  const c = createCanvas(w, h);
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  writeFileSync(`${OUT}/${id(t)}.webp`, await c.encode('webp', 86));
  templates.push({ id: id(t), name: conf.name, w, h, heightCm: conf.heightCm, floorTop: conf.floorTop, floorBottom: conf.floorBottom });
  console.log(`✓ room ${id(t)} ${w}x${h}`);

  for (const n of names.filter((x) => x.startsWith(`${t}-`))) {
    const it = await loadImage(`${SRC}/${n}.png`);
    if (Math.abs(it.width / it.height - img.width / img.height) > 0.01) console.log(`  ⚠ ${n}.png canvas ratio differs from ${t}.png — default position will be off`);
    const b = bbox(it);
    if (!b) {
      console.log(`  ⚠ ${n}.png is empty → skipped`);
      continue;
    }
    const k = Math.min(1, s * ITEM_SCALE * (img.width / it.width));
    const iw = Math.max(1, Math.round(b.w * k)), ih = Math.max(1, Math.round(b.h * k));
    const ic = createCanvas(iw, ih);
    const ictx = ic.getContext('2d');
    ictx.imageSmoothingQuality = 'high';
    ictx.drawImage(it, b.x, b.y, b.w, b.h, 0, 0, iw, ih);
    writeFileSync(`${OUT}/items/${id(n)}.webp`, await ic.encode('webp', 90));
    const r = (v: number) => Math.round(v * 1e5) / 1e5;
    items.push({
      id: id(n),
      name: cfg.items[n]?.name ?? n,
      room: id(t),
      x: r(b.x / it.width),
      y: r(b.y / it.height),
      w: r(b.w / it.width),
      h: r(b.h / it.height),
    });
    console.log(`  ✓ item ${id(n)} ${iw}x${ih}`);
  }
}

// rooms without a source PNG here: keep what was built before
const built = new Set(templates.map((t) => t.id));
for (const t of prev.templates) {
  if (built.has(t.id)) continue;
  const conf = Object.entries(cfg.templates).find(([k]) => id(k) === t.id)?.[1];
  templates.push(conf ? { ...t, name: conf.name, heightCm: conf.heightCm, floorTop: conf.floorTop, floorBottom: conf.floorBottom } : t);
  items.push(...prev.items.filter((i) => i.room === t.id));
  console.log(`· room ${t.id} kept (no ${t.id} source PNG)`);
}
// catalog order = rooms.json order
const order = Object.keys(cfg.templates).map(id);
const rank = (rid: string) => (order.includes(rid) ? order.indexOf(rid) : order.length);
templates.sort((a, b) => rank(a.id) - rank(b.id));
items.sort((a, b) => rank(a.room) - rank(b.room));

if (!existsSync(root('web/src/data'))) mkdirSync(root('web/src/data'), { recursive: true });
writeFileSync(DATA, JSON.stringify({ templates, items }, null, 1) + '\n');
console.log(`→ ${templates.length} rooms, ${items.length} items`);
process.exit(0);
