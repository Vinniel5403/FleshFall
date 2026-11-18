/**
 * Global activity feed ("what is everyone doing"): game logic reports milestones here, the Discord layer
 * (src/feed.ts) batches them into a public channel. Discord-free — with no sink attached (offline sims,
 * the standalone web API) every call is a no-op.
 */
import { isDev } from './dev.js';

export type FeedKind =
  | 'hunt' // cleared a 3-monster hunt
  | 'rare' // rare drop
  | 'dungeon' // walked out of a dungeon
  | 'shrine' // Icon blessing
  | 'level'
  | 'home' // made it back to Rouge Land with a haul
  | 'downed' // knocked out in an easy/normal city (a friend can /wake)
  | 'dying' // fallen in a hard/epic city
  | 'death'
  | 'breakdown'
  | 'fiend'
  | 'rescue' // /wake, /revive
  | 'forge' // max upgrade / weapon fusing milestone
  | 'duel'
  | 'newcomer';

export interface FeedEvent {
  kind: FeedKind;
  userId: string;
  /** character name, already in `text` — kept for grouping */
  name: string;
  /** Thai line, without the leading emoji */
  text: string;
  /** zone/where, used to merge repeated hunts */
  where?: string;
  /** Dev (God mode) characters — the Discord layer hides these unless FEED_DEV=1 */
  dev: boolean;
  at: number;
}

let sink: ((e: FeedEvent) => void) | null = null;

/** Discord layer attaches the channel poster here (once, at startup). */
export function setFeedSink(fn: ((e: FeedEvent) => void) | null): void {
  sink = fn;
}

/** Report a milestone for `char`. Never throws — the feed must not break gameplay. */
export function feed(char: { userId: string; name: string }, kind: FeedKind, text: string, where?: string): void {
  if (!sink) return;
  try {
    sink({ kind, userId: char.userId, name: char.name, text, where, dev: isDev(char), at: Date.now() });
  } catch {
    /* ignore */
  }
}
