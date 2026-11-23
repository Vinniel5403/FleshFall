/**
 * "Picked up" physics for the paper doll: grab the torso and it's carried by the scruff —
 * body tips over to horizontal, arms/legs hang straight down, hair/skirt fall, head stays mostly upright.
 * Body = pendulum around the carry angle; limbs = damped pendulums in the field they feel (gravity − the body's
 * acceleration + air drag: weightless and trailing while it flies) plus a kick from sideways acceleration;
 * release = thrown rigid body: tumbles, bounces off floor/walls/ceiling with friction, falls over, gets back up.
 * Units: rig pixels / seconds. Pure — SpriteStage feeds it pointer positions each frame.
 */
import { hand, idlePose, legPhase, mul, tuneOf, type Bone, type M, type Mood, type PartKind, type Pose } from "./rig";

/** How much each part swings (sign: + for parts hanging below their pivot, − for parts standing above it). */
const DANGLE: Partial<Record<string, number>> = {
  arm: 0.45, // swing strength (was 1)
  leg: 0.9,
  hair_tail: 1.4,
  back_hair: 0.45,
  bang: 0.3,
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
  bang: 0.3, // moves with the head, not like loose hair
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
  bang: 0.06,
  skirt: 0.3,
  back_acc: 0.45,
  weapon: 0.5,
  head: 0.3,
};

/**
 * Joint range relative to the parent (rad) once let go — wide for loose parts so arms/hair can fly up in a fall,
 * tight for legs/skirt so a tumbling body doesn't fold in half. While held, SWING_MAX around the hanging angle applies instead.
 */
const JOINT_MAX: Partial<Record<string, number>> = {
  arm: 2.7,
  leg: 0.6,
  hair_tail: 2.8,
  back_hair: 0.5, // scalp cover: flung further, the head shows bald
  bang: 0.1, // scalp cover
  skirt: 0.45,
  back_acc: 0.5,
  weapon: 0.6,
  head: 0.3,
};

/** Physics numbers of one part (angles in radians): sway strength, gravity share, swing range while held, joint range once free. */
export interface Phys { dangle: number; gravity: number; swing: number; min: number; max: number }

/** Code defaults by part kind (what the sprite tuner shows as placeholders). */
export function physDefaults(kind: PartKind | null): Phys {
  const swing = (kind && SWING_MAX[kind]) || 0.4;
  const joint = (kind && JOINT_MAX[kind]) || swing;
  return { dangle: (kind && DANGLE[kind]) || 0, gravity: (kind && GRAVITY[kind]) || 0, swing, min: -joint, max: joint };
}

const physCache = new WeakMap<Bone, Phys>();
/** Defaults overridden by the player's tuning (cached per bone; a new tuning builds new bones). */
export function physOf(b: Bone): Phys {
  let ph = physCache.get(b);
  if (!ph) {
    const d = physDefaults(b.kind), t = b.tune ?? {}, deg = (v: number | undefined, def: number) => (v === undefined ? def : (v * Math.PI) / 180);
    ph = { dangle: t.dangle ?? d.dangle, gravity: t.gravity ?? d.gravity, swing: deg(t.swing, d.swing), min: deg(t.min, d.min), max: deg(t.max, d.max) };
    physCache.set(b, ph);
  }
  return ph;
}

/** Pointer velocity low-pass (s): the throw uses this, so it must not depend on the frame rate. */
const VEL_TAU = 0.04;
const THROW_MAX = 12000; // fastest throw (rig px/s, ~10 m/s)
/** Air drag on loose parts as a "wind" opposite to the motion: at 1/WIND px/s it pulls as hard as gravity. */
const WIND_FREE = 1 / 4200, WIND_HELD = 1 / 14000;
const FIELD_TAU = 0.045;

// thrown body = one rigid capsule (feet → head) with its centre of mass at the chest
const AIR_DRAG = 0.25, AIR_SPIN_DRAG = 1.0;
const AIR_RIGHTING = 7; // weak pull back to upright while flying (heavy feet), so it often lands on them
const FLOOR_MU = 0.8, WALL_MU = 0.3;
const FLOOR_BOUNCE = 0.3, WALL_BOUNCE = 0.45, BOUNCE_MIN = 600;
/** Tilted further than this on the floor = it can't catch itself: falls over, lies dazed, then gets up. */
const TOPPLE = 0.9, DAZED = 0.55;
const UP = 0, DOWN = 1, RISE = 2;
/** Carried faster than this (rig px/s) = being shaken: annoyance builds up (see `fuss`). */
const SHAKE_SPEED = 4500;
/** Chance an emoji face shows at all: rolled once per grab, once per release, and per idle slot — otherwise the normal face. */
export const FACE_CHANCE = 0.1;

