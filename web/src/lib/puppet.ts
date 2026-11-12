/**
 * "Picked up" physics for the paper doll: grab the torso and it's carried by the scruff —
 * body tips over to horizontal, arms/legs hang straight down, hair/skirt fall, head stays mostly upright.
 * Body = pendulum around the carry angle; limbs = damped angular springs toward their gravity target
 * plus a kick from the body's acceleration; release = flip upright, fall, bounce + squash.
 * Units: rig pixels / seconds. Pure — SpriteStage feeds it pointer positions each frame.
 */
import { hand, idlePose, mul, type Bone, type M, type Pose } from "./rig";

/** How much each part swings (sign: + for parts hanging below their pivot, − for parts standing above it). */
const DANGLE: Partial<Record<string, number>> = {
  arm: 0.45, // swing strength (was 1)
  leg: 0.9,
  hair_tail: 1.4,
  back_hair: 0.45,
  bang: 0.55,
  skirt: 0.35,
  back_acc: 0.8,
  weapon: 0.7,
  head: -0.35,
};

/**
 * Gravity: fraction of the body's tilt a part cancels in world space (1 = points straight down
 * while carried, 0 = stays rigid with its parent).
 */
const GRAVITY: Partial<Record<string, number>> = {
  arm: 1,
  leg: 1,
  hair_tail: 0.8,
  skirt: 0.8,
  head: 0.93,
  back_hair: 0.85,
  bang: 1,
  back_acc: 0.15,
};

/** Carried sideways: head to the right (canvas y-down, + = clockwise). */
const CARRY_ANGLE = Math.PI / 4; // ~56°: tipped, not fully sideways

const G = 9000; // gravity (rig px/s²; a ~2000px-tall doll)
const PEND_L = 600; // pendulum length from grab point to centre of mass
const LIMB_K = 110, LIMB_C = 7, LIMB_GAIN = 0.0021;

/** Max swing away from the part's hanging angle (rad) — stops hair/skirt flipping out on hard shakes. */
const SWING_MAX: Partial<Record<string, number>> = {
  arm: 0.5, // max swing (was 0.9)
  leg: 0.5,
  hair_tail: 0.55,
  back_hair: 0.3,
  bang: 0.1,
  skirt: 0.3,
  back_acc: 0.45,
  weapon: 0.5,
  head: 0.3,
};

interface Limb { a: number; v: number }

export interface Puppet {
  x: number; y: number; vx: number; vy: number;
  ang: number; angV: number;
  grabbed: boolean;
  /** what was grabbed: head / torso = held upright (torso also lets the head swing), hips = carried tipped over */
  mode: GrabMode;
  /** grab point in rest-pose rig coords */
  gx: number; gy: number;
  /** pointer target in rig coords (where the grab point should be) */
  tx: number; ty: number;
  ax: number;
  squash: number;
  /** seconds of squinting left after release */
  squint: number;
  /** 0 = standing, 1 = fully tipped over into the carry pose */
  carry: number;
  limbs: Map<string, Limb>;
}

export const newPuppet = (): Puppet => ({
  x: 0, y: 0, vx: 0, vy: 0, ang: 0, angV: 0, grabbed: false,
  gx: 0, gy: 0, tx: 0, ty: 0, ax: 0, squash: 0, squint: 0, carry: 0, mode: "hips", limbs: new Map(),
});

/** Whole-body transform: offset, rotated about the grab point. */
export function bodyMatrix(p: Puppet): M {
  const c = Math.cos(p.ang), s = Math.sin(p.ang);
  // T(x,y) · T(g) · R · T(−g)
  return mul([1, 0, 0, 1, p.x, p.y], [c, s, -s, c, p.gx - (c * p.gx - s * p.gy), p.gy - (s * p.gx + c * p.gy)]);
}

export function invert(m: M): M {
  const det = m[0] * m[3] - m[1] * m[2] || 1e-9;
  return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det, (m[2] * m[5] - m[3] * m[4]) / det, (m[1] * m[4] - m[0] * m[5]) / det];
}

