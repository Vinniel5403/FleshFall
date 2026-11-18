/**
 * Autonomous wandering for the room doll: stand around for a while, pick a spot, amble over, repeat.
 * Pure (no DOM) — RoomStage calls stepWander() after the puppet physics each frame and layers walkPose()
 * over the idle/physics pose. Units: rig px / seconds, same as puppet.ts.
 */
import { legPhase, type Bone, type Pose } from "./rig";
import type { Puppet } from "./puppet";

export interface Wander {
  /** seconds left standing still before the next walk */
  wait: number;
  /** walk target (puppet p.x), null while idle */
  target: number | null;
  /** -1 left, 1 right (last direction walked) */
  dir: number;
  /** 0 = standing, 1 = full stride (eased in/out so the legs don't snap) */
  amount: number;
  /** stride phase (rad) */
  phase: number;
  /** horizontal facing: 1 = as drawn, -1 = mirrored (walking left); flips instantly */
  face: number;
}

/** First walk starts soon after the room opens, so visitors see the doll move. */
export const newWander = (): Wander => ({ wait: 1.2 + Math.random() * 1.5, target: null, dir: 1, amount: 0, phase: 0, face: 1 });

const IDLE_MIN = 2.5, IDLE_MAX = 7;
/** After being dropped, catch a breath before wandering again. */
const AFTER_DROP = 2.5;
/** Leg swing per step (rad) and arm counter-swing. */
const LEG_SWING = 0.32, ARM_SWING = 0.2;

export interface WanderOpts {
  /** p.x limits (same walls the physics uses) */
  bounds: [number, number];
  /** doll height in rig px — walking speed and stride scale with it */
  height: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Advance the wander state and move the doll. Grabbed / airborne / sliding = no walking (and the plan resets). */
export function stepWander(w: Wander, p: Puppet, dt: number, o: WanderOpts): void {
  const speed = o.height * 0.42; // a slow amble
  const stride = o.height * 0.22; // distance per half-cycle
  const busy = p.grabbed || p.y < -1 || Math.abs(p.vx) > 40 || p.carry > 0.05;
  if (busy) {
    w.target = null;
    w.dir = 1; // picked up / thrown: turn back to the way the art is drawn
    w.wait = Math.max(w.wait, AFTER_DROP);
  } else if (w.target === null) {
    w.wait -= dt;
    if (w.wait <= 0) {
      const [l, r] = o.bounds;
      const span = r - l;
      // somewhere a fair distance away, inside the walls
      let t = rand(l, r);
      for (let i = 0; i < 4 && Math.abs(t - p.x) < span * 0.18; i++) t = rand(l, r);
      w.target = t;
    }
  }

  w.face = w.dir;
  const walking = w.target !== null;
  w.amount += ((walking ? 1 : 0) - w.amount) * Math.min(1, dt * (walking ? 5 : 7));
  if (walking) {
    const d = w.target! - p.x;
    w.dir = Math.sign(d) || w.dir;
    const move = Math.min(Math.abs(d), speed * w.amount * dt);
    p.x += w.dir * move;
    w.phase += (move / stride) * Math.PI;
    if (Math.abs(d) <= 1) {
      w.target = null;
      w.wait = rand(IDLE_MIN, IDLE_MAX);
    }
  } else if (w.amount < 0.02) {
    w.phase = 0; // next walk starts from a neutral stance
  }
}

/** Mirror matrix for the doll's local space: flips around rig x = cx by the current facing. */
export const flipMatrix = (w: Wander, cx: number): [number, number, number, number, number, number] => [w.face, 0, 0, 1, cx * (1 - w.face), 0];

/** Vertical bob of the whole body while walking (rig px, negative = up). */
export const walkBob = (w: Wander, height: number) => -Math.abs(Math.sin(w.phase)) * height * 0.012 * w.amount;

/**
 * Layer the walk cycle over another pose function: legs swing in opposite phase, arms counter-swing, slight lean.
 * Lean/trail are always "forward" in the doll's own space; walking left is handled by the mirror (flipMatrix).
 */
export function walkPose(base: (b: Bone, t: number) => Pose, w: Wander) {
  return (b: Bone, t: number): Pose => {
    const pose = base(b, t);
    if (w.amount < 0.001) return pose;
    const a = w.amount;
    switch (b.kind) {
      case "leg":
        return { ...pose, r: pose.r + LEG_SWING * a * Math.sin(w.phase + legPhase(b)) };
      case "arm": {
        const opp = b.side === "r" ? 0 : Math.PI; // arms swing against the leg on their side
        return { ...pose, r: pose.r + ARM_SWING * a * Math.sin(w.phase + opp) };
      }
      case "torso":
        return { ...pose, r: pose.r + 0.035 * a };
      case "hair_tail":
      case "back_hair":
        return { ...pose, r: pose.r + 0.06 * a + 0.025 * a * Math.sin(2 * w.phase) };
      case "skirt":
        return { ...pose, r: pose.r + 0.03 * a };
      default:
        return pose;
    }
  };
}
