import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { createCharacter, loadCharacter } from '../game/character.js';
import { ICONS } from '../game/icons.js';
import { ROLES } from '../game/roles.js';
import type { IconId, RoleId } from '../game/types.js';
import { LOCATIONS } from '../game/world.js';
import { profileEmbed } from '../ui.js';
import type { Command } from './types.js';

const WEB_URL = process.env.WEB_URL;

const cut = (s: string) => (s.length > 100 ? s.slice(0, 99) + '…' : s);

export const start: Command = {
  data: new SlashCommandBuilder()
    .setName('start')
    .setDescription('สร้างตัวละคร (บนเว็บ FleshFall)')
    .addStringOption((o) => o.setName('name').setDescription('ชื่อตัวละคร').setRequired(false).setMaxLength(32))
    .addStringOption((o) =>
      o
        .setName('role')
        .setDescription('บทบาท')
        .setRequired(false)
        .addChoices(...Object.values(ROLES).map((r) => ({ name: cut(`${r.emoji} ${r.name} — ${r.short}`), value: r.id }))),
    )
    .addStringOption((o) =>
      o
        .setName('icon')
        .setDescription('Icon ที่บูชา (ให้พรและผลกรรม)')
        .setRequired(false)
        .addChoices(...Object.values(ICONS).map((c) => ({ name: cut(`${c.emoji} ${c.name} — ${c.blessing}`), value: c.id }))),
    ),
  async execute(i) {
    const existing = loadCharacter(i.user.id);
    if (existing && !existing.fiend) {
      return i.reply({ content: 'คุณมีตัวละครอยู่แล้ว ดูที่ `/profile`', flags: MessageFlags.Ephemeral });
    }
    // Characters (and their art) are made on the website; in-Discord creation is a local-dev fallback.
    if (WEB_URL) {
      return i.reply({ content: `🩸 สร้างตัวละครและอัปโหลดภาพได้ที่เว็บ → ${WEB_URL}/create`, flags: MessageFlags.Ephemeral });
    }
    const name = i.options.getString('name')?.trim();
    const role = i.options.getString('role') as RoleId | null;
    const icon = i.options.getString('icon') as IconId | null;
    if (!name || !role || !icon) {
      return i.reply({ content: 'ใส่ name, role และ icon ให้ครบ', flags: MessageFlags.Ephemeral });
    }
    const char = createCharacter(i.user.id, name, role, icon);
    const intro =
      role === 'outsider'
        ? `**${char.name}** ลืมตาขึ้นในห้องนอนของตัวเอง... แต่สัดส่วนผิดเพี้ยนไป กลิ่น Miasma ทำให้อาเจียนทันที\nยินดีต้อนรับสู่ ${LOCATIONS['old_realm'].name}`
        : `**${char.name}** ปฏิญาณตนต่อ **${ICONS[icon].name}** — *${ICONS[icon].concept}*\nยินดีต้อนรับสู่ ${LOCATIONS[char.location].name}`;
    return i.reply({ content: intro, embeds: [profileEmbed(char)] });
  },
};