export const apply = (m: M, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/** Is (rig x, y) on the torso, taking the current body pose into account? */
export type GrabMode = "head" | "torso" | "hips" | "hand_l" | "hand_r";

/** Lean toward the held hand while dangling from it (rad). */
const HAND_LEAN = 0.18;

/** Hips zone: bottom of the torso + top of the skirt (fractions of each box's height). */
const HIPS_TORSO_FROM = 0.65;
const HIPS_SKIRT_TO = 0.3;

/** Which grabbable part is under (rig x, y)? Head wins (it's drawn on top). Uses the rest-pose boxes under the current body transform. */
export function hitPart(p: Puppet, bones: Map<string, Bone>, x: number, y: number): GrabMode | null {
  const [lx, ly] = apply(invert(bodyMatrix(p)), x, y);
  /** inside part `id`, limited to the vertical band [from, to] of its box */
  const inside = (id: string, padF: number, from = 0, to = 1) => {
    const b = bones.get(id)?.part;
    if (!b) return false;
    const pad = Math.min(b.w, b.h) * padF;
    const top = b.y + b.h * from, bottom = b.y + b.h * to;
    return lx >= b.x - pad && lx <= b.x + b.w + pad && ly >= top - (from === 0 ? pad : 0) && ly <= bottom + (to === 1 ? pad : 0);
  };
  // hands first: small targets drawn over the body
  for (const side of ["l", "r"] as const) {
    const arm = bones.get(`arm_${side}`)?.part;
    if (!arm) continue;
    const h = hand(arm);
    if (Math.hypot(lx - h.x, ly - h.y) < Math.max(40, arm.h * 0.13)) return `hand_${side}`;
  }
  if (inside("head", -0.05)) return "head"; // slightly inset: the head box is mostly hair/headdress
  if (inside("torso", 0.08, HIPS_TORSO_FROM, 1) || inside("skirt", 0, 0, HIPS_SKIRT_TO)) return "hips";
  if (inside("torso", 0.08)) return "torso";
  return null;
}

/** Move the body's rotation pivot to rest point (lx, ly) without changing how it looks. */
function rePivot(p: Puppet, lx: number, ly: number): void {
  const [wx, wy] = apply(bodyMatrix(p), lx, ly);
  p.x = wx - lx;
  p.y = wy - ly;
  p.gx = lx;
  p.gy = ly;
}

const heldArm = (p: Puppet) => (p.mode === "hand_l" ? "arm_l" : p.mode === "hand_r" ? "arm_r" : null);

export function grab(p: Puppet, x: number, y: number, mode: GrabMode = "hips", bones?: Map<string, Bone>): void {
  p.mode = mode;
  const arm = heldArm(p) && bones?.get(heldArm(p)!);
  if (arm) rePivot(p, arm.px, arm.py); // dangle from the shoulder; the arm reaches for the pointer
  else rePivot(p, ...apply(invert(bodyMatrix(p)), x, y)); // keep the visual pose continuous
  p.tx = x;
  p.ty = y;
  p.grabbed = true;
}

export function release(p: Puppet): void {
  p.grabbed = false;
  p.squint = 0.5;
}

export function step(p: Puppet, bones: Map<string, Bone>, dt: number, size: { w: number; h: number }): void {
  dt = Math.min(dt, 1 / 30);
  const pvx = p.vx;
  const armId = p.grabbed ? heldArm(p) : null;
  const armBone = armId ? bones.get(armId) : undefined;
  let lifted = false;
  if (armBone) {
    // held by the hand: on the floor the arm reaches toward the pointer; pulled past arm's length the
    // body is dragged; lifted, it hangs below the hand (shoulder under the hand)
    const h0 = hand(armBone.part);
    const L = Math.hypot(h0.x - armBone.px, h0.y - armBone.py);
    const sx = armBone.px + p.x, sy = armBone.py + p.y; // shoulder now (pivot = shoulder)
    let nx = p.x, ny = p.y;
    const hangY = p.ty + L - armBone.py; // body offset if hanging straight below the hand
    if (hangY < 0) {
      lifted = true;
      nx = p.tx - armBone.px;
      ny = hangY;
    } else {
      ny = 0;
      const dx = p.tx - sx, dy = p.ty - (armBone.py);
      const d = Math.hypot(dx, dy);
      if (d > L) nx = p.x + (dx / d) * (d - L);
    }
    p.vx += ((nx - p.x) / dt - p.vx) * 0.45;
    p.vy += ((ny - p.y) / dt - p.vy) * 0.45;
    p.x += (nx - p.x) * 0.5;
    p.y += (ny - p.y) * 0.5;
  } else if (p.grabbed) {
    // follow the pointer (clamped), velocity smoothed so pointer jitter doesn't explode the springs
    // no drag limit here: the stage clamps the pointer to the visible frame
    const nx = p.tx - p.gx, ny = p.ty - p.gy;
    p.vx += ((nx - p.x) / dt - p.vx) * 0.45;
    p.vy += ((ny - p.y) / dt - p.vy) * 0.45;
    p.x = nx;
    p.y = Math.min(ny, 0); // can't push it into the floor
  } else {
    // fall back down, spring home sideways, bounce on the floor
    p.vx += (-22 * p.x - 8 * p.vx) * dt;
    p.vy += G * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.y > 0) {
      if (p.vy > 600) p.squash = Math.min(0.13, p.vy / 26000);
      p.y = 0;
      p.vy = p.vy > 600 ? -p.vy * 0.32 : 0;
    }
  }
  p.ax = Math.max(-60000, Math.min(60000, (p.vx - pvx) / dt));

  // tip over into the carry pose while held, back upright when released
  p.carry += ((p.grabbed ? 1 : 0) - p.carry) * Math.min(1, dt * (p.grabbed ? 7 : 5));
  const rest =
    p.mode === "hips" ? p.carry * CARRY_ANGLE
    : armBone && lifted ? (p.mode === "hand_l" ? HAND_LEAN : -HAND_LEAN) // the body swings under the held hand
    : 0;
  // body: pendulum around the carry angle while held, springs upright when released
  const simple = p.grabbed && (p.mode === "head" || p.mode === "torso"); // held by head/torso: stays upright and follows the pointer
  const angAcc = !p.grabbed || simple
    ? -40 * (p.ang - rest) - 9 * p.angV
    : armBone
    ? -26 * Math.sin(p.ang - rest) - 4 * p.angV - (p.ax / PEND_L) * Math.cos(p.ang - rest) * 0.8 // dangling from a hand: swingy
    : -55 * Math.sin(p.ang - rest) - 10 * p.angV - (p.ax / PEND_L) * Math.cos(p.ang - rest) * 0.6; // quick tip-over, small wobble
  p.angV += angAcc * dt;
  p.ang = Math.max(-2.6, Math.min(2.6, p.ang + p.angV * dt));

  // limbs: spring toward their gravity target (cancel the body's tilt in world space) + inertia kick
  // limbs swing with the body's motion; held by the head the body stays upright, so only its sideways acceleration drives them
  const drive = p.ax + (simple ? 0 : p.angV * 900 * (p.grabbed ? 1 : 0.4));
  const worldOf = new Map<string, number>();
  const world = (id: string, depth = 0): number => {
    const hit = worldOf.get(id);
    if (hit !== undefined) return hit;
    const b = bones.get(id);
    const base = b?.parent && depth < 16 ? world(b.parent, depth + 1) : p.ang;
    const w = base + (p.limbs.get(id)?.a ?? 0);
    worldOf.set(id, w);
    return w;
  };
  if (armBone && armId) {
    // the held arm points at the pointer (straight up once lifted) — set directly, no spring
    const h0 = hand(armBone.part);
    const shoulder = apply(bodyMatrix(p), armBone.px, armBone.py);
    const restDir = Math.atan2(h0.y - armBone.py, h0.x - armBone.px);
    const want = Math.atan2(p.ty - shoulder[1], p.tx - shoulder[0]);
    let local = want - restDir - p.ang;
    local = Math.atan2(Math.sin(local), Math.cos(local)); // wrap to (−π, π]
    const l = p.limbs.get(armId) ?? { a: 0, v: 0 };
    const prev = l.a;
    l.a += Math.atan2(Math.sin(local - l.a), Math.cos(local - l.a)) * 0.5;
    l.v = (l.a - prev) / dt;
    p.limbs.set(armId, l);
  }
  for (const b of bones.values()) {
    if (b.part.id === armId) continue; // set above
    // held by the head → the head doesn't wobble on its own neck
    const w = b.kind && !(p.mode === "head" && p.grabbed && b.kind === "head") ? DANGLE[b.kind] : undefined;
    const g = b.kind ? GRAVITY[b.kind] ?? 0 : 0;
    if (!w && !g) continue;
    const parentWorld = b.parent ? world(b.parent) : p.ang;
    const target = p.ang * (1 - g) - parentWorld; // local angle that makes world = ang·(1−g)
    const l = p.limbs.get(b.part.id) ?? { a: 0, v: 0 };
    l.v += (-LIMB_K * (l.a - target) - LIMB_C * l.v + (w ?? 0) * LIMB_GAIN * drive) * dt;
    l.a += l.v * dt;
    // hard stop around the hanging angle: kill the velocity instead of letting it wrap around
    const lim = (b.kind && SWING_MAX[b.kind]) || 0.4;
    if (l.a > target + lim) (l.a = target + lim), (l.v = Math.min(0, l.v) * 0.3);
    else if (l.a < target - lim) (l.a = target - lim), (l.v = Math.max(0, l.v) * 0.3);
    p.limbs.set(b.part.id, l);
    worldOf.set(b.part.id, parentWorld + l.a);
  }

  p.squash *= Math.exp(-dt * 9);
  if (!p.grabbed) p.squint = Math.max(0, p.squint - dt);
}

