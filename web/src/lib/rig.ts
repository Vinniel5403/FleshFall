/**
 * Paper-doll rig: PSD group names → part ids, plus the shared skeleton (pivot + parent per part kind)
 * and idle animation. Every character uses the same template, so pivots/parents/animations are
 * defined once here and apply to everyone. Pure + canvas-agnostic (works with DOM canvas or
 * @napi-rs/canvas), so it can be tested offline.
 */

export interface RigPart {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  ext: "webp" | "png";
  /** pixel anchors from the art (rig coords): centroid of the top / bottom band of opaque pixels — shoulder & hand, hip, hair root */
  top?: [number, number];
  bot?: [number, number];
  /** weapon only: which arm holds it (screen side). Missing = left. */
  hand?: "l" | "r";
}
export interface Rig {
  width: number;
  height: number;
  parts: RigPart[];
  /** character height in cm (feet to top of head) — drives uniform scale against the cm ruler */
  heightCm?: number;
}

export const HEIGHT_MIN = 100, HEIGHT_MAX = 220, HEIGHT_DEFAULT = 160;

export type PartKind =
  | "hair_tail" | "back_hair" | "bang" | "back_acc" | "weapon" | "skirt" | "torso" | "head_blink" | "iris" | "eyes" | "head" | "arm" | "leg";
type Side = "l" | "r";

/** Order matters: first match wins (e.g. "back hair" before "head"). Matched on the squashed lowercase name. */
const KINDS: [PartKind, RegExp][] = [
  ["hair_tail", /hairtail|pigtail|twintail|ponytail/],
  ["back_hair", /backhair|hairback|rearhair/],
  ["bang", /bang|fringe|fronthair/],
  ["back_acc", /backacc|accessor|wing/],
  ["weapon", /weapon|sword|blade|gun|axe|knife|cleaver|spear/],
  ["skirt", /skirt|dress|pants|shorts/],
  ["torso", /torso|body|chest/],
  ["head_blink", /blink|eyesclosed|closedeyes/],
  ["iris", /iris|pupil/],
  ["eyes", /eye/],
  ["head", /head|face/],
  ["arm", /arm|aem|amr|hand/],
  ["leg", /leg|foot|feet/],
];
const PAIRED = new Set<PartKind>(["hair_tail", "back_acc", "arm", "leg"]);

/** What the template expects (shown to players). */
export const TEMPLATE_GROUPS = [
  "Hair Tail Left", "Hair Tail Right", "Back Hair", "Back Accessories Left", "Back Accessories Right",
  "Torso", "Head", "Head Blink", "White Eyes", "Irises", "Bang", "Skirt", "Left Arm", "Right Arm", "Left Leg", "Right Leg", "Weapon",
];
export const REQUIRED_KINDS: PartKind[] = ["torso", "head"];

const tokens = (name: string) =>
  name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);

/** "left"/"l" or "right"/"r" as a word in a layer name (screen side). */
export function sideFromName(name: string): Side | null {
  const t = tokens(name);
  return t.includes("left") || t.includes("l") ? "l" : t.includes("right") || t.includes("r") ? "r" : null;
}

export const slug = (s: string) => tokens(s).join("_").slice(0, 28) || "part";

/** "leg1", "Leg 3", "leg_4", "leg-2" → 1-based leg number (multi-legged rigs), else null. */
export function legNumber(name: string): number | null {
  const m = /^legs?(\d{1,2})$/.exec(tokens(name).join(""));
  const n = m ? Number(m[1]) : 0;
  return n >= 1 ? n : null;
}

/** Numbered leg n → side (odd = left, even = right) + pair index (1, 1, 2, 2, 3, …). */
export const legSlot = (n: number): { side: Side; pair: number } => ({ side: n % 2 ? "l" : "r", pair: Math.ceil(n / 2) });
/** Part id for a leg pair: pair 1 keeps the classic `leg_l` / `leg_r`, then `leg_l2`, `leg_r2`, … */
export const legId = (side: Side, pair: number) => (pair <= 1 ? `leg_${side}` : `leg_${side}${pair}`);

/**
 * Assign a part id to each PSD group. Side = word in the name, else which half of the canvas it sits in.
 * Numbered legs (leg1, leg2, …) are all legs: odd = left, even = right, one pair id per two numbers.
 */
