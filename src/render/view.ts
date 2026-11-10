/**
 * Discord glue for rendered cards: image embed on top, optional text embed below.
 * Always returns `files` (possibly empty) so message updates replace/clear old attachments.
 */
import { AttachmentBuilder, EmbedBuilder } from 'discord.js';

export interface ImagePayload {
  embeds: EmbedBuilder[];
  files: AttachmentBuilder[];
}

export async function imagePayload(
  name: string,
  color: number,
  render: () => Promise<Buffer>,
  fallback: () => EmbedBuilder[],
  text?: string,
): Promise<ImagePayload> {
  try {
    const buf = await render();
    const embeds = [new EmbedBuilder().setColor(color).setImage(`attachment://${name}.png`)];
    if (text?.trim()) embeds.push(new EmbedBuilder().setColor(color).setDescription(text.slice(0, 4096)));
    return { embeds, files: [new AttachmentBuilder(buf, { name: `${name}.png` })] };
  } catch (err) {
    console.error(`[render] ${name} card failed, falling back to embed:`, err);
    return { embeds: fallback(), files: [] };
  }
}
