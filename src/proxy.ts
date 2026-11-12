/**
 * Roleplay proxy (Tupperbox-style): in RP channels a player's message is reposted through a
 * webhook under their character's name + portrait, and the original is deleted.
 *
 * Enabled only with PROXY=1, because it needs the privileged Message Content intent (turn it on in
 * the Developer Portal first, or login fails). Works in every channel except PROXY_EXCLUDE
 * (comma-separated channel or category names, default "ทั่วไป,Archive"). Bot needs Manage Webhooks +
 * Manage Messages there.
 *
 * Not proxied: messages starting with `\` (escape), `//` or wrapped in `(( ))` (OOC), players
 * without a character, bots/webhooks, empty messages (stickers only).
 */
import { Events, type AnyThreadChannel, type Client, type Message, type Webhook } from 'discord.js';
import { config } from './config.js';
import { imageUrl, pickImage } from './game/account.js';
import { loadCharacter } from './game/character.js';
import type { Character } from './game/types.js';
import { ROLE_ART } from './render/kit.js';

export const proxyEnabled = process.env.PROXY === '1';
/** Channel or category names where messages stay as the player (matched case-insensitively). */
const EXCLUDE = (process.env.PROXY_EXCLUDE ?? 'ทั่วไป,Archive')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const HOOK_NAME = 'FleshFall Proxy';
const WEB_URL = process.env.WEB_URL;

/** Channels that can own webhooks (text / news / forum / media all have fetchWebhooks). */
type HookChannel = Extract<NonNullable<AnyThreadChannel['parent']>, { fetchWebhooks: unknown }>;
const hooks = new Map<string, Promise<Webhook>>();

function webhookFor(ch: HookChannel, botId: string): Promise<Webhook> {
  let p = hooks.get(ch.id);
  if (!p) {
    p = (async () => {
      const all = await ch.fetchWebhooks();
      return all.find((w) => w.owner?.id === botId && w.name === HOOK_NAME) ?? (await ch.createWebhook({ name: HOOK_NAME, reason: 'FleshFall RP proxy' }));
    })();
    p.catch(() => hooks.delete(ch.id)); // retry next time (e.g. permission added later)
    hooks.set(ch.id, p);
  }
  return p;
}

/** Portrait → art → gallery from R2, else the role's stock art on the website. */
function avatarFor(char: Character): string | undefined {
  const img = pickImage(char, ['portrait', 'art', 'gallery']);
  const own = img && imageUrl(img.key);
  if (own) return own;
  return WEB_URL ? `${WEB_URL.replace(/\/$/, '')}/${ROLE_ART[char.role]}` : undefined;
}

const isOoc = (t: string) => t.startsWith('\\') || t.startsWith('//') || /^\(\(.*\)\)$/s.test(t.trim());

async function replyQuote(m: Message): Promise<string> {
  if (!m.reference?.messageId) return '';
  const ref = await m.fetchReference().catch(() => null);
  if (!ref) return '';
  const who = ref.webhookId ? ref.author.username : (ref.member?.displayName ?? ref.author.username);
  const text = ref.content.replace(/\s+/g, ' ').slice(0, 80) || (ref.attachments.size ? '📎 ไฟล์แนบ' : '…');
  return `> ↪ **${who}**: [${text}](${ref.url})\n`;
}

async function proxy(m: Message, botId: string): Promise<void> {
  if (m.author.bot || m.webhookId || m.system || !m.inGuild() || m.guildId !== config.guildId) return;
  const thread = m.channel.isThread() ? m.channel : null;
  const base = thread ? thread.parent : m.channel;
  if (!base || !('fetchWebhooks' in base)) return;
  const names = [base.name, base.parent?.name, thread?.name].filter(Boolean).map((n) => n!.toLowerCase());
  if (names.some((n) => EXCLUDE.includes(n))) return;
  if (isOoc(m.content) || (!m.content && m.attachments.size === 0)) return;
  const char = loadCharacter(m.author.id);
  if (!char) return;

  const hook = await webhookFor(base as HookChannel, botId);
  const content = ((await replyQuote(m)) + m.content).slice(0, 2000);
  await hook.send({
    content: content || undefined,
    username: char.name.slice(0, 80),
    avatarURL: avatarFor(char),
    files: m.attachments.map((a) => ({ attachment: a.url, name: a.name, description: a.description ?? undefined })),
    threadId: thread?.id,
    allowedMentions: { parse: ['users'] }, // never let a proxy ping @everyone / roles
  });
  // only after the repost worked, so nothing is lost on failure
  await m.delete().catch((e) => console.warn('proxy: delete failed', (e as Error).message));
}

export function startProxy(client: Client): void {
  if (!proxyEnabled) return;
  console.log(`🎭 RP proxy on everywhere except: ${EXCLUDE.join(', ') || '(nothing)'}`);
  client.on(Events.MessageCreate, (m) => {
    void proxy(m, client.user!.id).catch((e) => console.warn('proxy failed', (e as Error).message));
  });
}
