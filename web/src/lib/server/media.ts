/**
 * Opaque R2 folder for a user's uploads, so public image URLs never contain the Discord id.
 * Must match mediaId() in src/game/account.ts: HMAC-SHA256("media:<uid>") keyed with the bot's
 * API_SECRET (= BOT_API_SECRET here), first 16 hex chars.
 */
import { createHmac } from "node:crypto";

export function mediaId(uid: string): string {
  const secret = process.env.BOT_API_SECRET;
  if (!secret) throw new Error("BOT_API_SECRET missing");
  return createHmac("sha256", secret).update(`media:${uid}`).digest("hex").slice(0, 16);
}
