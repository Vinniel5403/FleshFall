/**
 * Falling in the field (see fallMode in game/character.ts):
 * - fl:<uid>:placenta | giveup — the hard/epic dying choice.
 * - /wake @user — a friend in the same city wakes a downed (easy/normal) character.
 */
import { MessageFlags, SlashCommandBuilder, type ButtonInteraction } from 'discord.js';
import { giveUpDying, loadCharacter, placentaRevive, saveCharacter, wakeUp } from '../game/character.js';
import type { Command } from '../commands/types.js';
import { requireCharacter } from '../commands/guard.js';
import { COLORS, dungeonButtons, dungeonPayload, resultEmbed } from '../ui.js';
import { syncMember } from '../zoneRoles.js';
import { huntButtons, huntPayload } from './hunt.js';

export async function handleFallButton(i: ButtonInteraction): Promise<unknown> {
  const [, ownerId, action] = i.customId.split(':');
  if (i.user.id !== ownerId) return i.reply({ content: 'นี่ไม่ใช่ร่างของคุณ', flags: MessageFlags.Ephemeral });
  const char = loadCharacter(i.user.id);
  if (!char || char.fiend || !char.dying) return i.update({ components: [] }); // stale (timed out / already chosen)

  if (action === 'giveup') {
    const lines = giveUpDying(char);
    saveCharacter(char);
    await i.update({ embeds: [resultEmbed(char, '☠️ คุณยอมรับความตาย', lines, COLORS.blood)], files: [], components: [], content: null });
    await syncMember(char.userId).catch(() => {});
    return;
  }

  const r = placentaRevive(char);
  if (!r.ok) return i.reply({ content: r.lines.join('\n'), flags: MessageFlags.Ephemeral });
  saveCharacter(char);
  await i.deferUpdate();
  if (char.hunt && !char.hunt.won) return i.editReply({ ...(await huntPayload(char, r.lines)), components: huntButtons(char) });
  if (char.run) {
    const row = dungeonButtons(char);
    return i.editReply({ ...(await dungeonPayload(char)), content: r.lines.join('\n'), components: row ? [row] : [] });
  }
  return i.editReply({ embeds: [resultEmbed(char, '🥚 ฟื้นคืนชีพ', r.lines, COLORS.shrine)], files: [], components: [], content: null });
}

export const wake: Command = {
  data: new SlashCommandBuilder()
    .setName('wake')
    .setDescription('ปลุกเพื่อนที่หมดสติอยู่ในเมืองเดียวกัน (เมืองระดับ Easy/Normal)')
    .addUserOption((o) => o.setName('user').setDescription('เพื่อนที่หมดสติ').setRequired(true)),
  async execute(i) {
    const me = await requireCharacter(i);
    if (!me) return;
    const target = i.options.getUser('user', true);
    const friend = loadCharacter(target.id);
    if (!friend) return i.reply({ content: `${target.username} ไม่มีตัวละคร`, flags: MessageFlags.Ephemeral });
    const r = wakeUp(friend, me);
    if (!r.ok) return i.reply({ content: r.error, flags: MessageFlags.Ephemeral });
    saveCharacter(me);
    saveCharacter(friend);
    await i.reply({ content: `<@${target.id}>`, embeds: [resultEmbed(friend, '🤝 ปลุกเพื่อน', r.lines, COLORS.bone)], allowedMentions: { users: [target.id] } });
    await syncMember(friend.userId).catch(() => {});
  },
};
