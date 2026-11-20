export type DicePart = [label: string, value: number];

/** A d20 check, recorded for the dice animation (pure data, no Discord). */
export interface DiceRoll {
  /** Thai label shown above the die, e.g. "โจมตี", "ว่องไว". */
  label: string;
  mod: number;
  /** What the bonus is, shown under the number (e.g. "พละ"). */
  modLabel?: string;
  /** Where the bonus comes from, in order — e.g. [["ค่าพละ", 2], ["เลเวล", 4], ["อาวุธ", 10]]. Sums to `mod`. */
  parts?: DicePart[];
  /** AC / DC the total must reach. */
  target: number;
  /** Why the target is what it is, e.g. "คุณ Lv 12 · มอน Lv 4". */
  targetNote?: string;
  /** Raw d20 faces in order — two when Loki forces a re-roll. */
  rolls: number[];
  success: boolean;
  /** Verdict words (default สำเร็จ / ล้มเหลว). */
  win?: string;
  lose?: string;
}

/**
 * Combat to-hit by level (hunts both ways + /duel): hit when d20 + mod > 10 + log1.2(defender lv / attacker lv).
 * Returned as the integer the total must reach (smallest whole number above the threshold): equal levels → 11,
 * attacker 2× the defender's level → 7, half → 15. Use with d20Success (nat 20 / nat 1 still decide).
 */
export function levelDC(attackerLv: number, defenderLv: number): number {
  const a = Math.max(1, attackerLv);
  const b = Math.max(1, defenderLv);
  return Math.floor(10 + Math.log(b / a) / Math.log(1.2) + 1e-9) + 1;
}

/** Standard d20 rule: nat 20 always hits, nat 1 always misses. */
export const d20Success = (roll: number, mod: number, target: number) => roll === 20 || (roll !== 1 && roll + mod >= target);

const signed = (n: number) => `${n < 0 ? '−' : '+'}${Math.abs(n)}`;

/** One-line roll for text logs: "🎲 2 +16 = 18 · ต้อง 6" (no bonus: "🎲 5 · ต้อง 12"). */
export const rollTag = (roll: number, mod: number, target: number) =>
  mod ? `🎲 ${roll} ${signed(mod)} = ${roll + mod} · ต้อง ${target}` : `🎲 ${roll} · ต้อง ${target}`;