interface Limb { a: number; v: number }

interface Shape { cx: number; top: number; bottom: number; r: number; comY: number; k2: number }
const shapes = new WeakMap<Map<string, Bone>, Shape>();
/** Collision capsule + mass properties from the rest pose (cached per skeleton). */
function shapeOf(bones: Map<string, Bone>): Shape {
  let s = shapes.get(bones);
  if (s) return s;
  const parts = [...bones.values()].map((b) => b.part);
  const torso = bones.get("torso")?.part, head = bones.get("head")?.part;
  const bottom = Math.max(...parts.map((q) => q.y + q.h));
  const top = head ? head.y : Math.min(...parts.map((q) => q.y));
  const h = Math.max(1, bottom - top);
  const left = Math.min(...parts.map((q) => q.x)), right = Math.max(...parts.map((q) => q.x + q.w));
  s = {
    cx: torso ? torso.x + torso.w / 2 : (left + right) / 2,
    top, bottom,
    r: Math.min(h * 0.2, torso ? torso.w / 2 : h * 0.09),
    comY: torso ? torso.y + torso.h / 2 : top + h * 0.48,
    k2: (h * 0.28) ** 2,
  };
  shapes.set(bones, s);
  return s;
}

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
  /** what loose parts feel, in g: gravity − the body's own acceleration + air drag (0, 1 = hanging still; ~0 in free fall) */
  fx: number; fy: number;
  squash: number;
  /** seconds of squinting left after release */
  squint: number;
  /** 0 = standing, 1 = fully tipped over into the carry pose */
  carry: number;
  limbs: Map<string, Limb>;
  /** seconds simulated (drives the legs' air-walk while carried) */
  clock: number;
  /** just let go: next step turns the hold into a throw */
  thrown: boolean;
  /** touching the floor (free body only) */
  ground: boolean;
  /** 0 standing / catching itself, 1 fallen over (limp), 2 getting back up */
  pose: number;
  /** seconds spent lying still */
  downT: number;
  /** 0…1 lying on the floor: loose parts rest along the body instead of hanging through the floor */
  lay: number;
  /** dangling from a hand: swing of the hand→shoulder line from straight down (rad, + = body to the right) and its speed */
  sw: number; swV: number;
  /** pointer last step + its low-passed velocity (drives that swing) */
  px: number; py: number; pvx: number; pvy: number;
  /** annoyance from being shaken (0…1.5): builds while carried fast, fades slowly so the face doesn't flicker */
  fuss: number;
  /** seconds of "what just happened?" left after landing / getting back up */
  after: number;
  /** dice for this grab / this throw: emoji faces show when it's under the face chance */
  roll: number;
}

export const newPuppet = (): Puppet => ({
  x: 0, y: 0, vx: 0, vy: 0, ang: 0, angV: 0, grabbed: false,
  gx: 0, gy: 0, tx: 0, ty: 0, ax: 0, fx: 0, fy: 1, squash: 0, squint: 0, carry: 0, mode: "hips", limbs: new Map(), clock: 0,
  thrown: false, ground: true, pose: UP, downT: 0, lay: 0,
  sw: 0, swV: 0, px: 0, py: 0, pvx: 0, pvy: 0, fuss: 0, after: 0, roll: 1,
});

/** Multi-legged rigs paddle their legs in the air while held (rad, around the hanging angle). */
const AIR_WALK = 0.3, AIR_WALK_SPEED = 9;

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
/**
 * Dangling from a hand = a pendulum under the HAND (not the shoulder): the whole doll swings out behind a moving hand
 * and keeps swinging when it stops. Length as a multiple of the arm (the weight hangs well below the shoulder),
 * damping (1/s), widest swing (rad), and how much of the swing the body's own tilt follows.
 */
const HANG_LEN = 1.9, HANG_DAMP = 1.5, HANG_MAX = 1.35, HANG_FOLLOW = 0.9;

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
  p.tx = p.px = x;
  p.ty = p.py = y;
  p.pvx = p.pvy = p.sw = p.swV = 0;
  p.grabbed = true;
  p.roll = Math.random();
}

