import { isDev } from '../game/dev.js';
import { MessageFlags, type RepliableInteraction } from 'discord.js';
import { loadCharacter } from '../game/character.js';
import type { Character } from '../game/types.js';
import { closingShiftHour, inClosingShift } from '../game/world.js';
import { getZone } from '../game/zones.js';
import { fallRow } from '../interactions/fallRow.js';

/** Knocked out / dying: why the character can't act (null if fine). */
export function fallenText(char: Character): string | null {
  if (char.downed) {
    const z = getZone(char.downed.zone);
    return `😵 คุณหมดสติอยู่ที่ ${z?.emoji ?? ''} **${z?.name ?? char.downed.zone}** — รอเพื่อนในเมืองเดียวกันใช้ \`/wake\` ปลุก หรือฟื้นเองแล้วถูกลากกลับบ้าน <t:${Math.ceil(char.downed.until / 1000)}:R> (ของรอบนี้หาย)`;
  }
  if (char.dying) return '🩸 คุณกำลังจะตาย — เลือก 🥚 ใช้รกคืนชีพ หรือ ☠️ ยอมตาย';
  return null;
}

async function deny(i: RepliableInteraction, content: string): Promise<undefined> {
  await i.reply({ content, flags: MessageFlags.Ephemeral });
  return undefined;
}

/** Load caller's character or reply with a hint. */
export async function requireCharacter(i: RepliableInteraction): Promise<Character | undefined> {
  const char = loadCharacter(i.user.id);
  if (!char) return deny(i, 'คุณยังไม่มีตัวละคร ใช้ `/start` เพื่อคลานขึ้นจากหลุมเนื้อ');
  return char;
}

export function travelingText(char: Character): string | null {
  if (!char.traveling) return null;
  const z = getZone(char.traveling.to);
  return `🧭 กำลังเดินทางไป ${z?.emoji ?? ''} **${z?.name ?? char.traveling.to}** — ถึง <t:${Math.ceil(char.traveling.arriveAt / 1000)}:R>`;
}

/** Character that can act: not a Fiend, not in Closing Shift. (Menus work while traveling.) */
export async function requireActive(i: RepliableInteraction): Promise<Character | undefined> {
  const char = await requireCharacter(i);
  if (!char) return undefined;
  if (char.fiend) return deny(i, '👹 คุณกลายเป็น Fiend ไปแล้ว ไม่มีทางย้อนกลับ — ใช้ `/start` เพื่อเริ่มชีวิตใหม่');
  const fallen = fallenText(char);
  if (fallen) {
    // dying: hand the choice back (the original message may be gone)
    await i.reply({ content: fallen, components: char.dying ? [fallRow(char)] : [], flags: MessageFlags.Ephemeral });
    return undefined;
  }
  if (char.role === 'bar' && !isDev(char) && inClosingShift(char.userId)) {
    const h = String(closingShiftHour(char.userId)).padStart(2, '0');
    return deny(i, `😵 **Closing Shift** — ร่างของคุณหมดสติเพื่อรักษารูปทรง (${h}:00–${h}:59 น.) ลองใหม่หลังจากนี้`);
  }
  return char;
}

/** Reason the character can't start something new, or null if free. */
export function idleError(char: Character): string | null {
  const fallen = fallenText(char);
  if (fallen) return fallen;
  if (char.hunt && !char.hunt.won) return '⚔️ คุณกำลังล่าอยู่ — กลับไปห้องของโซนแล้วกด 🎲 ออกล่า เพื่อสู้ต่อ';
  if (char.run || char.pendingEvent) return 'คุณกำลังติดอยู่ในเหตุการณ์/ดันเจียน ใช้ `/explore` เพื่อดูสถานะและทำต่อให้จบก่อน';
  return null;
}

export async function requireIdle(i: RepliableInteraction, char: Character): Promise<boolean> {
  const busy = idleError(char);
  if (busy) {
    await deny(i, busy);
    return false;
  }
  return true;
}
