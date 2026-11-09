/**
 * God mode: players holding the Discord "Dev" role skip limits
 * (instant travel, free shop/upgrade/cook, no cooldowns, no stamina cost).
 * The Discord layer refreshes membership on every interaction; game logic just asks isGod().
 */
const gods = new Set<string>();

export function setGod(userId: string, on: boolean): void {
  if (on) gods.add(userId);
  else gods.delete(userId);
}

export const isGod = (c: { userId: string } | string): boolean => gods.has(typeof c === 'string' ? c : c.userId);
