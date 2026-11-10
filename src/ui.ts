import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { balance } from './config.js';
import { noEmoji } from './render/kit.js';
import { renderProfileCard } from './render/profileCard.js';
import { DOOR_EN, renderSceneCard } from './render/sceneCards.js';
import { imagePayload, type ImagePayload } from './render/view.js';
import { gearAtk, gearDef, humanityTier, seesHints, statMod } from './game/character.js';
import { exitOptions, visibleChoices } from './game/engine.js';
import { ICON_BY_DOOR, ICONS } from './game/icons.js';
import { blessingsText } from './game/blessings.js';
import { itemLabel } from './game/items.js';
import { maidGrade, ROLES } from './game/roles.js';
import type { Character, GameEventDef } from './game/types.js';
import { closingShiftHour, DOORS, DUNGEON_RULES, isCrimsonMoon, LOCATIONS, STAT_NAMES } from './game/world.js';
import { currentZone, getZone, zoneLabel } from './game/zones.js';

export const COLORS = { blood: 0x8b0000, rot: 0x4b5320, bone: 0xd8cfc4, crimson: 0xdc143c, fiend: 0x1a0000, shrine: 0xe8e4f0 };

export function bar(cur: number, max: number, size = 10): string {
  const filled = Math.max(0, Math.min(size, Math.round((cur / max) * size)));
  return '█'.repeat(filled) + '░'.repeat(size - filled);
}

export function fmtDuration(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} ชม. ${m} นาที`;
  return m > 0 ? `${m} นาที ${s % 60} วิ` : `${s} วิ`;
}

export function statusLine(char: Character): string {
  return `${char.name} · 🩸 ${char.hp}/${char.maxHp} · ⚡ ${char.stamina}/${char.maxStamina} · 🫀 ${char.humanity} · 🧠 ${char.sanity}`;
}

const HALLUCINATIONS = [
  '-# *ผนังกำลังหายใจ... หรือเปล่า?*',
  '-# *มีคนยืนอยู่ข้างหลังคุณ ตลอดเวลา*',
  '-# *ตัวหนังสือบนจอ​สลับ​ที่​กัน​เอง*',
  '-# *คุณได้ยินเสียงตัวเองเรียกชื่อตัวเอง*',
];

export function profileEmbed(char: Character): EmbedBuilder {
  const role = ROLES[char.role];
  const icon = ICONS[char.icon];
  const need = balance.xpForLevel(char.level);
  const loc = LOCATIONS[char.location];
  const title = char.fiend
    ? `👹 ${char.name} — Fiend แห่ง ${icon.name}`
    : `${role.emoji} ${char.name} — Lv.${char.level} ${role.name}`;
  const e = new EmbedBuilder()
    .setColor(char.fiend ? COLORS.fiend : COLORS.blood)
    .setTitle(title)
    .setDescription(
      [
        `${icon.emoji} สาวกของ **${icon.name}** — ${icon.title}`,
        char.role === 'maid' ? `🎖️ M.A.I.D.S ${maidGrade(char.level)}` : null,
        char.traveling
          ? `🧭 กำลังเดินทางไป **${getZone(char.traveling.to)?.name ?? char.traveling.to}** — ถึง <t:${Math.ceil(char.traveling.arriveAt / 1000)}:R>`
          : `${loc.emoji} อยู่ที่ **${zoneLabel(currentZone(char))}**${char.run ? ` · ${DOORS[char.run.door].emoji} ในดันเจียน ห้อง ${char.run.depth}/${char.run.maxDepth}` : ''}${char.hunt && !char.hunt.won ? ' · ⚔️ กำลังล่า' : ''}`,
        isCrimsonMoon() ? '🌕 **Crimson Moon กำลังส่องแสง**' : null,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .addFields(
      { name: '🩸 เนื้อกาย', value: `\`${bar(char.hp, char.maxHp)}\` ${char.hp}/${char.maxHp}`, inline: true },
      { name: '⚡ แรง', value: `\`${bar(char.stamina, char.maxStamina)}\` ${char.stamina}/${char.maxStamina}`, inline: true },
      { name: '​', value: '​', inline: true },
      { name: '🫀 ความเป็นมนุษย์', value: `\`${bar(char.humanity, 100)}\` ${char.humanity} *(${humanityTier(char.humanity)})*`, inline: true },
      { name: '🧠 สติ', value: `\`${bar(char.sanity, 100)}\` ${char.sanity}${char.sanity < 30 ? ' *(ภาพหลอน)*' : ''}`, inline: true },
      { name: '​', value: '​', inline: true },
      { name: '✨ XP', value: `\`${bar(char.xp, need)}\` ${char.xp}/${need}` },
      {
        name: 'ค่าสถานะ (รวมโบนัส)',
        value: (['str', 'agi', 'int'] as const).map((s) => `${STAT_NAMES[s]} ${char.stats[s]} (${statMod(char, s) >= 0 ? '+' : ''}${statMod(char, s)})`).join(' · '),
      },
      {
        name: 'อุปกรณ์',
        value: [
          `อาวุธ: ${char.equipped.weapon ? itemLabel(char.equipped.weapon) + (char.gearLevels?.[char.equipped.weapon] ? ` +${char.gearLevels[char.equipped.weapon]}` : '') : '—'} (พละ +${gearAtk(char)})`,
          `เกราะ: ${char.equipped.armor ? itemLabel(char.equipped.armor) + (char.gearLevels?.[char.equipped.armor] ? ` +${char.gearLevels[char.equipped.armor]}` : '') : '—'} (ลดดาเมจ ${gearDef(char)})`,
        ].join('\n'),
      },
      { name: 'พร', value: icon.blessing, inline: true },
      { name: 'ผลกรรม', value: icon.repercussion, inline: true },
    );
  const bless = blessingsText(char);
  if (bless) e.addFields({ name: '✨ พรเทพ', value: bless });
  if (char.mutations.length) e.addFields({ name: '🧬 การกลายพันธุ์', value: char.mutations.map((m) => `• ${m}`).join('\n').slice(0, 1024) });
  const extra = char.role === 'bar' ? ` · ⏰ Closing Shift ${String(closingShiftHour(char.userId)).padStart(2, '0')}:00 น.` : '';
  e.setFooter({
    text: `🥩 ${char.flesh} เนื้อสด · ดันเจียน ${char.dungeonsCleared} · ตาย ${char.deaths} · สติแตก ${char.breakdowns}${extra}`,
  });
  return e;
}