export function classify(groups: { name: string; x: number; w: number }[], canvasW: number): string[] {
  const used = new Set<string>();
  const ids: string[] = [];
  for (const g of groups) {
    const t = tokens(g.name);
    const squashed = t.join("");
    const kind = KINDS.find(([, re]) => re.test(squashed))?.[0];
    const legN = legNumber(g.name);
    let id: string;
    if (legN) {
      const { side } = legSlot(legN);
      let pair = legSlot(legN).pair;
      while (used.has(legId(side, pair))) pair++; // e.g. a "Left Leg" already took leg_l
      id = legId(side, pair);
    } else if (!kind) id = `extra_${slug(g.name)}`;
    else if (PAIRED.has(kind)) {
      let side: Side = t.includes("left") || t.includes("l") ? "l" : t.includes("right") || t.includes("r") ? "r" : g.x + g.w / 2 < canvasW / 2 ? "l" : "r";
      if (used.has(`${kind}_${side}`)) side = side === "l" ? "r" : "l";
      id = `${kind}_${side}`;
    } else id = kind;
    if (used.has(id)) id = `extra_${slug(g.name)}`;
    for (let n = 2; used.has(id); n++) id = `${id.replace(/_\d+$/, "")}_${n}`;
    used.add(id);
    ids.push(id);
  }
  return ids;
}

/** Part id → kind + side (+ pair index for paired parts: `leg_l2` = 2nd left leg; default 1). */
export function kindOf(id: string): { kind: PartKind | null; side: Side | null; pair: number } {
  const m = /^([a-z_]+?)(?:_(l|r)(\d{0,2}))?$/.exec(id);
  const k = (m?.[1] ?? "") as PartKind;
  if (id.startsWith("extra_") || !KINDS.some(([kk]) => kk === k)) return { kind: null, side: null, pair: 1 };
  return { kind: k, side: (m?.[2] as Side) ?? null, pair: Number(m?.[3]) || 1 };
}

// ---------- skeleton ----------

/** Pivot as a fraction of the part's box. */
function pivotFrac(kind: PartKind | null, side: Side | null): [number, number] {
  switch (kind) {
    case "torso": return [0.5, 0.96]; // hips: breathing grows upward, nothing below the waist moves
    case "head": case "head_blink": return [0.5, 0.92]; // neck
    case "bang": return [0.5, 0.08];
    case "back_hair": return [0.5, 0.08];
    case "hair_tail": return [side === "l" ? 0.6 : 0.4, 0.04];
    case "arm": return [0.5, 0.05]; // shoulder
    case "leg": return [0.5, 0.03]; // hip
    case "skirt": return [0.5, 0.14]; // just below the waistband
    case "back_acc": return [side === "l" ? 0.85 : 0.15, 0.5]; // inner edge, against the back
    default: return [0.5, 0.5];
  }
}

function parentKind(kind: PartKind | null): PartKind | null {
  switch (kind) {
    case "torso": case "leg": case "skirt": return null; // grounded roots: feet + hem stay planted
    case "iris": return "eyes";
    case "head_blink": case "eyes": case "bang": case "back_hair": case "hair_tail": return "head";
    default: return "torso";
  }
}

export interface Bone {
  part: RigPart;
  kind: PartKind | null;
  side: Side | null;
  /** pivot in rig canvas space (rest pose) */
  px: number;
  py: number;
  parent: string | null;
  /** the rig has a closed-eyes head ("Head Blink") → blink swaps frames instead of squashing eyes */
  blinkFrame: boolean;
  /** paired parts: 1 = first pair (`leg_l`), 2 = `leg_l2`, … */
  pair: number;
  /** legs of a multi-legged rig (more than 2 legs) step in a walk cycle instead of standing still */
  gait: boolean;
}

/** Walk-cycle phase of a leg: left vs right in opposite phase, each further pair a little later (like a creature's legs). */
export const legPhase = (b: Bone) => (b.side === "r" ? Math.PI : 0) + (b.pair - 1) * 0.9;

/** Hand = bottom of the arm; the weapon hangs from whichever hand is closest. */
export const hand = (a: RigPart) => (a.bot ? { x: a.bot[0], y: a.bot[1] } : { x: a.x + a.w * 0.5, y: a.y + a.h * 0.93 });
/** Parts that hinge at their top end use the real pixel anchor when the PSD gave us one. */
const TOP_HINGED = new Set<PartKind>(["arm", "leg", "hair_tail"]);
const distToBox = (p: { x: number; y: number }, b: RigPart) =>
  Math.hypot(Math.max(b.x - p.x, 0, p.x - (b.x + b.w)), Math.max(b.y - p.y, 0, p.y - (b.y + b.h)));

