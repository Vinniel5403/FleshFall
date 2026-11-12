import { MessageFlags, SlashCommandBuilder, type ActionRowBuilder, type AttachmentBuilder, type ButtonBuilder, type EmbedBuilder } from 'discord.js';
import { balance } from '../config.js';
import { applyOutcome, saveCharacter } from '../game/character.js';
import { getEvent, startEvent } from '../game/engine.js';
import { isDev } from '../game/dev.js';
import type { Character, GameEventDef } from '../game/types.js';
import { currentZone, getZone, mapCities, tierLabel, ZONES, zoneLabel } from '../game/zones.js';
import { COLORS, dungeonButtons, dungeonPayload, eventButtons, eventPayload, resultEmbed } from '../ui.js';
import { prayAction, restAction, toReply, travelAction } from './actions.js';
import { requireActive, travelingText } from './guard.js';
import type { Command } from './types.js';

export interface ExploreView {
  content?: string;
  embeds: EmbedBuilder[];
  files?: AttachmentBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
}

export type ExploreStep =
  | { kind: 'error'; content: string }
  | { kind: 'event'; event: GameEventDef; pre: string[] }
  | { kind: 'dungeon' }
  | { kind: 'dead'; lines: string[] };

/**
 * Start (or resume) exploring. `zoneId` = the panel's zone; must match where the character stands.
 * Synchronous on purpose: mutates + saves the character with no await in between.
 * Render the result with `exploreView()` afterwards (after deferring the interaction).
 */
export function exploreStart(char: Character, zoneId?: string): ExploreStep {
  const err = (content: string): ExploreStep => ({ kind: 'error', content });
  const road = travelingText(char);
  if (road) return err(road);
  if (char.hunt && !char.hunt.won) return err('⚔️ คุณกำลังล่าอยู่ — กลับไปห้องของโซนแล้วกด 🎲 ออกล่า เพื่อสู้ต่อ');

  // Resume whatever is pending, for free
  if (char.pendingEvent) {
    const ev = getEvent(char.pendingEvent.eventId);
    if (ev) return { kind: 'event', event: ev, pre: [] };
    delete char.pendingEvent;
  }
  if (char.run) return { kind: 'dungeon' };
  if (zoneId && currentZone(char).id !== zoneId) {
    const z = getZone(zoneId);
    return err(`คุณไม่ได้อยู่ที่ ${z?.emoji ?? ''} **${z?.name ?? zoneId}** — เดินทางมาก่อน`);
  }

  const god = isDev(char);
  if (!god && char.stamina < balance.exploreStaminaCost) {
    return err(`หมดแรง ⚡ ${char.stamina}/${char.maxStamina} — พักก่อน (ฟื้น +1 ทุก 5 นาที)`);
  }
  if (!god) char.stamina -= balance.exploreStaminaCost;
  const pre: string[] = [];
  if (char.location === 'old_realm') {
    // body mass slowly drains in the Old Realm
    const a = applyOutcome(char, { text: '', hp: -1 });
    pre.push(...a.lines.map((l) => `-# ${l} (มวลกายค่อย ๆ หายไปใน Old Realm)`));
    if (a.died || a.becameFiend) {
      saveCharacter(char);
      return { kind: 'dead', lines: a.lines };
    }
  }
  const event = startEvent(char);
  saveCharacter(char);
  return { kind: 'event', event, pre };
}

/** Render an explore step (event banner / dungeon banner / death / error). */
export async function exploreView(char: Character, s: ExploreStep): Promise<ExploreView> {
  switch (s.kind) {
    case 'error':
      return { content: s.content, embeds: [], files: [], components: [] };
    case 'dead':
      return { embeds: [resultEmbed(char, 'ร่างของคุณสลายไป...', s.lines, COLORS.blood)], files: [], components: [] };
    case 'dungeon': {
      const row = dungeonButtons(char);
      return { ...(await dungeonPayload(char)), components: row ? [row] : [] };
    }
    case 'event':
      return { ...(await eventPayload(char, s.event, s.pre.length ? [...s.pre, ''] : [])), components: [eventButtons(char, s.event)] };
  }
}

export const explore: Command = {
  data: new SlashCommandBuilder()
    .setName('explore')
    .setDescription(`ออกสำรวจ (ใช้ ${balance.exploreStaminaCost} แรง) — หรือดูเหตุการณ์/ดันเจียนที่ค้างอยู่`),
  async execute(i) {
    const char = await requireActive(i);
    if (!char) return;
    const step = exploreStart(char); // sync: load → mutate → save with no await
    if (step.kind === 'error') return i.reply({ content: step.content, flags: MessageFlags.Ephemeral });
    await i.deferReply(); // card render can exceed the 3s window
    return i.editReply(await exploreView(char, step));
  },
};

export const rest: Command = {
  data: new SlashCommandBuilder().setName('rest').setDescription('พักฟื้น (คูลดาวน์ 30 นาที)'),
  async execute(i) {
    const char = await requireActive(i);
    if (!char) return;
    return i.reply(toReply(restAction(char)));
  },
};

export const pray: Command = {
  data: new SlashCommandBuilder().setName('pray').setDescription('สวดบท First Verses เพื่อกดผลกรรมของ Icon (คูลดาวน์ 1 ชม.)'),
  async execute(i) {
    const char = await requireActive(i);
    if (!char) return;
    return i.reply(toReply(prayAction(char)));
  },
};

export const travel: Command = {
  data: new SlashCommandBuilder()
    .setName('travel')
    .setDescription(`เดินทางไปเมือง/โซนอื่น (ใช้เวลา ${Math.round(balance.travelMs / 60_000)} นาที)`)
    .addStringOption((o) =>
      o
        .setName('to')
        .setDescription('ปลายทาง')
        .setRequired(true)
        .setAutocomplete(true),
    ),
  async autocomplete(i) {
    const q = i.options.getFocused().toLowerCase();
    const hits = mapCities().filter((z) => !q || z.name.toLowerCase().includes(q) || z.id.includes(q));
    const opts = hits.map((z) => ({ name: `${z.emoji} ${z.name} · ${tierLabel(z)}`, value: z.id }));
    if (!q || 'rouge land'.includes(q)) opts.unshift({ name: '🏠 Rouge Land (กลับบ้าน)', value: 'rouge_land' });
    return i.respond(opts.slice(0, 25));
  },
  async execute(i) {
    const char = await requireActive(i);
    if (!char) return;
    return i.reply(toReply(travelAction(char, i.options.getString('to', true))));
  },
};
