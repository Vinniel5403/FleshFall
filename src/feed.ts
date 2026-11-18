/**
 * Global activity feed channel: posts what players are up to (hunts, dungeons, deaths, level-ups…) so the
 * server always looks alive. Game logic emits via src/game/feed.ts; here events are batched every
 * FEED_FLUSH_SECONDS into one message (repeated hunts by the same player merge into one line).
 *
 * Env: FEED_CHANNEL = channel id or name (unset = off) · FEED_FLUSH_SECONDS (default 20) · FEED_DEV=1 also
 * shows Dev/God-mode characters (handy for testing; hidden by default).
 */
import { ChannelType, type Client, type TextChannel } from 'discord.js';
import { config } from './config.js';
import { setFeedSink, type FeedEvent, type FeedKind } from './game/feed.js';

const EMOJI: Record<FeedKind, string> = {
  hunt: '⚔️',
  rare: '💎',
  dungeon: '🚪',
  shrine: '✨',
  level: '🎉',
  home: '📦',
  downed: '🩸',
  dying: '🩸',
  death: '☠️',
  breakdown: '🌀',
  fiend: '👹',
  rescue: '🤝',
  forge: '⚒️',
  duel: '🤺',
  newcomer: '🕯️',
};

const MAX_LEN = 1900;
const QUEUE_CAP = 200;

let queue: FeedEvent[] = [];
let channel: TextChannel | null = null;

export const feedEnabled = () => !!process.env.FEED_CHANNEL;

/** Collapse a batch: several hunts by one player in one place → one line with a count; level-ups → the latest. */
export function formatBatch(events: FeedEvent[]): string[] {
  const lines: string[] = [];
  const huntLine = new Map<string, { idx: number; n: number; text: string }>();
  const levelLine = new Map<string, number>();
  for (const e of events) {
    if (e.kind === 'hunt') {
      const key = `${e.userId}|${e.where ?? ''}`;
      const seen = huntLine.get(key);
      if (seen) {
        seen.n += 1;
        seen.text = e.text; // latest streak count wins
        lines[seen.idx] = `${EMOJI.hunt} ${seen.text} ×${seen.n}`;
        continue;
      }
      huntLine.set(key, { idx: lines.length, n: 1, text: e.text });
    } else if (e.kind === 'level') {
      // several level-ups in one batch → only the newest level
      const at = levelLine.get(e.userId);
      if (at !== undefined) {
        lines[at] = `${EMOJI.level} ${e.text}`;
        continue;
      }
      levelLine.set(e.userId, lines.length);
    }
    lines.push(`${EMOJI[e.kind]} ${e.text}`);
  }
  return lines;
}

/** Split lines into Discord-sized messages. */
function chunks(lines: string[]): string[] {
  const out: string[] = [];
  let cur = '';
  for (const l of lines) {
    if (cur && cur.length + l.length + 1 > MAX_LEN) (out.push(cur), (cur = ''));
    cur = cur ? `${cur}\n${l}` : l.slice(0, MAX_LEN);
  }
  if (cur) out.push(cur);
  return out;
}

async function flush(): Promise<void> {
  if (!channel || !queue.length) return;
  const batch = queue;
  queue = [];
  for (const content of chunks(formatBatch(batch))) {
    await channel.send({ content, allowedMentions: { parse: [] } }).catch((e) => console.warn('feed: send failed', e?.message ?? e));
  }
}

async function resolveChannel(client: Client): Promise<TextChannel | null> {
  const want = process.env.FEED_CHANNEL!.trim();
  const byId = await client.channels.fetch(want).catch(() => null);
  if (byId?.type === ChannelType.GuildText) return byId;
  const guild = config.guildId ? await client.guilds.fetch(config.guildId).catch(() => null) : client.guilds.cache.first();
  const all = await guild?.channels.fetch().catch(() => null);
  const named = all?.find((c) => c?.type === ChannelType.GuildText && c.name === want.replace(/^#/, ''));
  return (named as TextChannel | undefined) ?? null;
}

export async function startFeed(client: Client): Promise<void> {
  if (!feedEnabled()) return;
  channel = await resolveChannel(client);
  if (!channel) return console.warn(`feed: channel "${process.env.FEED_CHANNEL}" not found — feed off`);
  const showDev = process.env.FEED_DEV === '1';
  setFeedSink((e) => {
    if (e.dev && !showDev) return;
    if (queue.length < QUEUE_CAP) queue.push(e);
  });
  const every = Math.max(5, Number(process.env.FEED_FLUSH_SECONDS ?? 20)) * 1000;
  setInterval(() => void flush(), every).unref();
  console.log(`feed: posting to #${channel.name} every ${every / 1000}s`);
}