export function buildSkeleton(rig: Rig): Map<string, Bone> {
  const byKind = new Map<string, RigPart>(rig.parts.map((p) => [p.id, p]));
  const bones = new Map<string, Bone>();
  const blinkFrame = byKind.has("head_blink");
  const gait = rig.parts.filter((p) => kindOf(p.id).kind === "leg").length > 2;
  for (const part of rig.parts) {
    const { kind, side, pair } = kindOf(part.id);
    const [fx, fy] = pivotFrac(kind, side);
    let px = part.x + part.w * fx;
    let py = part.y + part.h * fy;
    if (kind && TOP_HINGED.has(kind) && part.top) [px, py] = part.top;
    let parent: string | null = parentKind(kind);
    if (kind === "weapon") {
      const arms = rig.parts.filter((p) => kindOf(p.id).kind === "arm");
      // weapon always goes in the left hand (screen side); nearest hand only if there's no left arm
      const chosen = arms.find((a) => a.id === `arm_${part.hand ?? "l"}`);
      const arm = chosen || arms.sort((a, b) => distToBox(hand(a), part) - distToBox(hand(b), part))[0];
      if (arm) ({ x: px, y: py } = hand(arm)), (parent = arm.id);
    }
    // missing parent → fall back up the chain (iris → head → torso → root)
    for (const up of ["head", "torso"]) if (parent && !byKind.has(parent)) parent = up;
    if (parent && !byKind.has(parent)) parent = null;
    bones.set(part.id, { part, kind, side, px, py, parent: parent === part.id ? null : parent, blinkFrame, pair, gait: gait && kind === "leg" });
  }
  return bones;
}

// ---------- animation ----------

export interface Pose { r: number; sx: number; sy: number }
const REST: Pose = { r: 0, sx: 1, sy: 1 };

/** Idle loop. t in seconds. Angles in radians (canvas y-down: + = clockwise). */
export function idlePose(b: Bone, t: number): Pose {
  const S = Math.sin;
  const mirror = b.side === "r" ? -1 : 1;
  switch (b.kind) {
    case "torso": return { r: 0, sx: 1 - 0.004 * S(2 * t), sy: 1 + 0.012 * S(2 * t) };
    case "head": return { r: 0.028 * S(1.3 * t), sx: 1, sy: 1 };
    case "hair_tail": return { r: 0.032 * S(1.7 * t + (b.side === "l" ? 0 : 0.6)), sx: 1, sy: 1 };
    case "back_hair": return { r: 0.015 * S(1.7 * t + 0.3), sx: 1, sy: 1 };
    case "bang": return { r: 0.02 * S(1.7 * t + 0.9), sx: 1, sy: 1 };
    case "arm": return { r: mirror * 0.035 * (0.5 + 0.5 * S(2 * t)), sx: 1, sy: 1 }; // hands drift outward on the inhale
    case "skirt": return { r: 0, sx: 1 + 0.012 * S(2 * t + 0.4), sy: 1 };
    case "back_acc": return { r: mirror * 0.07 * S(2.6 * t), sx: 1, sy: 1 };
    case "weapon": return { r: 0.03 * S(2 * t + 1), sx: 1, sy: 1 };
    // multi-legged rigs: a slow step in place around the hip (hips stay put, feet shuffle); two-legged rigs stand still
    case "leg": return b.gait ? { r: 0.06 * S(2.4 * t + legPhase(b)), sx: 1, sy: 1 } : REST;
    case "eyes": {
      if (b.blinkFrame) return REST; // blink = frame swap (see visibleAt)
      const ph = t % BLINK_EVERY;
      return ph < 0.16 ? { r: 0, sx: 1, sy: 1 - 0.88 * Math.sin((Math.PI * ph) / 0.16) } : REST;
    }
    default: return REST;
  }
}

const BLINK_EVERY = 3.7;
const BLINK_HOLD = 0.13;
/** Eyes closed right now? Every ~3.7s, plus a quick double blink every third time. */
export function blinking(t: number): boolean {
  const tt = t + 1.5; // first blink 2.2s in, not on frame one
  const n = Math.floor(tt / BLINK_EVERY), ph = tt - n * BLINK_EVERY;
  return ph < BLINK_HOLD || (n % 3 === 2 && ph > 0.26 && ph < 0.26 + BLINK_HOLD);
}

/** Frame swap: "Head Blink" replaces Head + eyes while blinking. */
export function visibleAt(b: Bone, t: number, animate: boolean, eyesShut = false): boolean {
  const shut = eyesShut || (animate && blinking(t));
  if (b.kind === "head_blink") return shut;
  if (b.blinkFrame && (b.kind === "head" || b.kind === "eyes" || b.kind === "iris")) return !shut;
  return true;
}

