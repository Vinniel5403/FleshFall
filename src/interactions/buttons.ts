import { MessageFlags, type ButtonInteraction } from 'discord.js';
import { loadCharacter, saveCharacter } from '../game/character.js';
import { advance, exitDungeon, resolveChoice, retreat, type ExitChoice } from '../game/engine.js';
import type { Character } from '../game/types.js';
import { COLORS, dungeonButtons, eventButtons, eventPayload, resultEmbed } from '../ui.js';

/** Ephemeral if the clicked message was ephemeral (e.g. dungeon entered from a panel hunt). */
const sameVisibility = (i: ButtonInteraction) => (i.message.flags.has(MessageFlags.Ephemeral) ? MessageFlags.Ephemeral : undefined);

async function ownerCheck(i: ButtonInteraction, ownerId: string | undefined): Promise<Character | null> {
  if (i.user.id !== ownerId) {
    await i.reply({ content: 'นี่ไม่ใช่ฝันร้ายของคุณ ใช้ `/explore` ของตัวเอง', flags: MessageFlags.Ephemeral });
    return null;
  }
  const char = loadCharacter(i.user.id);
  if (!char || char.fiend) {
    await i.update({ components: [] });
    return null;
  }
  return char;
}

/** ev:<userId>:<eventId>:<choiceId> */
export async function handleEventButton(i: ButtonInteraction): Promise<unknown> {
  const [, ownerId, eventId, choiceId] = i.customId.split(':');
  const char = await ownerCheck(i, ownerId);
  if (!char) return;
  if (char.pendingEvent?.eventId !== eventId) {
    // stale: already answered, expired, or replaced by a newer event
    await i.update({ components: [] });
    return i.followUp({ content: '⌛ เหตุการณ์นี้จบไปแล้ว — กด 🔍 สำรวจ เพื่อไปต่อ (ถ้ายังมีเหตุการณ์ค้างอยู่ จะเด้งกลับมาให้เลือกต่อ)', flags: MessageFlags.Ephemeral });
  }

  const result = resolveChoice(char, eventId!, choiceId!);
  if (!result) return i.reply({ content: 'ทางเลือกนี้ใช้ไม่ได้แล้ว', flags: MessageFlags.Ephemeral });
  saveCharacter(char);

  const { event, choice, outcome, applied, notes } = result;
  const body = [`*${event.description}*`, '', `➡️ **${choice.emoji ?? ''} ${choice.label}**`, outcome.text, ...notes, '', ...applied.lines];
  const color = applied.becameFiend ? COLORS.fiend : applied.died ? COLORS.blood : COLORS.rot;
  const nav = dungeonButtons(char);
  return i.update({ embeds: [resultEmbed(char, event.title, body, color)], files: [], components: nav ? [nav] : [] });
}

/** dg:<userId>:next | dg:<userId>:leave | dg:<userId>:exit:<black|red|icon> */
export async function handleDungeonButton(i: ButtonInteraction): Promise<unknown> {
  const [, ownerId, action, arg] = i.customId.split(':');
  const char = await ownerCheck(i, ownerId);
  if (!char) return;
  if (!char.run) return i.update({ components: [] });

  if (action === 'next') {
    if (char.run.stage !== 'between' || char.pendingEvent) return i.update({ components: [] });
    const step = advance(char);
    saveCharacter(char);
    await i.update({ components: [] });
    if (!step.event) {
      return i.followUp({ flags: sameVisibility(i), embeds: [resultEmbed(char, 'ร่างของคุณทนไม่ไหว', step.lines, COLORS.blood)] });
    }
    const v = await eventPayload(char, step.event, step.lines.length ? [`-# ${step.lines.join(' · ')}`, ''] : []);
    return i.followUp({ flags: sameVisibility(i), ...v, components: [eventButtons(char, step.event)] });
  }

  if (action === 'leave') {
    const step = retreat(char);
    if (!step.ok) return i.reply({ content: step.lines.join('\n'), flags: MessageFlags.Ephemeral });
    saveCharacter(char);
    await i.update({ components: [] });
    return i.followUp({ flags: sameVisibility(i), embeds: [resultEmbed(char, '⬛ ถอยออกจากดันเจียน', step.lines)] });
  }

  if (action === 'exit') {
    const step = exitDungeon(char, arg as ExitChoice);
    if (!step.ok) return i.reply({ content: step.lines.join('\n'), flags: MessageFlags.Ephemeral });
    saveCharacter(char);
    await i.update({ components: [] });
    return i.followUp({ flags: sameVisibility(i), embeds: [resultEmbed(char, '🚪 ออกจากดันเจียน', step.lines, arg === 'icon' ? COLORS.shrine : COLORS.rot)] });
  }
  return i.update({ components: [] });
}
