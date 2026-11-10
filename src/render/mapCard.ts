/**
 * Old Realm world map — line-art continents (Natural Earth 110m land, public domain)
 * with one dot per city: color = continent's main door, size = tier.
 * New cities need an entry in CITY_COORDS or they won't get a dot.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Character } from '../game/types.js';
import { CONTINENTS, currentZone, ZONES, type Continent, type Tier } from '../game/zones.js';
import { background, C, canvas, DOOR_HEX, font, logo, png, spaced, type Ctx } from './kit.js';

/** [lat, lon] per city id. */
export const CITY_COORDS: Record<string, [number, number]> = {
  // Europe
  paris: [48.9, 2.35], vienna: [48.2, 16.4], roma: [41.9, 12.5], athen: [38.0, 23.7], moscow: [55.8, 37.6],
  byzantine: [41.0, 29.0], frankfurt: [50.1, 8.7], geneva: [46.2, 6.1], budapest: [47.5, 19.0], granada: [37.2, -3.6],
  // Asia
  bangkok: [13.75, 100.5], seoul: [37.6, 127.0], shanghai: [31.2, 121.5], tibet: [29.6, 91.1], delhi: [28.6, 77.2],
  xinjiang: [43.8, 87.6], tehran: [35.7, 51.4], qatar: [25.3, 51.5], tel_aviv: [32.1, 34.8], jerusalem: [31.8, 35.2],
  // America
  british_columbia: [49.3, -123.1], texas: [31.0, -99.0], new_york: [40.7, -74.0], mexico_city: [19.4, -99.1], quebec: [46.8, -71.2],
  miami: [25.8, -80.2], greenland: [64.2, -51.7], haiti: [18.6, -72.3], panama: [9.0, -79.5], north_pole: [82, -40],
  // South America
  quito: [-0.2, -78.5], barranquilla: [11.0, -74.8], rio: [-22.9, -43.2], lima: [-12.0, -77.0], la_paz: [-16.5, -68.1],
  montevideo: [-34.9, -56.2], santa_cruz: [-17.8, -63.2], iquique: [-20.2, -70.1], amazonas: [-3.1, -60.0],
  // Africa
  cape_town: [-33.9, 18.4], cairo: [30.0, 31.2], alexandria: [31.2, 29.9], khartoum: [15.6, 32.5], burundi: [-3.4, 29.4],
  tanganyika: [-6.0, 29.5], rwanda: [-1.9, 30.1], kano: [12.0, 8.5], sahara: [23.0, 5.0],
  // Australia / Antarctica
  australia: [-25.3, 133.8], antarctica: [-78, 20],
};

/** Continent label anchors (in open water near each cluster). */
const LABELS: Record<Continent, [number, number]> = {
  europe: [67, 2],
  asia: [55, 100],
  america: [58, -108],
  south_america: [-42, -100],
  africa: [-22, -2],
  australia: [-42, 112],
  antarctica: [-63, 40],
};

const TIER_R: Record<Tier, number> = { easy: 5, normal: 6.5, hard: 8, epic: 10 };

const LAND_FILE = fileURLToPath(new URL('../../assets/map/land-110m.json', import.meta.url));
let land: [number, number][][] | undefined;
const getLand = () => (land ??= JSON.parse(readFileSync(LAND_FILE, 'utf8')) as [number, number][][]);

const W = 1200;
const H = 690;
const MX = 40;
const MY = 128;
const MW = W - MX * 2;
const LAT_TOP = 84;
const LAT_BOT = -80;
const MH = (MW * (LAT_TOP - LAT_BOT)) / 360;

/** Visible window in degrees. Whole world by default; zoomed to a continent when focused. */
interface View {
  lon0: number;
  lon1: number;
  lat0: number; // top
  lat1: number; // bottom
}
const WORLD: View = { lon0: -180, lon1: 180, lat0: LAT_TOP, lat1: LAT_BOT };
let view: View = WORLD;
const px = (lon: number) => MX + ((lon - view.lon0) / (view.lon1 - view.lon0)) * MW;
const py = (lat: number) => MY + ((view.lat0 - lat) / (view.lat0 - view.lat1)) * MH;

