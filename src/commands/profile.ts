import { EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { loadCharacter, saveCharacter } from '../game/character.js';
import { ICONS } from '../game/icons.js';
import { ROLES } from '../game/roles.js';
import { DOORS, getMoonMode, isCrimsonMoon, LOCATIONS, nextCrimsonMoon, setMoonMode, type MoonMode } from '../game/world.js';
import { COLORS, profilePayload } from '../ui.js';
import type { Command } from './types.js';

export const profile: Command = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('ดูข้อมูลตัวละคร')
    .addUserOption((o) => o.setName('user').setDescription('ของใคร (ค่าเริ่มต้น: ตัวเอง)')),
  async execute(i) {
    const user = i.options.getUser('user') ?? i.user;
    const char = loadCharacter(user.id);
    if (!char) {
      return i.reply({ content: `${user.id === i.user.id ? 'คุณ' : user.username}ยังไม่มีตัวละคร`, flags: MessageFlags.Ephemeral });
    }
    saveCharacter(char); // persist regen
    await i.deferReply(); // card render can exceed the 3s window on small hosts
    return i.editReply(await profilePayload(char));
  },
};

export const icons: Command = {
  data: new SlashCommandBuilder().setName('icons').setDescription('รูปบูชาทั้ง 7 — พร ผลกรรม และสีประตู'),
  async execute(i) {
    const e = new EmbedBuilder()
      .setColor(COLORS.blood)
      .setTitle('รูปบูชาของชาวเกาะ (The Icons)')
      .setDescription('-# การบูชาสิ่งอื่นนอกจาก 7 Icon นี้ถือเป็นนอกรีต')
      .addFields(
        Object.values(ICONS).map((c) => ({
          name: `${c.emoji} ${c.name} · ${DOORS[c.door].emoji} ${c.doorName}`,
          value: `${c.title} — *${c.concept}*\n✨ ${c.blessing}\n🩸 ${c.repercussion}`,
        })),
      );
    return i.reply({ embeds: [e], flags: MessageFlags.Ephemeral });
  },
};

export const roles: Command = {
  data: new SlashCommandBuilder().setName('roles').setDescription('บทบาททั้งหมดและความสามารถพิเศษ'),
  async execute(i) {
    const e = new EmbedBuilder()
      .setColor(COLORS.bone)
      .setTitle('บทบาทตัวละคร (Character Roles)')
      .addFields(
        Object.values(ROLES).map((r) => ({
          name: `${r.emoji} ${r.name}`,
          value: `${r.short}\nเริ่มที่: ${LOCATIONS[r.start].name} · ความเป็นมนุษย์ ${r.humanity}\n${r.perks.map((p) => `• ${p}`).join('\n')}`,
        })),
      );
    return i.reply({ embeds: [e], flags: MessageFlags.Ephemeral });
  },
};

export const world: Command = {
  data: new SlashCommandBuilder().setName('world').setDescription('สถานที่ และสถานะ Crimson Moon'),
  async execute(i) {
    const crimson = isCrimsonMoon();
    const next = Math.floor(nextCrimsonMoon() / 1000);
    const e = new EmbedBuilder()
      .setColor(crimson ? COLORS.crimson : COLORS.blood)
      .setTitle('FleshFall')
      .setDescription(
        crimson
          ? '🌕 **Crimson Moon กำลังส่องแสง** — จงหลบอยู่ในที่ร่ม แสงนี้กัดกร่อนสติ (เสียสติ x1.5 นอก Rouge Land)'
          : getMoonMode() === 'off'
            ? '🌑 ท้องฟ้ามืดสนิท — Crimson Moon ถูกปิดไว้'
            : `🌑 Crimson Moon ครั้งถัดไป: <t:${next}:F> (<t:${next}:R>)`,
      )
      .addFields(Object.values(LOCATIONS).map((l) => ({ name: `${l.emoji} ${l.name}`, value: l.desc })));
    return i.reply({ embeds: [e] });
  },
};

export const moon: Command = {
  data: new SlashCommandBuilder()
    .setName('moon')
    .setDescription('[แอดมิน] บังคับ Crimson Moon ขึ้น/ดับ หรือกลับตามตาราง')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((o) =>
      o
        .setName('mode')
        .setDescription('โหมด')
        .setRequired(true)
        .addChoices(
          { name: '🌕 ขึ้นเดี๋ยวนี้ (on)', value: 'on' },
          { name: '🌑 ดับ (off)', value: 'off' },
          { name: '🗓️ ตามตาราง ทุก 5 วัน 21:00–02:59 (auto)', value: 'auto' },
        ),
    ),
  async execute(i) {
    const mode = i.options.getString('mode', true) as MoonMode;
    setMoonMode(mode);
    if (mode === 'on') {
      const e = new EmbedBuilder()
        .setColor(COLORS.crimson)
        .setTitle('🌕 Crimson Moon ขึ้นแล้ว')
        .setDescription(
          'ระฆังเตือนดังทั่วเกาะ จันทร์เต็มดวงกลายเป็นสีเลือด แสงของมันกัดกร่อนสติของเศษเดนเนื้อทีละน้อย...\n\n' +
            '**ทุกคนจงหลบเข้าที่ร่ม**\n-# นอก Rouge Land เสียสติ x1.5 · เหตุการณ์ Crimson Moon ปรากฏแล้ว',
        );
      return i.reply({ embeds: [e] });
    }
    return i.reply({
      content: mode === 'off' ? '🌑 Crimson Moon ดับลง ท้องฟ้ากลับมามืดสนิท' : '🗓️ Crimson Moon กลับมาขึ้นตามตาราง',
      flags: mode === 'auto' ? MessageFlags.Ephemeral : undefined,
    });
  },
};
