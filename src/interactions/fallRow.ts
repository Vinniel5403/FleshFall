/** Buttons for the hard/epic "dying" choice. customId: fl:<userId>:<placenta|giveup> (handled in fall.ts). */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { itemCount } from '../game/character.js';
import { isDev } from '../game/dev.js';
import type { Character } from '../game/types.js';

export function fallRow(char: Character): ActionRowBuilder<ButtonBuilder> {
  const n = itemCount(char, 'placenta');
  const can = n > 0 || isDev(char);
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`fl:${char.userId}:placenta`)
      .setLabel(can ? `ใช้รกคืนชีพ (มี ${n})` : 'ไม่มีรกคืนชีพ')
      .setEmoji('🥚')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!can),
    new ButtonBuilder().setCustomId(`fl:${char.userId}:giveup`).setLabel('ยอมตาย').setEmoji('☠️').setStyle(ButtonStyle.Danger),
  );
}

/** Components to show after a step: the dying choice, or `normal` otherwise. */
export function fallOr<T>(char: Character, normal: T[]): (T | ActionRowBuilder<ButtonBuilder>)[] {
  return char.dying ? [fallRow(char)] : normal;
}
