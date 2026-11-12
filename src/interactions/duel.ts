/**
 * Duel UI (public, in chat). customId: du:<duelId>:<accept|decline|hit|smash|guard|give>
 * Duels live in memory only — just for fun, nothing is saved; a bot restart drops them.
 */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, type ButtonInteraction, type Message } from 'discord.js';
import { loadCharacter } from '../game/character.js';
import { duelAct, duelForfeit, startDuel, type Duel, type DuelAction } from '../game/duel.js';
import { bar, COLORS } from '../ui.js';
import { playDice } from './dice.js';

const CHALLENGE_MS = 60_000;
const TURN_MS = 90_000;

interface Live {
  id: string;
  challenger: string;
  target: string;
  duel?: Duel;
  busy: boolean;
  timer?: NodeJS.Timeout;
  message?: Message;
}

const duels = new Map<string, Live>();
const byUser = new Map<string, string>();

export const inDuel = (userId: string) => byUser.has(userId);

function end(live: Live): void {
  clearTimeout(live.timer);
  duels.delete(live.id);
  for (const u of [live.challenger, live.target]) if (byUser.get(u) === live.id) byUser.delete(u);
}

const btn = (id: string, action: string, label: string, style: ButtonStyle, emoji: string) =>
  new ButtonBuilder().setCustomId(`du:${id}:${action}`).setLabel(label).setStyle(style).setEmoji(emoji);

// ---------- challenge ----------

/** Register a challenge; returns its id (caller posts `challengeView`). */
export function openChallenge(challenger: string, target: string): string {
  const id = Math.random().toString(36).slice(2, 10);
  duels.set(id, { id, challenger, target, busy: false });
  byUser.set(challenger, id);
  byUser.set(target, id);
  return id;
}

export function challengeView(id: string, challengerName: string, targetName: string) {
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.crimson)
        .setTitle('⚔️ คำท้าดวล!')
        .setDescription(
          `**${challengerName}** ขว้างถุงมือเปื้อนเลือดใส่หน้า **${targetName}**\n\n` +
            `-# หมดเวลาใน ${CHALLENGE_MS / 1000} วิ`,
        ),
    ],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        btn(id, 'accept', 'รับคำท้า', ButtonStyle.Danger, '⚔️'),
        btn(id, 'decline', 'ไม่เอาด้วย', ButtonStyle.Secondary, '🏳️'),
      ),
    ],
  };
}

/** Expire the challenge if nobody answers. */
export function armChallenge(id: string, message: Message): void {
  const live = duels.get(id);
  if (!live) return;
  live.message = message;
  live.timer = setTimeout(() => {
    if (live.duel) return;
    end(live);
    void message
      .edit({ embeds: [new EmbedBuilder().setColor(COLORS.bone).setDescription('⌛ คำท้าดวลหมดเวลา — อีกฝ่ายแกล้งทำเป็นไม่เห็น')], components: [] })
      .catch(() => {});
  }, CHALLENGE_MS);
}

// ---------- fight ----------

function duelView(id: string, d: Duel) {
  const over = d.winner !== undefined;
  const rows = d.fighters.map((f, idx) => {
    const marker = over ? (d.winner === idx ? '🏆' : '💀') : d.turn === idx ? '▶️' : '▫️';
    return `${marker} **${f.name}**  \`${bar(f.hp, f.maxHp, 10)}\` ${f.hp}/${f.maxHp}${f.guarding ? ' 🛡️' : ''}`;
  });
  const turnLine = over ? '' : `\n\nตาของ <@${d.fighters[d.turn].id}> — ${TURN_MS / 1000} วิ`;
  const embed = new EmbedBuilder()
    .setColor(over ? COLORS.bone : COLORS.crimson)
    .setTitle(`⚔️ ดวล · รอบ ${d.round}`)
    .setDescription(`${rows.join('\n')}\n\n${d.log.slice(-6).join('\n')}${turnLine}`.slice(0, 4096));
  const components = over
    ? []
    : [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          btn(id, 'hit', 'ฟาด', ButtonStyle.Danger, '⚔️'),
          btn(id, 'smash', 'ทุ่มสุดตัว', ButtonStyle.Danger, '💢'),
          btn(id, 'guard', 'ตั้งการ์ด', ButtonStyle.Primary, '🛡️'),
          btn(id, 'give', 'ยอมแพ้', ButtonStyle.Secondary, '🏳️'),
        ),
      ];
  return { content: '', embeds: [embed], files: [], components };
}