/** Idle pose + physics swing (+ landing squash on the torso). */
export function puppetPose(p: Puppet) {
  return (b: Bone, t: number): Pose => {
    const base = idlePose(b, t);
    const a = p.limbs.get(b.part.id)?.a ?? 0;
    if (b.kind === "torso" && p.squash > 0.001) return { ...base, sx: base.sx * (1 + p.squash * 0.6), sy: base.sy * (1 - p.squash) };
    return a ? { ...base, r: base.r + a } : base;
  };
}

/** Parts to draw on top while held by a hand: that arm + anything hanging from it (the weapon), keeping their own order. */
export function onTopParts(p: Puppet, bones: Map<string, Bone>): string[] {
  const arm = p.grabbed ? heldArm(p) : null;
  if (!arm || !bones.has(arm)) return [];
  const attached = (id: string): boolean => {
    const parent = bones.get(id)?.parent;
    return !!parent && (parent === arm || attached(parent));
  };
  return [...bones.values()]
    .filter((b) => b.part.id === arm || attached(b.part.id))
    .sort((a, b) => a.part.z - b.part.z)
    .map((b) => b.part.id);
}

/** Eyes squeezed shut while held (and a moment after). */
export const squinting = (p: Puppet) => p.grabbed || p.squint > 0;

/** Settled = nothing left to simulate (lets the stage skip physics when idle). */
export const settled = (p: Puppet) =>
  !p.grabbed && Math.abs(p.x) < 0.5 && Math.abs(p.y) < 0.5 && Math.abs(p.vx) < 5 && Math.abs(p.vy) < 5 &&
  Math.abs(p.ang) < 0.002 && p.carry < 0.002 && [...p.limbs.values()].every((l) => Math.abs(l.a) < 0.002 && Math.abs(l.v) < 0.01);
