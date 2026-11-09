import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { isPanelMessage, PANELS, panelMessage, type PanelType } from '../interactions/panels.js';
import { ZONES } from '../game/zones.js';
import { ensureZoneRoles, zoneRoleId } from '../zoneRoles.js';
import type { Command } from './types.js';

export const panel: Command = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('[แอดมิน] วางเมนูปุ่มกดในห้องนี้ (ผู้เล่นกดอย่างเดียว ไม่ต้องพิมพ์)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((o) =>
      o
        .setName('type')
        .setDescription('เมนูแบบไหน')
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addBooleanOption((o) => o.setName('lock').setDescription('ปิดไม่ให้ @everyone พิมพ์ในห้องนี้ (ค่าเริ่มต้น: เปิด)')),
  async autocomplete(i) {
    const q = i.options.getFocused().toLowerCase();
    const hits = (Object.entries(PANELS) as [PanelType, (typeof PANELS)[PanelType]][]).filter(([v, p]) => !q || v.includes(q) || p.label.toLowerCase().includes(q));
    return i.respond(hits.slice(0, 25).map(([value, p]) => ({ name: p.label, value })));
  },
  async execute(i) {
    const type = i.options.getString('type', true) as PanelType;
    if (!PANELS[type]) return i.reply({ content: `ไม่รู้จักเมนู ${type}`, flags: MessageFlags.Ephemeral });
    const lock = i.options.getBoolean('lock') ?? true;
    const channel = i.channel;
    if (!channel?.isSendable() || !i.inGuild()) return i.reply({ content: 'วางเมนูในห้องนี้ไม่ได้', flags: MessageFlags.Ephemeral });
    await i.deferReply({ flags: MessageFlags.Ephemeral });
    const notes: string[] = [];

    // Replace any previous panel the bot posted here
    try {
      const recent = await channel.messages.fetch({ limit: 50 });
      const old = recent.filter(
        (m) => m.author.id === i.client.user.id && isPanelMessage(m.components.flatMap((r) => ('components' in r ? r.components : []).map((c) => ('customId' in c ? (c.customId ?? '') : '')))),
      );
      for (const m of old.values()) await m.delete();
      if (old.size) notes.push(`🗑️ ลบเมนูเก่า ${old.size} อัน`);
    } catch {
      notes.push('⚠️ อ่านประวัติห้องไม่ได้ — ข้ามการลบเมนูเก่า');
    }

    await channel.send(panelMessage(type));
    notes.unshift(`✅ วาง ${PANELS[type]?.label ?? type} แล้ว`);

    if (lock && 'permissionOverwrites' in channel) {
      try {
        await channel.permissionOverwrites.edit(i.client.user.id, { ViewChannel: true, SendMessages: true, EmbedLinks: true, AttachFiles: true, ReadMessageHistory: true });
        await channel.permissionOverwrites.edit(i.guildId, {
          SendMessages: false,
          AddReactions: false,
          CreatePublicThreads: false,
          CreatePrivateThreads: false,
          SendMessagesInThreads: false,
          ReadMessageHistory: true,
        });
        notes.push('🔒 ล็อกห้องแล้ว: @everyone พิมพ์ไม่ได้ เห็นแค่เมนู');
        if (ZONES[type] && i.guild) {
          await ensureZoneRoles(i.guild);
          const role = zoneRoleId(type);
          if (role) {
            await channel.permissionOverwrites.edit(i.guildId, { ViewChannel: false });
            await channel.permissionOverwrites.edit(role, { ViewChannel: true, ReadMessageHistory: true, SendMessages: false });
            notes.push(`📍 ห้องนี้เห็นเฉพาะคนที่มียศ <@&${role}> (คนที่อยู่ ${ZONES[type]!.name})`);
          }
        }
      } catch {
        notes.push('⚠️ ล็อกห้องไม่ได้ — ให้บอทมีสิทธิ์ **Manage Roles/Permissions** หรือตั้งเอง: @everyone ปิด Send Messages');
      }
    }
    notes.push('-# ข้อความเก่าของคนอื่นในห้องนี้ บอทไม่ลบให้ — ลบเองถ้าอยากให้ห้องเหลือแค่เมนู');
    return i.editReply(notes.join('\n'));
  },
};