export function release(p: Puppet): void {
  p.grabbed = false;
  p.thrown = true;
  p.squint = 0.5;
  p.roll = Math.random();
}

export interface StepOptions {
  /** spring back to x = 0 after release (sprite preview). false = stay where dropped (room), sliding to a stop */
  home?: boolean;
  /** walls for the body offset p.x (rig px): bounce off them */
  bounds?: [number, number];
  /** ceiling (rig y, same space as the rest pose) */
  ceiling?: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Let go → free rigid body: gravity, tumbling, and impulse contacts (with friction) of the capsule's two ends
 * against floor / walls / ceiling. Landing feet-first while moving trips it forward; past TOPPLE it falls flat,
 * lies dazed, then pushes itself back upright.
 */
function fly(p: Puppet, s: Shape, dt: number, opts: StepOptions): void {
  const home = opts.home !== false;
  if (p.thrown || p.gx !== s.cx || p.gy !== s.comY) {
    // spin about the centre of mass from now on; it moves with the grab point + the swing around it
    const [px, py] = apply(bodyMatrix(p), p.gx, p.gy);
    rePivot(p, s.cx, s.comY);
    if (p.thrown) {
      p.vx -= p.angV * (s.comY + p.y - py);
      p.vy += p.angV * (s.cx + p.x - px);
      const v = Math.hypot(p.vx, p.vy);
      if (v > THROW_MAX) (p.vx *= THROW_MAX / v), (p.vy *= THROW_MAX / v);
      p.pose = UP;
      p.downT = 0;
    }
    p.thrown = false;
  }
  p.ang = wrap(p.ang);

  // --- forces ---
  p.vy += G * dt;
  if (home) p.vx += (-22 * p.x - 8 * p.vx) * dt;
  const drag = Math.exp(-dt * AIR_DRAG);
  p.vx *= drag;
  p.vy *= drag;
  if (p.pose === DOWN) p.angV *= Math.exp(-dt * (p.ground ? 2.5 : AIR_SPIN_DRAG)); // limp
  // legs hold it up / push it back up. Stiff: pivoting on the feet it has to lift its own weight
  else if (p.ground) p.angV += (p.pose === RISE ? -85 * p.ang - 20 * p.angV : -120 * p.ang - 22 * p.angV) * dt;
  else p.angV += (-AIR_RIGHTING * Math.sin(p.ang) - AIR_SPIN_DRAG * p.angV) * dt;

  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.ang = wrap(p.ang + p.angV * dt);

  // --- contacts: each end of the capsule against each plane ---
  const c = Math.cos(p.ang), sn = Math.sin(p.ang);
  const ends = [s.bottom - s.r - s.comY, s.top + s.r - s.comY].map((d) => [-sn * d, c * d] as const); // offsets from the centre of mass
  const comX = s.cx + p.x, comY = s.comY + p.y;
  const [wl, wr] = opts.bounds ? [s.cx + opts.bounds[0] - s.r, s.cx + opts.bounds[1] + s.r] : [-Infinity, Infinity];
  const ceil = opts.ceiling ?? -Infinity;
  let ground = false;
  let pushX = 0, pushY = 0;
  const hit = (rx: number, ry: number, nx: number, ny: number, e: number, mu: number): number => {
    const vn = (p.vx - p.angV * ry) * nx + (p.vy + p.angV * rx) * ny;
    if (vn >= 0) return 0;
    const rn = rx * ny - ry * nx;
    const jn = (-(1 + (-vn > BOUNCE_MIN ? e : 0)) * vn) / (1 + (rn * rn) / s.k2);
    p.vx += jn * nx;
    p.vy += jn * ny;
    p.angV += (rn * jn) / s.k2;
    if (mu > 0) {
      const tx = -ny, ty = nx;
      const vt = (p.vx - p.angV * ry) * tx + (p.vy + p.angV * rx) * ty;
      const rt = rx * ty - ry * tx;
      const jt = clamp(-vt / (1 + (rt * rt) / s.k2), -mu * jn, mu * jn);
      p.vx += jt * tx;
      p.vy += jt * ty;
      p.angV += (rt * jt) / s.k2;
    }
    return jn;
  };
  for (let pass = 0; pass < 3; pass++) {
    for (const [ex, ey] of ends) {
      const x = comX + ex, y = comY + ey;
      const floor = y + s.r - s.bottom;
      if (floor > -0.5) {
        ground = true;
        const jn = hit(ex, ey + s.r, 0, -1, FLOOR_BOUNCE, home ? 0 : FLOOR_MU);
        if (jn > 900) p.squash = Math.max(p.squash, Math.min(0.13, jn / 34000));
        if (!pass) pushY = Math.min(pushY, -floor);
      }
      const top = ceil - (y - s.r);
      if (top > 0) {
        hit(ex, ey - s.r, 0, 1, FLOOR_BOUNCE, WALL_MU);
        if (!pass) pushY = Math.max(pushY, top);
      }
      const left = wl - (x - s.r), right = x + s.r - wr;
      if (left > 0) {
        hit(ex - s.r, ey, 1, 0, WALL_BOUNCE, WALL_MU);
        if (!pass) pushX = Math.max(pushX, left);
      } else if (right > 0) {
        hit(ex + s.r, ey, -1, 0, WALL_BOUNCE, WALL_MU);
        if (!pass) pushX = Math.min(pushX, -right);
      }
    }
  }
  p.x += pushX;
  p.y += pushY;
  if (ground && !p.ground && p.pose === UP) p.after = Math.max(p.after, 1.1); // landed on its feet
  p.ground = ground;

  // --- posture ---
  if (p.pose === UP && ground && Math.abs(p.ang) > TOPPLE) (p.pose = DOWN), (p.downT = 0);
  else if (p.pose === DOWN) {
    if (ground && Math.hypot(p.vx, p.vy) < 500 && Math.abs(p.angV) < 1.5) p.downT += dt;
    if (p.downT > DAZED) p.pose = RISE;
  } else if (p.pose === RISE && Math.abs(p.ang) < 0.15) (p.pose = UP), (p.after = 1.6);
}


export function step(p: Puppet, bones: Map<string, Bone>, dt: number, _size: { w: number; h: number }, opts: StepOptions = {}): void {
  dt = Math.min(dt, 1 / 30);
  if (!(dt > 0)) return; // first frame can report a zero/negative step
  p.clock += dt;
  const shape = shapeOf(bones);
  const pvx = p.vx, pvy = p.vy;
  const follow = 1 - Math.exp(-dt / VEL_TAU);
  const armId = p.grabbed ? heldArm(p) : null;
  const armBone = armId ? bones.get(armId) : undefined;
  let lifted = false;
  if (armBone) {
    // held by the hand: on the floor the arm reaches toward the pointer; pulled past arm's length the
    // body is dragged; lifted, it hangs below the hand (shoulder under the hand)
    const h0 = hand(armBone.part);
    const L = Math.hypot(h0.x - armBone.px, h0.y - armBone.py);
    const sx = armBone.px + p.x; // shoulder now (pivot = shoulder)
    let nx = p.x, ny = p.y;
    // the hand's own motion (low-passed pointer) is what swings the doll
    const hvx = p.pvx, hvy = p.pvy;
    p.pvx += ((p.tx - p.px) / dt - p.pvx) * follow;
    p.pvy += ((p.ty - p.py) / dt - p.pvy) * follow;
    p.px = p.tx;
    p.py = p.ty;
    if (p.ty + L < armBone.py) {
      lifted = true;
      // pendulum under the hand: pulled back by gravity (heavier while the hand jerks up), flung out by the hand's sideways acceleration
      const hax = clamp((p.pvx - hvx) / dt, -60000, 60000), hay = clamp((p.pvy - hvy) / dt, -2 * G, 0.7 * G);
      const len = L * HANG_LEN;
      p.swV += (-((G - hay) / len) * Math.sin(p.sw) - (hax / len) * Math.cos(p.sw) - HANG_DAMP * p.swV) * dt;
      p.sw += p.swV * dt;
      if (Math.abs(p.sw) > HANG_MAX) (p.sw = Math.sign(p.sw) * HANG_MAX), (p.swV *= -0.2);
      nx = p.tx + L * Math.sin(p.sw) - armBone.px;
      ny = Math.min(0, p.ty + L * Math.cos(p.sw) - armBone.py);
    } else {
      // feet on the floor: remember where the shoulder sits under the hand, so lifting starts the swing from there
      p.sw = clamp(Math.atan2(sx - p.tx, Math.max(L * 0.6, armBone.py + p.y - p.ty)), -HANG_MAX, HANG_MAX);
      p.swV = 0;
      ny = 0;
      const dx = p.tx - sx, dy = p.ty - (armBone.py);
      const d = Math.hypot(dx, dy);
      if (d > L) nx = p.x + (dx / d) * (d - L);
    }
    const ease = 1 - Math.exp(-dt * 42); // catch up with the hand (≈ half-way per 60 Hz frame)
    const mx = (nx - p.x) * ease, my = (ny - p.y) * ease;
    p.vx += (mx / dt - p.vx) * follow;
    p.vy += (my / dt - p.vy) * follow;
    p.x += mx;
    p.y += my;
  } else if (p.grabbed) {
    // follow the pointer; velocity low-passed so pointer jitter doesn't explode the springs (and the throw is steady)
    // no drag limit here: the stage clamps the pointer to the visible frame
    const nx = p.tx - p.gx, ny = Math.min(p.ty - p.gy, 0); // can't push it into the floor
    p.vx += ((nx - p.x) / dt - p.vx) * follow;
    p.vy += ((ny - p.y) / dt - p.vy) * follow;
    p.x = nx;
    p.y = ny;
  } else fly(p, shape, dt, opts);
  p.ax = clamp((p.vx - pvx) / dt, -60000, 60000);
  p.fuss = clamp(p.fuss + (p.grabbed && Math.hypot(p.vx, p.vy) > SHAKE_SPEED ? dt * 1.6 : -dt * 0.5), 0, 1.5);
  if (!p.grabbed) p.after = Math.max(0, p.after - dt);

  // tip over into the carry pose while held, back upright when released
  p.carry += ((p.grabbed ? 1 : 0) - p.carry) * Math.min(1, dt * (p.grabbed ? 7 : 5));
  const simple = p.grabbed && (p.mode === "head" || p.mode === "torso"); // held by head/torso: hangs upright under the pointer
  if (p.grabbed) {
    p.ground = false;
    p.pose = UP;
    const rest =
      p.mode === "hips" ? p.carry * CARRY_ANGLE
      // dangling: the body lines up with the hand→shoulder line (+ ang puts the feet LEFT, so it's −swing), leaning a touch toward the hand
      : armBone && lifted ? (p.mode === "hand_l" ? HAND_LEAN : -HAND_LEAN) * Math.cos(p.sw) - HANG_FOLLOW * p.sw
      : 0;
    // how far the centre of mass hangs below the grab point: held by the head the body trails behind a moving hand,
    // held near the chest it barely swings
    const lever = clamp((shape.comY - p.gy) / PEND_L, 0, 1);
    const angAcc = simple
      ? -40 * (p.ang - rest) - 9 * p.angV + lever * (p.ax / PEND_L) * Math.cos(p.ang) * 0.45
      : armBone && !lifted
      ? -40 * (p.ang - rest) - 9 * p.angV // pulled by the hand with feet on the floor: stays upright, no swing
      : armBone
      // second link of the pendulum: the body trails the arm's swing a little (shoulder accelerating right → feet lag left = + ang)
      ? -34 * Math.sin(p.ang - rest) - 6 * p.angV + (p.ax / PEND_L) * Math.cos(p.ang - rest) * 0.35
      : -55 * Math.sin(p.ang - rest) - 10 * p.angV - (p.ax / PEND_L) * Math.cos(p.ang - rest) * 0.6; // quick tip-over, small wobble
    p.angV += angAcc * dt;
    p.ang = clamp(p.ang + p.angV * dt, -2.6, 2.6);
  }

  // what loose parts feel: gravity minus the body's own vertical acceleration (free fall = weightless), plus air drag
  // against the motion (sideways acceleration stays a separate, per-part tuned kick: `drive`)
  const wind = p.grabbed ? WIND_HELD : WIND_FREE;
  const ay = clamp((p.vy - pvy) / dt, -2 * G, 3 * G);
  const ease = 1 - Math.exp(-dt / FIELD_TAU);
  p.fx += (clamp(-p.vx * wind, -2.5, 2.5) - p.fx) * ease;
  p.fy += (clamp(1 - ay / G - p.vy * wind, -2.5, 2.5) - p.fy) * ease;
  p.lay += ((!p.grabbed && p.ground ? Math.min(1, Math.abs(Math.sin(p.ang)) * 1.6) : 0) - p.lay) * Math.min(1, dt * 10);

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
    l.a += Math.atan2(Math.sin(local - l.a), Math.cos(local - l.a)) * (1 - Math.exp(-dt * 42)); // ≈ half-way per 60 Hz frame
    l.v = (l.a - prev) / dt;
    p.limbs.set(armId, l);
  }
  for (const b of bones.values()) {
    if (b.part.id === armId) continue; // set above
    // held by the head → the head doesn't wobble on its own neck
    const ph = physOf(b);
    const w = !(p.mode === "head" && p.grabbed && b.kind === "head") ? ph.dangle : 0;
    const g0 = ph.gravity;
    if (!w && !g0) continue;
    const parentWorld = b.parent ? world(b.parent) : p.ang;
    // walking legs: left/right swing in opposite phase when shaken, and paddle in the air while held
    const gaitSign = b.gait ? Math.cos(legPhase(b)) >= 0 ? 1 : -1 : 1;
    const paddle = b.gait && p.grabbed ? AIR_WALK * p.carry * Math.sin(AIR_WALK_SPEED * p.clock + legPhase(b)) : 0;
    const l = p.limbs.get(b.part.id) ?? { a: 0, v: 0 };
    let acc: number, hang: number;
    if (b.kind === "head") {
      // stands on the neck: kept level by a spring while carried, rigid with the body once let go (no neck-twisting tumbles)
      const g = g0 * p.carry;
      hang = p.ang * (1 - g) - parentWorld;
      acc = -LIMB_K * (l.a - hang);
    } else {
      // hangs from its pivot: a pendulum in the felt field (share g), held to its drawn pose by the joint (share 1 − g)
      // swung by a hand, the legs mostly follow the body's line instead of folding at the hips to hang straight down
      const g = g0 * (1 - p.lay) * (armBone && b.kind === "leg" ? 0.45 : 1);
      const th = parentWorld + l.a;
      // weightless + falling = the field points up: arms and tails lift outward, not through the body
      const out = b.kind === "leg" ? 0 : b.side === "l" ? -1 : b.side === "r" ? 1 : 0; // legs stay together
      const fx = p.fx + out * 0.3 * Math.max(0, -p.fy);
      hang = -g * parentWorld;
      acc = -LIMB_K * (g * (Math.sin(th) * p.fy + Math.cos(th) * fx) + (1 - g) * l.a - paddle);
    }
    l.v += (acc - LIMB_C * l.v + w * LIMB_GAIN * drive * gaitSign) * dt;
    l.a += l.v * dt;
    // range: around the hanging angle while held (stops hair/skirt flipping out on hard shakes), the joint's own range once free.
    // Past it the part is eased back, not snapped
    const lo = ph.min + (hang - ph.swing - ph.min) * p.carry, hi = ph.max + (hang + ph.swing - ph.max) * p.carry;
    // scalp covers stop dead at the limit: easing back lets a hard throw push them past it
    const back = b.kind === "bang" || b.kind === "back_hair" ? 0 : Math.exp(-dt * 16);
    if (l.a > hi) (l.a = hi + (l.a - hi) * back), (l.v = Math.min(0, l.v) * 0.3);
    else if (l.a < lo) (l.a = lo + (l.a - lo) * back), (l.v = Math.max(0, l.v) * 0.3);
    p.limbs.set(b.part.id, l);
    worldOf.set(b.part.id, parentWorld + l.a);
  }

