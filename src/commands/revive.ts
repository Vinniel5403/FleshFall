import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { itemCount, loadCharacter, removeItem, saveCharacter } from '../game/character.js';
import { isGod } from '../game/god.js';
import { COLORS, resultEmbed } from '../ui.js';
import { syncMember } from '../zoneRoles.js';
import type { Command } from './types.js';

/** Sophia's resurrection rite (from a green Icon shrine): bring a Fiend friend back. */
export const revive: Command = {
  data: new SlashCommandBuilder()
    .setName('revive')
    .setDescription('ใช้พิธีชุบชีวิตของ Sophia นำเพื่อนที่กลายเป็น Fiend กลับมา')
    .addUserOption((o) => o.setName('user').setDescription('เพื่อนที่จะชุบชีวิต').setRequired(true)),
  async execute(i) {
    const ephemeral = MessageFlags.Ephemeral;
    const target = i.options.getUser('user', true);
    const me = loadCharacter(i.user.id);
    if (!me) return i.reply({ content: 'คุณยังไม่มีตัวละคร — ใช้ `/start`', flags: ephemeral });
    if (me.fiend) return i.reply({ content: 'Fiend ประกอบพิธีไม่ได้', flags: ephemeral });
    if (target.id === i.user.id) return i.reply({ content: 'พิธีนี้ใช้กับตัวเองไม่ได้', flags: ephemeral });
    const god = isGod(me);
    if (!god && itemCount(me, 'sophia_rite') < 1) {
      return i.reply({ content: '🥚 คุณไม่มีพิธีชุบชีวิต — ต้องเคลียร์ดันเจียน Icon สีเขียวแล้วไปถึงศาลของ Sophia', flags: ephemeral });
    }
    const friend = loadCharacter(target.id);
    if (!friend) return i.reply({ content: `${target.username} ไม่มีตัวละคร`, flags: ephemeral });
    if (!friend.fiend) return i.reply({ content: `${friend.name} ยังเป็นมนุษย์อยู่ — พิธีนี้ใช้กับ Fiend เท่านั้น`, flags: ephemeral });

    if (!god) removeItem(me, 'sophia_rite');
    friend.fiend = false;
    friend.humanity = 25;
    friend.sanity = Math.max(friend.sanity, 40);
    friend.hp = Math.ceil(friend.maxHp / 2);
    friend.location = 'rouge_land';
    delete friend.zone;
    delete friend.traveling;
    delete friend.hunt;
    delete friend.run;
    delete friend.pendingEvent;
    friend.mutations.push('รอยแผลเป็นรูปไข่จากพิธีของ Sophia');
    saveCharacter(me);
    saveCharacter(friend);

    await i.reply({
      embeds: [
        resultEmbed(
          friend,
          `🥚 พิธีชุบชีวิตของ Sophia`,
          [
            `**${me.name}** วางไข่เนื้อสีชมพูลงบนร่างของ **${friend.name}** ไข่ค่อย ๆ กลืนร่าง Fiend ทั้งร่างเข้าไป...`,
            `เปลือกแตกออก — **${friend.name}** คืนร่างเป็นมนุษย์อีกครั้ง ฟื้นขึ้นที่ Rouge Land`,
            '',
            '🕊️ ความเป็นมนุษย์ 25 · 🧬 รอยแผลเป็นรูปไข่ติดตัวไปตลอดกาล',
          ],
          COLORS.shrine,
        ),
      ],
    });
    await syncMember(friend.userId).catch(() => {});
  },
};
