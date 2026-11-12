/** A d20 check, recorded for the dice animation (pure data, no Discord). */
export interface DiceRoll {
  /** Thai label shown above the die, e.g. "โจมตี", "ว่องไว". */
  label: string;
  mod: number;
  /** AC / DC the total must reach. */
  target: number;
  /** Raw d20 faces in order — two when Loki forces a re-roll. */
  rolls: number[];
  success: boolean;
  /** Verdict words (default สำเร็จ / ล้มเหลว). */
  win?: string;
  lose?: string;
}

/** Standard d20 rule: nat 20 always hits, nat 1 always misses. */
export const d20Success = (roll: number, mod: number, target: number) => roll === 20 || (roll !== 1 && roll + mod >= target);
