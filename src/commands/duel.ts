import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { loadCharacter } from '../game/character.js';
import { armChallenge, challengeView, inDuel, openChallenge } from '../interactions/duel.js';
import { requireActive } from './guard.js';
import type { Command } from './types.js';

export const duel: Command = {
  data: new SlashCommandBuilder()
    .setName('duel')
    .setDescription('ท้าดวลผู้เล่นอื่นในแชท')
    .addUserOption((o) => o.setName('opponent').setDescription('คนที่จะท้าดวล').setRequired(true)),
  async execute(i) {
    const me = await requireActive(i);
    if (!me) return;
    const target = i.options.getUser('opponent', true);
    const no = (content: string) => i.reply({ content, flags: MessageFlags.Ephemeral });
    if (target.id === i.user.id) return no('ตีตัวเองไม่ได้ (ไปห้อง Butchery ถ้าอยากทำแบบนั้น)');
    if (target.bot) return no('บอทไม่รับคำท้า มันกลัว');
    const foe = loadCharacter(target.id);
    if (!foe) return no(`<@${target.id}> ยังไม่มีตัวละคร`);
    if (foe.fiend) return no(`**${foe.name}** กลายเป็น Fiend ไปแล้ว — ไม่รับดวล รับแต่กินคน`);
    if (inDuel(i.user.id)) return no('คุณมีคำท้า/การดวลค้างอยู่แล้ว');
    if (inDuel(target.id)) return no(`**${foe.name}** กำลังดวลกับคนอื่นอยู่`);

    const id = openChallenge(i.user.id, target.id);
    const res = await i.reply({
      content: `<@${target.id}>`,
      allowedMentions: { users: [target.id] },
      ...challengeView(id, me.name, foe.name),
      withResponse: true,
    });
    if (res.resource?.message) armChallenge(id, res.resource.message);
  },
};