/**
 * Profile as a rendered card image. The embed carries only what the image can't:
 * live travel countdown, Crimson Moon, blessings, mutations, Closing Shift.
 * Falls back to the text embed if rendering fails.
 */
export function profilePayload(char: Character): Promise<ImagePayload> {
  const lines = [
    char.traveling
      ? `🧭 กำลังเดินทางไป **${getZone(char.traveling.to)?.name ?? char.traveling.to}** — ถึง <t:${Math.ceil(char.traveling.arriveAt / 1000)}:R>`
      : null,
    isCrimsonMoon() ? '🌕 **Crimson Moon กำลังส่องแสง**' : null,
    blessingsText(char) ? `**✨ พรเทพ**\n${blessingsText(char)}` : null,
    char.mutations.length ? `**🧬 การกลายพันธุ์**\n${char.mutations.map((m) => `• ${m}`).join('\n')}` : null,
    char.role === 'bar' ? `-# ⏰ Closing Shift ${String(closingShiftHour(char.userId)).padStart(2, '0')}:00 น.` : null,
  ].filter(Boolean);
  return imagePayload('profile', char.fiend ? COLORS.fiend : COLORS.blood, () => renderProfileCard(char), () => [profileEmbed(char)], lines.join('\n'));
}

function sceneEyebrow(char: Character): string {
  if (char.run) return `${DOOR_EN[char.run.door]} DOOR`;
  const z = currentZone(char);
  if (z.region === 'rouge_land') return 'ROUGE LAND';
  if (z.region === 'cypress') return 'CYPRESS ISLE';
  return `OLD REALM · ${noEmoji(z.name).toUpperCase()}`;
}

/** Event: scene banner image + description/hints as text. `prefix` = small notes shown above the prose. */
export function eventPayload(char: Character, event: GameEventDef, prefix: string[] = []): Promise<ImagePayload> {
  const embed = eventEmbed(char, event);
  const text = [...prefix, embed.data.description ?? ''].join('\n');
  const run = char.run;
  return imagePayload(
    'scene',
    isCrimsonMoon() ? COLORS.crimson : COLORS.rot,
    () =>
      renderSceneCard(char, {
        eyebrow: sceneEyebrow(char),
        title: event.title,
        door: run?.door ?? event.door,
        pips: run ? [run.depth, run.maxDepth] : undefined,
        boss: event.boss,
      }),
    () => [prefix.length ? embed.setDescription(text.slice(0, 4096)) : embed],
    text,
  );
}

/** Dungeon between rooms / at the exit: banner with room pips (and exit doors). */
export function dungeonPayload(char: Character): Promise<ImagePayload> {
  const run = char.run!;
  const d = DOORS[run.door];
  const exits = run.stage === 'exit' ? exitOptions(char) : [];
  return imagePayload(
    'scene',
    COLORS.rot,
    () =>
      renderSceneCard(char, {
        eyebrow: `${DOOR_EN[run.door]} DOOR · DUNGEON`,
        title: `ดันเจียน${d.name.replace('ประตู', '')}`,
        subtitle: run.stage === 'exit' ? 'ห้องสุดท้าย — ประตูหลายสีปรากฏขึ้นตรงหน้า' : DUNGEON_RULES[run.door].note,
        door: run.door,
        pips: [run.depth, run.maxDepth],
        chips: exits.map((o) =>
          o === 'icon' ? { label: `ศาลของ ${ICON_BY_DOOR[run.door].name}`, color: run.door } : { label: DOORS[o].name, color: o },
        ),
      }),
    () => [dungeonStatusEmbed(char)],
    run.stage === 'exit' && exits.includes('icon') ? `คุณมองเห็น**${d.name}** ที่คนอื่นมองไม่เห็น...` : undefined,
  );
}

