import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { db } from '../db/index.js';
import { loadCharacter, saveCharacter } from '../game/character.js';
import { getZone, resolveTravel } from '../game/zones.js';
import { syncMember } from '../zoneRoles.js';
import type { Command } from './types.js';

export const arrive: Command = {
  data: new SlashCommandBuilder()
    .setName('arrive')
    .setDescription('[แอดมิน] ให้ทุกคนที่กำลังเดินทาง (หรือคนที่เลือก) ถึงปลายทางทันที')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((o) => o.setName('user').setDescription('เฉพาะคนนี้ (ไม่ใส่ = ทุกคน)')),
  async execute(i) {
    const only = i.options.getUser('user');
    const now = Date.now();
    const arrived: string[] = [];
    for (const c of only ? [loadCharacter(only.id)].filter((x) => !!x) : db.allCharacters()) {
      const char = loadCharacter(c.userId);
      if (!char?.traveling) continue;
      char.traveling.arriveAt = now;
      const to = getZone(char.traveling.to);
      resolveTravel(char, now);
      saveCharacter(char);
      arrived.push(`${char.name} → ${to?.emoji ?? ''} ${to?.name ?? '?'}`);
    }
    await i.reply({ content: arrived.length ? `⚡ ถึงทันที ${arrived.length} คน\n${arrived.join('\n')}` : 'ไม่มีใครกำลังเดินทาง', flags: MessageFlags.Ephemeral });
    for (const c of db.allCharacters()) await syncMember(c.userId).catch(() => {});
  },
};
