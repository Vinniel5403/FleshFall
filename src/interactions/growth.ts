/**
 * Growth view (ephemeral, from the profile): spend stat points, pick the talent on offer, see what each stat does.
 * Buttons `pn:grow` (open) · `pn:pt:<stat>:<n>` (spend, in place) · select `pns:talent` — routed in panels.ts.
 */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js';
import { critFrom, evadeMod, extraStrike, hitMod, strDmg } from '../game/character.js';
import { STAT_INFO, talentOffer, talentsText } from '../game/growth.js';
import type { Character, StatKey } from '../game/types.js';
import { COLORS } from '../ui.js';

const STATS: StatKey[] = ['str', 'agi', 'int'];

/** "🆙 แจกแต้ม (3)" when something waits, else a plain way in. */
export function growthButton(char: Character): ButtonBuilder {
  const waiting = (char.statPoints ?? 0) + (char.talentPicks ?? 0);
  return new ButtonBuilder()
    .setCustomId('pn:grow')
    .setLabel(waiting ? `แจกแต้ม / พรสวรรค์ (${waiting})` : 'สเตตัส & พรสวรรค์')
    .setEmoji(waiting ? '🆙' : '📈')
    .setStyle(waiting ? ButtonStyle.Success : ButtonStyle.Secondary);
}

/** What the stat gives right now, in hunt numbers. */
function statNow(char: Character, s: StatKey): string {
  if (s === 'str') return `ดาเมจ +${strDmg(char)}`;
  if (s === 'agi') return `หลบ +${evadeMod(char)} · ตีซ้ำ ${Math.round(extraStrike(char) * 100)}%`;
  const c = critFrom(char);
  return `ตีโดน +${hitMod(char)} · คริติคอล ${c === 20 ? '20' : `${c}–20`}`;
}

export function growthView(char: Character, note?: string) {
  const points = char.statPoints ?? 0;
  const offer = talentOffer(char);
  const e = new EmbedBuilder()
    .setColor(COLORS.blood)
    .setTitle(`📈 การเติบโต — ${char.name} Lv.${char.level}`)
    .setDescription(
      [
        note,
        points ? `🆙 **แต้มสเตตัสเหลือ ${points}** — กดปุ่มด้านล่างเพื่อแจก (แจกแล้วถอนไม่ได้)` : '-# ได้แต้มสเตตัส 1 ทุกเลเวล · 2 แต้ม + เลือกพรสวรรค์ทุก 5 เลเวล',
        char.talentPicks ? `✨ **เลือกพรสวรรค์ได้ ${char.talentPicks}** — เลือกจากเมนูด้านล่าง 1 อย่าง` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .addFields(
      ...STATS.map((s) => ({
        name: `${STAT_INFO[s].emoji} ${STAT_INFO[s].name} ${char.stats[s]}`,
        value: `**${statNow(char, s)}**\n-# ${STAT_INFO[s].job}`,
      })),
      { name: '✨ พรสวรรค์ & ของขวัญ Icon', value: talentsText(char) ?? '-# ยังไม่มี — พรสวรรค์ได้ทุก 5 เลเวล · ของขวัญ Icon ได้จากศาลในดันเจียน Icon' },
    );
  const rows: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];
  if (points) {
    const row = (n: number) =>
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        STATS.map((s) =>
          new ButtonBuilder()
            .setCustomId(`pn:pt:${s}:${n}`)
            .setLabel(`${STAT_INFO[s].name} +${n}`)
            .setEmoji(STAT_INFO[s].emoji)
            .setStyle(n > 1 ? ButtonStyle.Primary : ButtonStyle.Secondary),
        ),
      );
    rows.push(row(1));
    if (points >= 5) rows.push(row(5));
  }
  if (offer.length) {
    rows.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('pns:talent')
          .setPlaceholder('✨ เลือกพรสวรรค์ 1 อย่าง')
          .addOptions(offer.map((t) => ({ label: t.name, value: t.id, emoji: t.emoji, description: `${t.desc}${t.max > 1 ? ` (สูงสุด ${t.max})` : ''}`.slice(0, 100) }))),
      ),
    );
  }
  return { content: '', embeds: [e], files: [], components: rows };
}