  // a pair of legs swings as one — never splits apart (walking rigs keep their own gait)
  const legs = [...bones.values()].filter((b) => b.kind === "leg" && !b.gait).map((b) => p.limbs.get(b.part.id)).filter((l) => !!l);
  if (legs.length > 1) {
    const a = legs.reduce((n, l) => n + l.a, 0) / legs.length, v = legs.reduce((n, l) => n + l.v, 0) / legs.length;
    for (const l of legs) (l.a = a), (l.v = v);
  }
  // legs stay under the skirt: never turned further from it than the room at the hem allows
  const skirt = p.limbs.get("skirt");
  const range = skirt && legRange(bones);
  if (skirt && range) {
    for (const b of bones.values()) {
      const l = b.kind === "leg" && !b.gait ? p.limbs.get(b.part.id) : undefined;
      if (!l) continue;
      const rel = l.a - skirt.a;
      if (rel > range[1] || rel < range[0]) (l.a = skirt.a + clamp(rel, range[0], range[1])), (l.v = skirt.v);
    }
  }

  p.squash *= Math.exp(-dt * 9);
  if (!p.grabbed) p.squint = Math.max(0, p.squint - dt);
}

/** Share of the room between leg and hem the leg may use (the rest is a margin for the skirt's own flex). */
export const LEG_IN_SKIRT = 0.8;
const legRanges = new WeakMap<Map<string, Bone>, [number, number] | null>();
/**
 * How far the legs may turn relative to the skirt (rad, [min, max]) before they poke out past its hem: the room
 * between each leg's edge and the skirt's edge at hem height, over the hip → hem distance. Shared by all legs
 * (they swing as one). null = no skirt or the legs aren't under it.
 */
