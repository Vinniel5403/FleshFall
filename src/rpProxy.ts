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
 *
 * Editing / deleting your own proxied message (who wrote what is kept in db `proxied`, capped):
 * - react ❌ → the bot deletes it
 * - react ✏️ (or 📝) → the bot DMs you, and your next DM reply (within 5 min) replaces the text
 *   (`ยกเลิก` cancels). Reactions from anyone but the author are removed.
 * Needs the GuildMessageReactions + DirectMessages intents and Message/Reaction/Channel/User partials
 * (added in index.ts when PROXY=1).
 */
import {
  ChannelType,
  Events,
  type AnyThreadChannel,
  type Client,
  type Message,
  type MessageReaction,
  type PartialMessageReaction,
  type PartialUser,
  type User,
  type Webhook,
} from 'discord.js';
import { config } from './config.js';
import { db } from './db/index.js';
import { imageUrl, pickImage } from './game/account.js';
import { loadCharacter } from './game/character.js';
import type { Character } from './game/types.js';
import { ROLE_ART, ROLE_AVATAR } from './render/kit.js';

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
  return WEB_URL ? `${WEB_URL.replace(/\/$/, '')}/${ROLE_AVATAR[char.role] ?? ROLE_ART[char.role]}` : undefined;
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
  const sent = await hook.send({
    content: content || undefined,
    username: char.name.slice(0, 80),
    avatarURL: avatarFor(char),
    files: m.attachments.map((a) => ({ attachment: a.url, name: a.name, description: a.description ?? undefined })),
    threadId: thread?.id,
    allowedMentions: { parse: ['users'] }, // never let a proxy ping @everyone / roles
  });
  db.saveProxied(sent.id, { authorId: m.author.id, channelId: base.id, threadId: thread?.id, at: Date.now() });
  // only after the repost worked, so nothing is lost on failure
  await m.delete().catch((e) => console.warn('proxy: delete failed', (e as Error).message));
}

// ---- edit / delete own proxied messages -------------------------------------------------

const EDIT_TTL = 5 * 60_000;
const DELETE_EMOJI = '❌';
const EDIT_EMOJI = new Set(['✏', '📝']); // ✏️ arrives with or without the U+FE0F variation selector
/** userId → message waiting for its new text (one pending edit per user, memory only). */
const pendingEdits = new Map<string, { messageId: string; channelId: string; threadId?: string; url: string; prefix: string; expires: number }>();

/** Leading "↪ reply" quote line added by the proxy — kept when the text is edited. */
const quotePrefix = (content: string) => /^> ↪ [^\n]*\n/.exec(content)?.[0] ?? '';
const clip = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

async function onReaction(r: MessageReaction | PartialMessageReaction, u: User | PartialUser): Promise<void> {
  if (u.bot) return;
  const name = (r.emoji.name ?? '').replace(/\uFE0F/g, '');
  const isDelete = name === DELETE_EMOJI;
  const isEdit = EDIT_EMOJI.has(name);
  if (!isDelete && !isEdit) return;
  const rec = db.getProxied(r.message.id);
  if (!rec) return;
  const reaction = r.partial ? await r.fetch() : r;
  // only the author may edit/delete; clear anyone else's ❌/✏️ (needs Manage Messages)
  if (u.id !== rec.authorId) {
    await reaction.users.remove(u.id).catch(() => {});
    return;
  }
  const msg = reaction.message.partial ? await reaction.message.fetch() : reaction.message;
  if (isDelete) {
    await msg.delete();
    db.deleteProxied(msg.id);
    return;
  }
  await reaction.users.remove(u.id).catch(() => {});
  const prefix = quotePrefix(msg.content);
  const current = msg.content.slice(prefix.length);
  const user = u.partial ? await u.fetch() : u;
  const quoted = current ? clip(current, 1500).replace(/^/gm, '> ') : '> *(ไม่มีข้อความ)*';
  const dm = await user
    .send(`✏️ จะแก้ข้อความนี้เป็นอะไร? พิมพ์ข้อความใหม่ตอบกลับมาภายใน 5 นาที (พิมพ์ \`ยกเลิก\` เพื่อยกเลิก)\n${msg.url}\n${quoted}`)
    .catch(() => null); // DMs closed → nothing else to do
  if (!dm) return;
  pendingEdits.set(u.id, { messageId: msg.id, channelId: rec.channelId, threadId: rec.threadId, url: msg.url, prefix, expires: Date.now() + EDIT_TTL });
}

async function onDirectMessage(m: Message, botId: string): Promise<void> {
  if (m.author.bot || m.channel.type !== ChannelType.DM) return;
  const p = pendingEdits.get(m.author.id);
  if (!p) return;
  pendingEdits.delete(m.author.id);
  if (Date.now() > p.expires) {
    await m.reply('⌛ หมดเวลาแก้ข้อความแล้ว — กด ✏️ ที่ข้อความอีกครั้ง').catch(() => {});
    return;
  }
  const text = m.content.trim();
  if (text === 'ยกเลิก') {
    await m.reply('ยกเลิกการแก้ข้อความแล้ว').catch(() => {});
    return;
  }
  if (!text) {
    await m.reply('ข้อความว่างแก้ไม่ได้ — ถ้าจะลบให้กด ❌ ที่ข้อความแทน').catch(() => {});
    return;
  }
  const ch = await m.client.channels.fetch(p.channelId).catch(() => null);
  if (!ch || !('fetchWebhooks' in ch)) {
    await m.reply('หาห้องของข้อความนั้นไม่เจอแล้ว').catch(() => {});
    return;
  }
  const hook = await webhookFor(ch as HookChannel, botId);
  await hook.editMessage(p.messageId, {
    content: (p.prefix + text).slice(0, 2000),
    threadId: p.threadId,
    allowedMentions: { parse: ['users'] },
  });
  await m.reply(`✅ แก้ข้อความแล้ว ${p.url}`).catch(() => {});
}

export function startProxy(client: Client): void {
  if (!proxyEnabled) return;
  console.log(`🎭 RP proxy on everywhere except: ${EXCLUDE.join(', ') || '(nothing)'}`);
  client.on(Events.MessageCreate, (m) => {
    if (!m.inGuild()) {
      void onDirectMessage(m, client.user!.id).catch((e) => {
        console.warn('proxy edit failed', (e as Error).message);
        void m.reply('❌ แก้ข้อความไม่สำเร็จ (ข้อความอาจถูกลบไปแล้ว)').catch(() => {});
      });
      return;
    }
    void proxy(m, client.user!.id).catch((e) => console.warn('proxy failed', (e as Error).message));
  });
  client.on(Events.MessageReactionAdd, (r, u) => {
    void onReaction(r, u).catch((e) => console.warn('proxy reaction failed', (e as Error).message));
  });
}
