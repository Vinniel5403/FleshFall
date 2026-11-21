/**
 * Hunt UI. customId: hn:<userId>:<atk|bag|back|door|leave|again|home>[:<idx>] — no fleeing: kill them all or fall.
 * Item picker select: hns:<userId> (using an item spends the turn).
 * Hunts usually live on ephemeral messages, so everything is i.update.
 */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, StringSelectMenuBuilder, type ButtonInteraction, type RepliableInteraction, type StringSelectMenuInteraction } from 'discord.js';
import { loadCharacter, saveCharacter } from '../game/character.js';
import { attack, enterHuntDoor, getMonster, huntUsable, leaveHunt, monsterLevel, nextHuntLevel, startHunt, useInHunt, type RoundResult } from '../game/hunt.js';
import { fallRow } from './fallRow.js';
import { inField, streakOf, streakText, tripSize } from '../game/expedition.js';
import { getItem, itemEffects, itemLabel } from '../game/items.js';
import type { Character } from '../game/types.js';
import { DOORS } from '../game/world.js';
import { currentZone, getZone, tierLabel, travelNotice } from '../game/zones.js';
import { toUpdate, travelAction } from '../commands/actions.js';
import { idleError, requireActive } from '../commands/guard.js';
import { renderHuntCard } from '../render/sceneCards.js';
import { playDice } from './dice.js';
import { imagePayload, type ImagePayload } from '../render/view.js';
import { bar, COLORS, dungeonButtons, dungeonPayload } from '../ui.js';

export function huntEmbed(char: Character, lines: string[], ended?: string): EmbedBuilder {
  const h = char.hunt;
  const zone = getZone(h?.zone) ?? currentZone(char);
  const e = new EmbedBuilder()
    .setColor(ended === 'died' ? COLORS.blood : h?.won ? COLORS.bone : COLORS.rot)
    .setTitle(`⚔️ ล่าใน ${zone.emoji} ${zone.name}  ·  ${tierLabel(zone)}`);
  const parts: string[] = [];
  if (h) {
    parts.push(
      h.monsters
        .map((m, idx) => {
          const d = getMonster(m.id);
          const name = `${idx + 1}. ${d?.emoji ?? ''} **${d?.name ?? m.id}** · Lv ${monsterLevel(h, m)}`;
          return m.hp > 0 ? `${name}  \`${bar(m.hp, m.maxHp, 8)}\` ${m.hp}/${m.maxHp}` : `~~${idx + 1}. ${d?.name ?? m.id}~~ 💀`;
        })
        .join('\n'),
    );
  }
  if (lines.length) parts.push(lines.join('\n'));
  const trip = streakText(char);
  if (trip) parts.push(`-# ${trip}`);
  if (h?.won || ended === 'won') {
    const loot = Object.entries(h?.loot ?? {}).map(([id, n]) => itemLabel(id, n));
    if (loot.length) parts.push(`🎒 ของที่ได้: ${loot.join(', ')}`);
  }
  e.setDescription(parts.join('\n\n').slice(0, 4000));
  e.setFooter({ text: `🩸 ${char.hp}/${char.maxHp} · ⚡ ${char.stamina}/${char.maxStamina} · 🧠 ${char.sanity} · 🫀 ${char.humanity}` });
  return e;
}

/** Battle card (monsters, loot, status) + combat log as text. */
export function huntPayload(char: Character, lines: string[], ended?: string): Promise<ImagePayload> {
  const h = char.hunt;
  const color = ended === 'died' ? COLORS.blood : h?.won ? COLORS.bone : COLORS.rot;
  const trip = streakText(char);
  const text = [
    ...lines,
    ...(trip ? ['', `-# ${trip}`] : []),
  ];
  return imagePayload('hunt', color, () => renderHuntCard(char, ended), () => [huntEmbed(char, lines, ended)], text.join('\n'));
}

function btn(uid: string, action: string, label: string, style: ButtonStyle, emoji?: string) {
  const b = new ButtonBuilder().setCustomId(`hn:${uid}:${action}`).setLabel(label).setStyle(style);
  if (emoji) b.setEmoji(emoji);
  return b;
}

