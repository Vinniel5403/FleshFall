/**
 * Growth view (ephemeral, from the profile): spend stat points, pick the talent on offer, see what each stat does.
 * Buttons `pn:grow` (open) · `pn:pt:<stat>:<n>` (spend, in place) · select `pns:talent` — routed in panels.ts.
 */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js';
import { critFrom, evadeMod, extraStrike, hitMod, statMod, statParts, strDmg } from '../game/character.js';
import { GIFTS, STAT_INFO, TALENTS, talentOffer } from '../game/growth.js';
import { ICONS } from '../game/icons.js';
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

/** Smallest value of `stat` above `now` where `f` gives more than it does now (for "ถึง N แล้วได้เพิ่ม"). */
function nextStep(now: number, f: (v: number) => number): number | null {
  const cur = f(now);
  for (let v = now + 1; v <= now + 200; v++) if (f(v) > cur) return v;
  return null;
}

/** One stat in plain sentences: what it gives right now, then what more points would do. */
function statLines(char: Character, s: StatKey): string {
  const v = char.stats[s];
  const check = statMod(char, s);
  // where the event bonus comes from, when it's more than the stat itself ("พละกำลัง 6 + อาวุธ 9")
  const parts = statParts(char, s).filter(([, n]) => n !== 0);
  const from = parts.length > 1 ? ` (${parts.map(([label, n]) => `${label.replace(/^ค่า/, '')} ${n > 0 ? '' : '−'}${Math.abs(n)}`).join(' + ').replace(/\+ −/g, '− ')})` : '';
  const event = `• เหตุการณ์ที่ใช้${STAT_INFO[s].name}: บวกลูกเต๋า **${check >= 0 ? '+' : ''}${check}**${from}`;
  if (s === 'str') {
    return [`• ตีแรงขึ้น **+${strDmg(char)}** ทุกครั้งที่โดน`, event, '-# ทุก 2 แต้ม = ดาเมจ +1 · แจก 1 แต้ม = เนื้อกายสูงสุด +2'].join('\n');
  }
  if (s === 'agi') {
    const step = nextStep(v, (x) => Math.floor(0.8 * Math.sqrt(x)));
    return [
      `• มอนตีโดนคุณยากขึ้น **+${evadeMod(char)}**`,
      `• โอกาสโจมตีซ้ำในเทิร์นเดียว **${Math.round(extraStrike(char) * 100)}%**`,
      event,
      `-# ${step ? `หลบเพิ่มอีก 1 เมื่อว่องไวถึง ${step} · ` : ''}แต้มที่เพิ่มทุกแต้มทำให้ตีซ้ำบ่อยขึ้น`,
    ].join('\n');
  }
  const c = critFrom(char);
  const hitStep = nextStep(v, (x) => Math.floor(x / 3));
  const critStep = c > 15 ? nextStep(v, (x) => Math.floor(x / 8)) : null;
  return [
    `• ตีโดนง่ายขึ้น **+${hitMod(char)}**`,
    `• ตีคริติคอล (ดาเมจ ×2) เมื่อทอยได้ **${c === 20 ? '20' : `${c}–20`}**`,
    event,
    `-# ${[hitStep && `ตีโดน +1 เมื่อสัมผัสถึง ${hitStep}`, critStep && `ช่วงคริกว้างขึ้นเมื่อถึง ${critStep}`].filter(Boolean).join(' · ')}`,
  ].join('\n');
}

const RULES = 'ได้แต้มเมื่อเลเวลอัป: เลเวลละ 1 แต้ม · ทุก 5 เลเวลได้ 2 แต้ม และเลือกพรสวรรค์ 1 อย่าง';

export function growthView(char: Character, note?: string) {
  const points = char.statPoints ?? 0;
  const offer = talentOffer(char);
  const talents = Object.entries(char.talents ?? {}).filter(([id, n]) => n > 0 && TALENTS[id]);
  const gifts = char.gifts ?? [];
  const e = new EmbedBuilder()
    .setColor(COLORS.blood)
    .setTitle(`📈 สเตตัส — ${char.name} Lv.${char.level}`)
    .setDescription(
      [
        note,
        points ? `🆙 **เหลือ ${points} แต้มให้แจก** — กดปุ่มด้านล่าง (แจกแล้วถอนไม่ได้)` : '✅ แจกแต้มครบแล้ว',
        char.talentPicks ? `✨ **เลือกพรสวรรค์ได้ ${char.talentPicks} อย่าง** — เลือกจากเมนูด้านล่าง` : null,
        `-# ${RULES}`,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .addFields(
      ...STATS.map((s) => ({ name: `${STAT_INFO[s].emoji} ${STAT_INFO[s].name} ${char.stats[s]}`, value: statLines(char, s) })),
      {
        name: '🌟 พรสวรรค์',
        value: talents.length
          ? talents.map(([id, n]) => `${TALENTS[id]!.emoji} **${TALENTS[id]!.name}**${TALENTS[id]!.max > 1 ? ` (${n}/${TALENTS[id]!.max})` : ''} — ${TALENTS[id]!.desc}`).join('\n')
          : '-# ยังไม่มี — ได้เลือกทุก 5 เลเวล',
      },
      {
        name: '🎁 ของขวัญจาก Icon',
        value: [
          ...gifts.map((icon) => `${ICONS[icon].emoji} **${GIFTS[icon].name}** (${ICONS[icon].name}) — ${GIFTS[icon].desc}`),
          `-# ${gifts.length ? 'ได้เพิ่มจาก' : 'ยังไม่มี — ได้จาก'}การเข้าประตูดันเจียนแล้วออกมาได้ทั้งตัว: ประตูสีไหนได้ของขวัญจาก Icon สีนั้น (Icon ละ 1 ครั้ง) · ประตูโผล่ตอนล่าหรือออกสำรวจ`,
        ].join('\n'),
      },
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

