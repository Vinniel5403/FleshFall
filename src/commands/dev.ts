import { MessageFlags, SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { addItem, isFallen, loadCharacter, saveCharacter } from '../game/character.js';
import { isDev } from '../game/dev.js';
import { autoHunt, fullHeal, raiseLevel, unFiend } from '../game/devTools.js';
import { inField } from '../game/expedition.js';
import { ITEMS, getItem, itemLabel } from '../game/items.js';
import type { Character } from '../game/types.js';
import { currentZone, travelNotice } from '../game/zones.js';
import { COLORS, resultEmbed } from '../ui.js';
import type { Command } from './types.js';

const ephemeral = MessageFlags.Ephemeral;

/** `user` option → that player's character (default: the caller's). Replies and returns null when missing. */
async function target(i: ChatInputCommandInteraction): Promise<Character | null> {
  const u = i.options.getUser('user') ?? i.user;
  const char = loadCharacter(u.id);
  if (!char) await i.reply({ content: `${u.username} ไม่มีตัวละคร`, flags: ephemeral });
  return char ?? null;
}

const who = (i: ChatInputCommandInteraction, c: Character) => (c.userId === i.user.id ? '' : ` (${c.name})`);

/** Dev role (God mode) tools: instant hunts, items, levels, heals. */
export const dev: Command = {
  data: new SlashCommandBuilder()
    .setName('dev')
    .setDescription('คำสั่งพิเศษสำหรับยศ Dev')
    .addSubcommand((s) =>
      s
        .setName('hunt')
        .setDescription('ล่าทันทีหลายรอบในเมืองที่อยู่ — ชนะทุกรอบ ได้ของ/XP จริง')
        .addIntegerOption((o) => o.setName('count').setDescription('จำนวนรอบ (ค่าเริ่มต้น 10)').setMinValue(1).setMaxValue(100))
        .addBooleanOption((o) => o.setName('deep').setDescription('ล่าลึกต่อเนื่อง มอนเลเวล+ของดีขึ้นทุกรอบ (ค่าเริ่มต้น: ใช่)'))
        .addBooleanOption((o) => o.setName('real').setDescription('สู้จริงด้วยลูกเต๋า แพ้ได้ (ค่าเริ่มต้น: ไม่ = ชนะแน่นอน)'))
        .addBooleanOption((o) => o.setName('heal').setDescription('ใช้กับ real: ฮีลเต็มก่อนทุกรอบ (ค่าเริ่มต้น: ไม่)')),
    )
    .addSubcommand((s) =>
      s
        .setName('give')
        .setDescription('เสกไอเทมเข้ากระเป๋า')
        .addStringOption((o) => o.setName('item').setDescription('ไอเทม').setRequired(true).setAutocomplete(true))
        .addIntegerOption((o) => o.setName('qty').setDescription('จำนวน (ค่าเริ่มต้น 1, ติดลบ = ลบออก)').setMinValue(-999).setMaxValue(999))
        .addUserOption((o) => o.setName('user').setDescription('ให้ใคร (ค่าเริ่มต้น: ตัวเอง)')),
    )
    .addSubcommand((s) =>
      s
        .setName('heal')
        .setDescription('ฟื้นเลือด/แรง/สติเต็ม และลุกจากสภาพล้ม')
        .addUserOption((o) => o.setName('user').setDescription('ใคร (ค่าเริ่มต้น: ตัวเอง)')),
    )
    .addSubcommand((s) =>
      s
        .setName('human')
        .setDescription('แก้ Fiend กลับเป็นคน (ความเป็นมนุษย์ 50 กลับ Rouge Land)')
        .addUserOption((o) => o.setName('user').setDescription('ใคร (ค่าเริ่มต้น: ตัวเอง)')),
    )
    .addSubcommand((s) =>
      s
        .setName('level')
        .setDescription('อัปเลเวลขึ้นไปถึงเลเวลที่กำหนด')
        .addIntegerOption((o) => o.setName('level').setDescription('เลเวลเป้าหมาย').setRequired(true).setMinValue(2).setMaxValue(99))
        .addUserOption((o) => o.setName('user').setDescription('ใคร (ค่าเริ่มต้น: ตัวเอง)')),
    )
    .addSubcommand((s) =>
      s
        .setName('flesh')
        .setDescription('เพิ่ม/ลด 🥩 เนื้อสด')
        .addIntegerOption((o) => o.setName('amount').setDescription('จำนวน (ติดลบ = ลด)').setRequired(true).setMinValue(-100000).setMaxValue(100000))
        .addUserOption((o) => o.setName('user').setDescription('ใคร (ค่าเริ่มต้น: ตัวเอง)')),
    ),

  async autocomplete(i) {
    const q = i.options.getFocused().toLowerCase();
    const hits = Object.values(ITEMS).filter((d) => !q || d.name.toLowerCase().includes(q) || d.id.includes(q));
    return i.respond(hits.slice(0, 25).map((d) => ({ name: `${d.emoji} ${d.name} · ${d.type}`.slice(0, 100), value: d.id })));
  },

  async execute(i) {
    if (!isDev(i.user.id)) return i.reply({ content: '🔒 คำสั่งนี้ใช้ได้เฉพาะยศ Dev', flags: ephemeral });
    const sub = i.options.getSubcommand();

    if (sub === 'hunt') {
      const char = loadCharacter(i.user.id);
      if (!char) return i.reply({ content: 'คุณยังไม่มีตัวละคร', flags: ephemeral });
      const road = travelNotice(char);
      if (road) return i.reply({ content: road, flags: ephemeral });
      if (char.fiend || isFallen(char)) return i.reply({ content: 'ตัวละครล้มอยู่หรือเป็น Fiend — `/dev heal` / `/dev human` ก่อน', flags: ephemeral });
      const count = i.options.getInteger('count') ?? 10;
      const r = autoHunt(char, count, { deep: i.options.getBoolean('deep') ?? true, heal: i.options.getBoolean('heal') ?? false, real: i.options.getBoolean('real') ?? false });
      saveCharacter(char);
      const loot = Object.entries(r.loot).map(([id, n]) => itemLabel(id, n));
      const lines = [
        `🏆 ชนะ **${r.wins}/${count}** รอบ${r.doors ? ` · 🚪 เจอประตู ${r.doors} บาน (ปล่อยผ่าน)` : ''}`,
        `✨ +${r.xp} XP${r.levels ? ` · 🆙 +${r.levels} เลเวล → Lv ${char.level}` : ''} · 🩸 ${char.hp}/${char.maxHp}`,
        loot.length ? `${inField(char) ? '🎒 เข้าของรอรับ' : '📦 เข้ากระเป๋า'}: ${loot.join(', ')}`.slice(0, 3500) : '📦 ไม่ได้ของ',
        ...(r.stop ? ['', `⛔ หยุดก่อนครบ: ${r.stop}`] : []),
      ];
      return i.reply({ embeds: [resultEmbed(char, `🎲 ล่าอัตโนมัติ ${count} รอบ — ${currentZone(char).name}`, lines, COLORS.blood)], flags: ephemeral });
    }

    const char = await target(i);
    if (!char) return;

    if (sub === 'give') {
      const id = i.options.getString('item', true);
      const def = getItem(id);
      if (!def) return i.reply({ content: `ไม่รู้จักไอเทม ${id}`, flags: ephemeral });
      const qty = i.options.getInteger('qty') ?? 1;
      addItem(char, id, qty);
      saveCharacter(char);
      return i.reply({ content: `✨ ${qty >= 0 ? 'เสก' : 'ลบ'} ${itemLabel(id, Math.abs(qty))}${who(i, char)} — ตอนนี้มี ${char.inventory[id] ?? 0}`, flags: ephemeral });
    }

    if (sub === 'heal') {
      fullHeal(char);
      saveCharacter(char);
      return i.reply({ content: `💚 ฟื้นเต็ม${who(i, char)} — 🩸 ${char.hp}/${char.maxHp} · ⚡ ${char.stamina}/${char.maxStamina} · 🧠 ${char.sanity}`, flags: ephemeral });
    }

    if (sub === 'human') {
      if (!unFiend(char)) return i.reply({ content: `${char.name} ยังเป็นคนอยู่`, flags: ephemeral });
      saveCharacter(char);
      return i.reply({ content: `🕊️ ${char.name} กลับเป็นคนแล้ว — ความเป็นมนุษย์ ${char.humanity} · อยู่ Rouge Land`, flags: ephemeral });
    }

    if (sub === 'level') {
      const lv = i.options.getInteger('level', true);
      if (!raiseLevel(char, lv)) return i.reply({ content: `${char.name} อยู่ Lv ${char.level} แล้ว — ลดเลเวลไม่ได้`, flags: ephemeral });
      saveCharacter(char);
      return i.reply({ content: `🆙 ${char.name} → **Lv ${char.level}** · 🩸 ${char.maxHp} · ความเป็นมนุษย์ ${char.humanity}`, flags: ephemeral });
    }

    if (sub === 'flesh') {
      const n = i.options.getInteger('amount', true);
      char.flesh = Math.max(0, char.flesh + n);
      saveCharacter(char);
      return i.reply({ content: `🥩 ${n >= 0 ? '+' : ''}${n} เนื้อสด${who(i, char)} — ตอนนี้มี ${char.flesh}`, flags: ephemeral });
    }
  },
};
