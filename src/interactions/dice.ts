import { AttachmentBuilder, EmbedBuilder, type ButtonInteraction } from 'discord.js';
import type { DiceRoll } from '../game/dice.js';
import { renderDiceGif } from '../render/diceGif.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Show the rolling-d20 GIF on the clicked message (buttons removed so nobody double-clicks),
 * then wait for it to land. The interaction must already be deferred, and the character
 * already saved — this only delays the reveal. Never throws: on error the result just shows.
 */
export async function playDice(i: ButtonInteraction, dice: DiceRoll[] | undefined, color: number): Promise<void> {
  if (!dice?.length || process.env.DICE_ANIM === '0') return;
  try {
    const { gif, ms } = renderDiceGif(dice);
    await i.editReply({
      content: '',
      embeds: [new EmbedBuilder().setColor(color).setImage('attachment://dice.gif')],
      files: [new AttachmentBuilder(gif, { name: 'dice.gif' })],
      components: [],
    });
    await sleep(ms);
  } catch (err) {
    console.error('[dice] roll animation failed:', err);
  }
}