/** Auto-forfeit whoever's turn it is if they stall. */
function armTurn(live: Live): void {
  clearTimeout(live.timer);
  live.timer = setTimeout(() => {
    const d = live.duel;
    if (!d || d.winner !== undefined || live.busy) return;
    duelForfeit(d, d.turn, `⌛ **${d.fighters[d.turn].name}** ยืนเหม่อเกิน ${TURN_MS / 1000} วิ`);
    const view = duelView(live.id, d);
    end(live);
    void live.message?.edit(view).catch(() => {});
  }, TURN_MS);
}

export async function handleDuelButton(i: ButtonInteraction): Promise<unknown> {
  const [, id, action] = i.customId.split(':');
  const live = duels.get(id ?? '');
  if (!live) return i.update({ components: [] }); // finished, expired, or bot restarted

  const me = i.user.id;
  const deny = (content: string) => i.reply({ content, flags: MessageFlags.Ephemeral });

  if (action === 'accept' || action === 'decline') {
    if (live.duel) return i.update({ components: [] });
    if (action === 'decline') {
      if (me !== live.target && me !== live.challenger) return deny('ไม่ใช่คำท้าของคุณ');
      end(live);
      const who = me === live.target ? 'ปฏิเสธคำท้า' : 'ยกเลิกคำท้า';
      return i.update({ embeds: [new EmbedBuilder().setColor(COLORS.bone).setDescription(`🏳️ <@${me}> ${who}`)], components: [] });
    }
    if (me !== live.target) return deny('คำท้านี้ไม่ได้ส่งถึงคุณ');
    const a = loadCharacter(live.challenger);
    const b = loadCharacter(live.target);
    if (!a || !b || a.fiend || b.fiend) {
      end(live);
      return i.update({ embeds: [new EmbedBuilder().setColor(COLORS.bone).setDescription('การดวลถูกยกเลิก — มีคนไม่พร้อม (ไม่มีตัวละคร/เป็น Fiend)')], components: [] });
    }
    live.duel = startDuel(a, b);
    live.message = i.message;
    armTurn(live);
    return i.update(duelView(live.id, live.duel));
  }

  const d = live.duel;
  if (!d) return deny('ยังไม่ได้รับคำท้า');
  const seat = d.fighters.findIndex((f) => f.id === me);
  if (seat < 0) return deny('คุณไม่ได้อยู่ในการดวลนี้ — นั่งดูเฉย ๆ ไป 🍿');

  if (action === 'give') {
    if (live.busy) return deny('รอลูกเต๋าหยุดก่อน');
    duelForfeit(d, seat as 0 | 1, `🏳️ **${d.fighters[seat]!.name}** โยนผ้าขาว`);
    end(live);
    return i.update(duelView(live.id, d));
  }

  if (seat !== d.turn) return deny('ยังไม่ถึงตาคุณ');
  if (live.busy) return deny('รอลูกเต๋าหยุดก่อน');
  if (action !== 'hit' && action !== 'smash' && action !== 'guard') return deny('?');

  live.busy = true;
  clearTimeout(live.timer);
  const step = duelAct(d, action as DuelAction);
  const view = duelView(live.id, d);
  if (step.ended) end(live);
  try {
    await i.deferUpdate();
    await playDice(i, step.dice && [step.dice], COLORS.crimson);
    await i.editReply(view);
  } finally {
    live.busy = false;
    if (!step.ended) armTurn(live);
  }
}