export function huntButtons(char: Character): ActionRowBuilder<ButtonBuilder>[] {
  const h = char.hunt;
  const uid = char.userId;
  if (char.dying) return [fallRow(char)];
  if (char.downed) return [];
  if (!h || (h.won && !h.door)) {
    // hunt over (won without door / fled) → offer another
    if (char.fiend) return [];
    const field = inField(char);
    const bag = tripSize(char);
    return [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        btn(uid, 'again', field && streakOf(char) > 0 ? `ล่าต่อ (ลึก ${streakOf(char) + 1} · มอน Lv ${nextHuntLevel(char)})` : 'ล่าต่อ', ButtonStyle.Danger, '🎲'),
        btn(uid, 'home', 'กลับ Rouge Land', field && bag ? ButtonStyle.Success : ButtonStyle.Secondary, '🏠'),
      ),
    ];
  }
  if (h.won && h.door) {
    return [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        btn(uid, 'door', `เข้า${DOORS[h.door].name}`, ButtonStyle.Danger, DOORS[h.door].emoji),
        btn(uid, 'leave', 'เดินจากไป', ButtonStyle.Secondary, '🚶'),
      ),
    ];
  }
  const attacks = h.monsters
    .map((m, idx) => ({ m, idx }))
    .filter(({ m }) => m.hp > 0)
    .map(({ m, idx }) => btn(uid, `atk:${idx}`, `${idx + 1}. ${getMonster(m.id)?.name ?? m.id} · Lv ${monsterLevel(h, m)}`.slice(0, 80), ButtonStyle.Danger, '⚔️'));
  const usable = huntUsable(char).length;
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(...attacks),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      btn(uid, 'bag', usable ? `ใช้ไอเท็ม (เสียเทิร์น)` : 'ไม่มีไอเท็มที่ใช้ได้', ButtonStyle.Secondary, '🎒').setDisabled(!usable),
    ),
  ];
}

/** Item picker in place of the attack buttons: consumables from the inventory (max 25) + back. */
function bagRows(char: Character): ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] {
  const opts = huntUsable(char)
    .slice(0, 25)
    .map(({ id, qty }) => {
      const d = getItem(id)!;
      const fx = itemEffects(id, true);
      return { label: `${d.name} ×${qty}`.slice(0, 100), value: id, emoji: d.emoji, description: (fx || d.description || '').slice(0, 100) || undefined };
    });
  return [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder().setCustomId(`hns:${char.userId}`).setPlaceholder('🎒 เลือกไอเท็ม — ใช้แล้วมอนสเตอร์จะโจมตีสวน').addOptions(opts),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(btn(char.userId, 'back', 'กลับไปสู้', ButtonStyle.Secondary, '⚔️')),
  ];
}

/** Shared tail of a combat turn (attack or item): save, end text, dice, final card. */
async function showRound(i: ButtonInteraction | StringSelectMenuInteraction, char: Character, r: RoundResult): Promise<unknown> {
  saveCharacter(char);
  const lines = [...r.lines];
  if (r.ended === 'died') lines.push('', '-# การล่าจบลง');
  // after death/downed/Fiend the hunt is gone; dying keeps it and shows 🥚/☠️ (huntButtons handles both)
  const components = r.ended === 'died' ? [] : huntButtons(char);
  await i.deferUpdate();
  const final = huntPayload(char, lines, r.ended); // renders while the die rolls
  if (r.dice && i.isButton()) await playDice(i, [r.dice], COLORS.blood);
  return i.editReply({ ...(await final), components });
}

export async function handleHuntSelect(i: StringSelectMenuInteraction): Promise<unknown> {
  const [, ownerId] = i.customId.split(':');
  if (i.user.id !== ownerId) return i.reply({ content: 'นี่ไม่ใช่การล่าของคุณ', flags: MessageFlags.Ephemeral });
  const char = loadCharacter(i.user.id);
  if (!char || char.fiend || !char.hunt) return i.update({ components: [] });
  return showRound(i, char, useInHunt(char, i.values[0] ?? ''));
}