function legRange(bones: Map<string, Bone>): [number, number] | null {
  if (legRanges.has(bones)) return legRanges.get(bones)!;
  const sk = bones.get("skirt")?.part;
  let range: [number, number] | null = null;
  if (sk) {
    let lo = -Infinity, hi = Infinity;
    const hem = sk.y + sk.h;
    const share = tuneOf(bones).legInSkirt ?? LEG_IN_SKIRT;
    for (const b of bones.values()) {
      if (b.kind !== "leg" || b.gait) continue;
      const depth = hem - b.py;
      if (depth <= 0) continue;
      // + angle swings the foot to the left (canvas y-down), so the left room caps +, the right room caps −
      const left = Math.max(0, b.part.x - sk.x), right = Math.max(0, sk.x + sk.w - (b.part.x + b.part.w));
      hi = Math.min(hi, Math.atan2(left * share, depth));
      lo = Math.max(lo, -Math.atan2(right * share, depth));
    }
    if (hi !== Infinity) range = [lo, hi];
  }
  legRanges.set(bones, range);
  return range;
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

/** Idle: now and then a face of its own for a couple of seconds (pure function of t, never in the first few seconds). */
const IDLE_EVERY = 6.5, IDLE_SHOW = 2.2, IDLE_MOODS: Mood[] = ["happy", "smug", "hmm"];
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
function idleMood(t: number, chance: number): Mood | null {
  const n = Math.floor(t / IDLE_EVERY);
  if (n < 1 || t - n * IDLE_EVERY > IDLE_SHOW || hash(n) >= chance) return null;
  return IDLE_MOODS[Math.floor(hash(n + 101) * IDLE_MOODS.length)];
}

/**
 * Emoji face for what's happening (rigs with faces on a Head Blank only — drawRig ignores moods the rig lacks):
 * held = shock, shaken = angry · flying = shock · fallen over / getting up = hurt · just landed = confused
 * (angry if it was shaken) · otherwise an occasional idle face (happy / smug / hmm). Each grab / throw / idle slot
 * shows a face only FACE_CHANCE of the time; the rest keep the normal face (squinting while held).
 */
export function mood(p: Puppet, t: number, bones: Map<string, Bone>): Mood | null {
  const chance = tuneOf(bones).faceChance ?? FACE_CHANCE;
  const reacting = p.grabbed || p.pose !== UP || !p.ground || p.after > 0;
  if (reacting && p.roll >= chance) return null;
  if (p.grabbed) return p.fuss > 0.6 ? "angry" : "shock";
  if (p.pose !== UP) return "hurt";
  if (!p.ground) return "shock";
  if (p.after > 0) return p.fuss > 0.3 ? "angry" : "confused";
  return idleMood(t, chance);
}

/** Eyes squeezed shut while held (and a moment after). */
export const squinting = (p: Puppet) => p.grabbed || p.squint > 0 || p.pose !== 0;

/** Standing on its own feet, nothing going on (the room's wander may walk it). */
export const standing = (p: Puppet) => !p.grabbed && p.ground && p.pose === 0 && Math.abs(p.ang) < 0.05 && p.carry < 0.05;

/** Settled = nothing left to simulate (lets the stage skip physics when idle). */
export function settled(p: Puppet): boolean {
  if (p.grabbed || p.pose !== 0 || Math.abs(p.x) >= 0.5 || Math.abs(p.y) >= 0.5 || Math.abs(p.vx) >= 5 || Math.abs(p.vy) >= 5) return false;
  if (Math.abs(p.ang) >= 0.002 || p.carry >= 0.002) return false;
  for (const l of p.limbs.values()) if (Math.abs(l.a) >= 0.002 || Math.abs(l.v) >= 0.01) return false;
  return true;
}