/** Bounding box of a continent's cities, padded and widened to the map's aspect ratio. */
function focusView(c: Continent): View {
  const pts = Object.values(ZONES)
    .filter((z) => z.continent === c && CITY_COORDS[z.id])
    .map((z) => CITY_COORDS[z.id]!);
  let lon0 = Math.min(...pts.map((p) => p[1])) - 10;
  let lon1 = Math.max(...pts.map((p) => p[1])) + 10;
  let lat0 = Math.max(...pts.map((p) => p[0])) + 8;
  let lat1 = Math.min(...pts.map((p) => p[0])) - 8;
  const aspect = MW / MH; // deg lon per deg lat
  // single-city continents (Australia, Antarctica) get a wide view so the land is recognisable
  let wLon = Math.max(lon1 - lon0, pts.length <= 1 ? 110 : 50);
  let hLat = lat0 - lat1;
  if (wLon / hLat < aspect) wLon = hLat * aspect;
  else hLat = wLon / aspect;
  const cLon = (lon0 + lon1) / 2;
  const cLat = (lat0 + lat1) / 2;
  lon0 = cLon - wLon / 2;
  lon1 = cLon + wLon / 2;
  // keep the window inside the world's latitude range
  lat0 = Math.min(LAT_TOP + 4, cLat + hLat / 2);
  lat1 = lat0 - hLat;
  if (lat1 < LAT_BOT - 6) {
    lat1 = LAT_BOT - 6;
    lat0 = lat1 + hLat;
  }
  return { lon0, lon1, lat0, lat1 };
}

type Box = [number, number, number, number];
const hit = (a: Box, b: Box) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

function drawLand(ctx: Ctx): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(MX, MY, MW, MH);
  ctx.clip();
  // graticule
  ctx.strokeStyle = 'rgba(230,184,162,.06)';
  ctx.lineWidth = 1;
  for (let lon = -150; lon <= 150; lon += 30) {
    ctx.beginPath();
    ctx.moveTo(px(lon), MY);
    ctx.lineTo(px(lon), MY + MH);
    ctx.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    ctx.beginPath();
    ctx.moveTo(MX, py(lat));
    ctx.lineTo(MX + MW, py(lat));
    ctx.stroke();
  }
  // continents
  ctx.beginPath();
  for (const ring of getLand()) {
    ring.forEach(([lon, lat], i) => (i ? ctx.lineTo(px(lon), py(lat)) : ctx.moveTo(px(lon), py(lat))));
    ctx.closePath();
  }
  ctx.fillStyle = 'rgba(230,184,162,.045)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(230,184,162,.42)';
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.restore();
}

/** Flat dot, no glow. */
function dot(ctx: Ctx, x: number, y: number, r: number, color: string, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(11,6,6,.9)';
  ctx.stroke();
  ctx.restore();
}

