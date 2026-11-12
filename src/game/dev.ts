/**
 * Dev mode (God mode): players holding the Discord "Dev" role skip limits
 * (instant travel, free shop/upgrade/cook, no cooldowns, no stamina cost).
 * The Discord layer refreshes membership on every interaction; game logic just asks isDev().
 */
const devs = new Set<string>();

export function setDev(userId: string, on: boolean): void {
  if (on) devs.add(userId);
  else devs.delete(userId);
}

export const isDev = (c: { userId: string } | string): boolean => devs.has(typeof c === 'string' ? c : c.userId);