/** Start (or resume) a hunt from a zone panel. Replies ephemerally. */
export async function openHunt(i: RepliableInteraction, zoneId: string): Promise<unknown> {
  const char = await requireActive(i);
  if (!char) return;
  if (char.hunt && !char.hunt.won) {
    await i.deferReply({ flags: MessageFlags.Ephemeral });
    return i.editReply({ ...(await huntPayload(char, ['-# กลับมาสู้ต่อ'])), components: huntButtons(char) });
  }
  const road = travelNotice(char);
  if (road) return i.reply({ content: road, flags: MessageFlags.Ephemeral });
  const zone = getZone(zoneId);
  if (currentZone(char).id !== zoneId) {
    return i.reply({ content: `คุณไม่ได้อยู่ที่ ${zone?.emoji ?? ''} **${zone?.name ?? zoneId}** — กด 🧭 เดินทาง มาก่อน`, flags: MessageFlags.Ephemeral });
  }
  const busy = idleError(char);
  if (busy) return i.reply({ content: busy, flags: MessageFlags.Ephemeral });
  const r = startHunt(char);
  saveCharacter(char); // stamina / Miasma may have changed even on failure
  if (!r.ok) return i.reply({ content: r.error, flags: MessageFlags.Ephemeral });
  await i.deferReply({ flags: MessageFlags.Ephemeral }); // card render can exceed the 3s window
  return i.editReply({ ...(await huntPayload(char, r.hunt.log)), components: huntButtons(char) });
}

export async function handleHuntButton(i: ButtonInteraction): Promise<unknown> {
  const [, ownerId, action, arg] = i.customId.split(':');
  if (i.user.id !== ownerId) return i.reply({ content: 'นี่ไม่ใช่การล่าของคุณ', flags: MessageFlags.Ephemeral });
  const char = loadCharacter(i.user.id);
  if (!char || char.fiend) return i.update({ components: [] });

  // already on the road (this is an old hunt card): leave only the plain travel notice, no buttons
  const road = travelNotice(char);
  if (road) return i.update({ content: road, embeds: [], files: [], components: [] });

  if (action === 'home') {
    const r = travelAction(char, 'rouge_land');
    if (!r.ok) return i.reply({ content: r.content, flags: MessageFlags.Ephemeral });
    return i.update({ ...toUpdate(r), components: [] });
  }

  if (action === 'again') {
    const busy = idleError(char);
    if (busy) return i.reply({ content: busy, flags: MessageFlags.Ephemeral });
    const r = startHunt(char);
    saveCharacter(char);
    if (!r.ok) return i.reply({ content: r.error, flags: MessageFlags.Ephemeral });
    await i.deferUpdate();
    return i.editReply({ ...(await huntPayload(char, r.hunt.log)), components: huntButtons(char) });
  }

  if (!char.hunt) return i.update({ components: [] }); // stale

  if (action === 'door') {
    if (!enterHuntDoor(char)) return i.update({ components: [] });
    saveCharacter(char);
    const row = dungeonButtons(char);
    await i.deferUpdate();
    return i.editReply({ ...(await dungeonPayload(char)), components: row ? [row] : [] });
  }
  if (action === 'leave') {
    leaveHunt(char);
    saveCharacter(char);
    await i.deferUpdate();
    return i.editReply({ ...(await huntPayload(char, ['🚶 คุณหันหลังให้ประตู มันค่อย ๆ จางหายไปในหมอก'])), components: huntButtons(char) });
  }

  if (action === 'bag') {
    if (char.hunt.won || char.dying || !huntUsable(char).length) return i.update({ components: huntButtons(char) });
    return i.update({ components: bagRows(char) });
  }
  if (action === 'back') return i.update({ components: huntButtons(char) });

  if (action !== 'atk') return i.update({ components: huntButtons(char) }); // old 🏃 flee buttons
  return showRound(i, char, attack(char, Number(arg)));
}