export interface DrawOptions {
  /** override the pose (e.g. idle + puppet physics) */
  pose?: (b: Bone, t: number) => Pose;
  /** force the blink frame (squeezed eyes while being held) */
  eyesShut?: boolean;
  /** part ids drawn above everything else, in this order (e.g. the arm being held) */
  onTop?: string[];
}

// ---------- transforms ----------

/** 2D affine [a b c d e f] (same layout as canvas setTransform). */
export type M = [number, number, number, number, number, number];
export const I: M = [1, 0, 0, 1, 0, 0];
export const mul = (m: M, n: M): M => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
/** rotate/scale about (px, py) */
function about(px: number, py: number, p: Pose): M {
  const c = Math.cos(p.r), s = Math.sin(p.r);
  const a = c * p.sx, b = s * p.sx, cc = -s * p.sy, d = c * p.sy;
  return [a, b, cc, d, px - (a * px + cc * py), py - (b * px + d * py)];
}

/** World matrix per part for time t (parents first, cached). */
export function solve(bones: Map<string, Bone>, t: number, poseFn = idlePose): Map<string, M> {
  const out = new Map<string, M>();
  const visit = (id: string, depth = 0): M => {
    const hit = out.get(id);
    if (hit) return hit;
    const b = bones.get(id)!;
    const parent = b.parent && depth < 16 ? visit(b.parent, depth + 1) : I;
    const m = mul(parent, about(b.px, b.py, poseFn(b, t)));
    out.set(id, m);
    return m;
  };
  for (const id of bones.keys()) visit(id);
  return out;
}

interface Ctx2D {
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  drawImage(img: never, x: number, y: number, w: number, h: number): void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Debug overlay: part boxes, pivot dots, parent links and ids — to check where things hinge. */
export function drawDebug(ctx: any, rig: Rig, bones: Map<string, Bone>, t: number, view: M, animate = true, pose?: (b: Bone, t: number) => Pose): void {
  const world = solve(bones, animate ? t : 0, animate ? (pose ?? idlePose) : () => REST);
  const pt = (m: M, x: number, y: number) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const scale = Math.hypot(view[0], view[1]);
  const dim = "rgba(255,255,255,.35)";
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.lineWidth = 1;
  ctx.font = `${Math.max(10, Math.round(26 * scale))}px sans-serif`;
  for (const b of bones.values()) {
    const m = mul(view, world.get(b.part.id) ?? I);
    const { x, y, w, h } = b.part;
    const c = b.kind === "weapon" ? "#ffd400" : b.kind === "arm" ? (b.side === "l" ? "#3cff6e" : "#35e0ff") : dim;
    ctx.strokeStyle = c;
    ctx.beginPath();
    const corners = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    corners.forEach(([cx, cy], i) => {
      const [sx, sy] = pt(m, cx, cy);
      if (i) ctx.lineTo(sx, sy);
      else ctx.moveTo(sx, sy);
    });
    ctx.closePath();
    ctx.stroke();
    const [px, py] = pt(m, b.px, b.py);
    if (b.parent) {
      const pb = bones.get(b.parent)!;
      const [qx, qy] = pt(mul(view, world.get(pb.part.id) ?? I), pb.px, pb.py);
      ctx.strokeStyle = "rgba(255,80,80,.6)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(qx, qy);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = c === dim ? "#ff4d6d" : c;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(b.part.id, px + 6, py - 6);
  }
  ctx.restore();
}

/** Draw one frame. `view` maps rig space → canvas pixels. */
export function drawRig(
  ctx: Ctx2D, rig: Rig, bones: Map<string, Bone>, images: Map<string, unknown>, t: number, view: M, animate = true, opts: DrawOptions = {},
): void {
  const world = solve(bones, animate ? t : 0, animate ? (opts.pose ?? idlePose) : () => REST);
  const top = opts.onTop ?? [];
  const order = (id: string) => top.indexOf(id);
  const sorted = [...rig.parts].sort((a, b) => (order(a.id) - order(b.id)) || a.z - b.z);
  for (const p of sorted) {
    const img = images.get(p.id);
    const bone = bones.get(p.id);
    if (!img || (bone && !visibleAt(bone, t, animate, opts.eyesShut))) continue;
    const m = mul(view, world.get(p.id) ?? I);
    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    ctx.drawImage(img as never, p.x, p.y, p.w, p.h);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