/** `focus` = continent picked in the dropdown → its cities get name labels, others dim. */
export async function renderMapCard(char: Character, focus?: Continent): Promise<Buffer> {
  view = focus ? focusView(focus) : WORLD;
  const { cv, ctx } = canvas(W, H);
  background(ctx, W, H, { x: W / 2, y: MY + MH / 2, r: 700, color: 'rgba(163,18,27,.22)' });
  const here = currentZone(char);

  // header
  font(ctx, 16, 700, 'Cinzel');
  ctx.fillStyle = C.crimson;
  spaced(ctx, focus ? `OLD REALM · ${CONTINENTS[focus].name.toUpperCase()}` : 'OLD REALM', MX, 58, 4);
  font(ctx, 38, 700);
  ctx.fillStyle = C.bone;
  ctx.fillText(focus ? `${CONTINENTS[focus].name} — ${CONTINENTS[focus].icon}` : 'แผนที่ Old Realm', MX, 104);
  ctx.textAlign = 'right';
  font(ctx, 17, 400);
  ctx.fillStyle = C.muted;
  ctx.fillText(char.traveling ? 'กำลังเดินทาง' : 'คุณอยู่ที่', W - MX, 64);
  font(ctx, 24, 600);
  ctx.fillStyle = C.flesh;
  ctx.fillText(here.continent ? `📍 ${here.name}` : `🏠 ${here.name}`, W - MX, 100);
  ctx.textAlign = 'left';

  drawLand(ctx);

  // map frame
  ctx.strokeStyle = C.frameOuter;
  ctx.lineWidth = 1;
  ctx.strokeRect(MX + 0.5, MY + 0.5, MW - 1, MH - 1);

  ctx.save();
  ctx.beginPath();
  ctx.rect(MX, MY, MW, MH);
  ctx.clip();
  // continent labels (world view only — the header names the focused one)
  if (!focus) for (const [c, [lat, lon]] of Object.entries(LABELS) as [Continent, [number, number]][]) {
    const def = CONTINENTS[c];
    const col = DOOR_HEX[def.door];
    const a = focus && focus !== c ? 0.3 : 1;
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    font(ctx, 15, 700, 'Cinzel');
    ctx.fillStyle = col;
    spaced(ctx, def.name.toUpperCase(), px(lon), py(lat), 3, 'center');
    font(ctx, 13, 400);
    ctx.fillStyle = C.muted;
    ctx.fillText(def.icon, px(lon), py(lat) + 18);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  // city dots
  const cities = Object.values(ZONES).filter((z) => z.continent && CITY_COORDS[z.id]);
  // focused continent last so it sits on top
  cities.sort((a, b) => Number(a.continent === focus) - Number(b.continent === focus));
  for (const z of cities) {
    const [lat, lon] = CITY_COORDS[z.id]!;
    const col = DOOR_HEX[CONTINENTS[z.continent!].door];
    dot(ctx, px(lon), py(lat), TIER_R[z.tier ?? 'easy'], col, focus && z.continent !== focus ? 0.25 : 1);
  }
  if (focus) {
    font(ctx, 16, 600);
    const placed: Box[] = cities
      .filter((c) => c.continent === focus)
      .map((z) => {
        const [lat, lon] = CITY_COORDS[z.id]!;
        const r = TIER_R[z.tier ?? 'easy'] + 2;
        return [px(lon) - r, py(lat) - r, px(lon) + r, py(lat) + r] as Box;
      });
    for (const z of cities.filter((c) => c.continent === focus)) {
      const [lat, lon] = CITY_COORDS[z.id]!;
      const x0 = px(lon);
      const y0 = py(lat);
      const r = TIER_R[z.tier ?? 'easy'] + (z.id === here.id && !char.traveling ? 20 : 6); // clear the "you are here" ring
      const w = ctx.measureText(z.name).width;
      const hgt = 16;
      // try right, left, above, below, then further out
      const tries: [number, number][] = [
        [x0 + r, y0 + 5], [x0 - r - w, y0 + 5], [x0 - w / 2, y0 - r - 2], [x0 - w / 2, y0 + r + hgt],
        [x0 + r, y0 + 5 + 20], [x0 + r, y0 + 5 - 20], [x0 - r - w, y0 + 25], [x0 - r - w, y0 - 15],
      ];
      let pos = tries[0]!;
      for (const t of tries) {
        const b: Box = [t[0] - 2, t[1] - hgt, t[0] + w + 2, t[1] + 4];
        if (!placed.some((p) => hit(p, b))) {
          pos = t;
          break;
        }
      }
      placed.push([pos[0] - 2, pos[1] - hgt, pos[0] + w + 2, pos[1] + 4]);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(11,6,6,.92)';
      ctx.strokeText(z.name, pos[0], pos[1]);
      ctx.fillStyle = C.bone;
      ctx.fillText(z.name, pos[0], pos[1]);
    }
  }

  // you are here
  const hc = CITY_COORDS[here.id];
  if (hc && !char.traveling) {
    const x = px(hc[1]);
    const y = py(hc[0]);
    ctx.strokeStyle = C.crimson;
    ctx.lineWidth = 2;
    for (const r of [15, 22]) {
      ctx.globalAlpha = r === 15 ? 1 : 0.45;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  logo(ctx, W - MX, H - 22);
  return png(cv);
}