const STYLE: Record<string, ButtonStyle> = {
  primary: ButtonStyle.Primary,
  secondary: ButtonStyle.Secondary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger,
};

/** customId: ev:<userId>:<eventId>:<choiceId> */
export function eventButtons(char: Character, event: GameEventDef): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();
  for (const c of visibleChoices(char, event).slice(0, 5)) {
    const b = new ButtonBuilder()
      .setCustomId(`ev:${char.userId}:${event.id}:${c.id}`)
      .setLabel(c.label)
      .setStyle(STYLE[c.style ?? 'secondary']!);
    if (c.emoji) b.setEmoji(c.emoji);
    row.addComponents(b);
  }
  return row;
}

export function eventEmbed(char: Character, event: GameEventDef): EmbedBuilder {
  const lines = [event.description];
  if (seesHints(char)) {
    const hints = visibleChoices(char, event)
      .filter((c) => c.hint)
      .map((c) => `-# 👁️ **${c.label}** — ${c.hint}`);
    if (hints.length) lines.push('', ...hints);
  }
  if (char.sanity < 30) lines.push('', HALLUCINATIONS[Math.floor(Math.random() * HALLUCINATIONS.length)]!);
  const crimson = isCrimsonMoon();
  return new EmbedBuilder()
    .setColor(crimson ? COLORS.crimson : COLORS.rot)
    .setTitle(event.title)
    .setDescription(lines.join('\n'))
    .setFooter({ text: `${crimson ? '🌕 ' : ''}${statusLine(char)}` });
}

/** customId: dg:<userId>:<action>[:<arg>] */
export function dungeonButtons(char: Character): ActionRowBuilder<ButtonBuilder> | null {
  const run = char.run;
  if (!run) return null;
  const row = new ActionRowBuilder<ButtonBuilder>();
  if (run.stage === 'between') {
    const next = run.depth + 1 >= run.maxDepth ? 'ห้องสุดท้าย' : `ห้อง ${run.depth + 1}`;
    row.addComponents(
      new ButtonBuilder().setCustomId(`dg:${char.userId}:next`).setLabel(`เดินลึกเข้าไป (${next})`).setEmoji('🕯️').setStyle(ButtonStyle.Primary),
    );
    const rule = DUNGEON_RULES[run.door].retreat;
    if (rule !== 'locked') {
      const label = rule === 'feed' ? 'ป้อนเนื้อแล้วออก' : rule === 'timeloss' ? 'ถอยกลับ (เสียเวลา)' : 'ถอยออกทางประตูดำ';
      row.addComponents(new ButtonBuilder().setCustomId(`dg:${char.userId}:leave`).setLabel(label).setEmoji('⬛').setStyle(ButtonStyle.Secondary));
    }
  } else {
    for (const opt of exitOptions(char)) {
      const label = opt === 'icon' ? `${DOORS[run.door].name} (ศาลของ ${ICON_BY_DOOR[run.door].name})` : DOORS[opt].name;
      const emoji = opt === 'icon' ? DOORS[run.door].emoji : DOORS[opt].emoji;
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`dg:${char.userId}:exit:${opt}`)
          .setLabel(label)
          .setEmoji(emoji)
          .setStyle(opt === 'icon' ? ButtonStyle.Success : opt === 'red' ? ButtonStyle.Danger : ButtonStyle.Secondary),
      );
    }
  }
  return row;
}

export function dungeonStatusEmbed(char: Character): EmbedBuilder {
  const run = char.run!;
  const d = DOORS[run.door];
  const desc =
    run.stage === 'exit'
      ? 'ห้องสุดท้าย — ประตูหลายสีปรากฏขึ้นตรงหน้า' + (exitOptions(char).includes('icon') ? `\nคุณมองเห็น**${d.name}** ที่คนอื่นมองไม่เห็น...` : '')
      : `${DUNGEON_RULES[run.door].note}\nผ่านมาแล้ว ${run.depth}/${run.maxDepth} ห้อง`;
  return new EmbedBuilder()
    .setColor(COLORS.rot)
    .setTitle(`${d.emoji} ดันเจียน${d.name.replace('ประตู', '')}`)
    .setDescription(desc)
    .setFooter({ text: statusLine(char) });
}

export function resultEmbed(char: Character, title: string, body: string[], color: number = COLORS.rot): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(char.fiend ? COLORS.fiend : color)
    .setTitle(title)
    .setDescription(body.join('\n').slice(0, 4000))
    .setFooter({ text: statusLine(char) });
}
