/**
 * Build the default (template) sprite shown on /create before a player uploads their own.
 * Splits web/public/templates/fleshfall-sprite-template.psd with the same parser the browser uses.
 *
 *   npm run web:template   (repo root)
 *     → web/public/sprites/template/<part>.webp   (part images)
 *     → web/src/data/sprite-template.json          (rig, bundled into the site)
 *
 * Re-run whenever the template PSD changes.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url)); // repo root
// ag-psd lives in the web workspace; @napi-rs/canvas is the bot's renderer
const req = createRequire(root('web/package.json'));
const { readPsd, initializeCanvas } = req('ag-psd') as typeof import('ag-psd');
const { createCanvas, ImageData } = req('@napi-rs/canvas') as typeof import('@napi-rs/canvas');
initializeCanvas(
  (w: number, h: number) => createCanvas(w, h) as unknown as HTMLCanvasElement,
  (w: number, h: number) => new ImageData(w, h) as unknown as globalThis.ImageData,
);
const { parsePsd } = await import('../src/lib/psd.ts');

const psdPath = root('web/public/templates/fleshfall-sprite-template.psd');
const outDir = root('web/public/sprites/template');
const rigPath = root('web/src/data/sprite-template.json');

const psd = readPsd(readFileSync(psdPath), { skipCompositeImageData: true, skipThumbnail: true });
const parsed = await parsePsd(psd, {
  create: (w, h) => createCanvas(w, h),
  async encode(c) {
    const data = await c.encode('webp', 90);
    return { data, type: 'image/webp', size: data.length };
  },
});

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
for (const [id, data] of parsed.files) writeFileSync(`${outDir}/${id}.webp`, data as Uint8Array);
writeFileSync(rigPath, JSON.stringify(parsed.rig, null, 1) + '\n');

console.log(`✓ template sprite: ${parsed.rig.parts.length} parts, ${parsed.rig.width}x${parsed.rig.height}`);
for (const m of parsed.mapping) console.log(`   ${m.name.trim().padEnd(20)} → ${m.id}`);
for (const w of parsed.warnings) console.log(`   ⚠ ${w}`);
process.exit(0);
