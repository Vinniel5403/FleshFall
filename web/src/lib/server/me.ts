/** Shapes bot replies into the browser-facing /api/me response (adds public image URLs). */
import type { AccountView, MeResponse } from "@/lib/types";
import type { AccountReply } from "./bot";
import { publicUrl } from "./r2";
import type { Session } from "./session";

export const withUrls = (c: AccountView | null | undefined): AccountView | null =>
  c
    ? {
        ...c,
        images: c.images.map((i) => ({ ...i, url: publicUrl(i.key) })),
        sprite: c.sprite ? { ...c.sprite, url: publicUrl(c.sprite.base) } : null,
      }
    : null;

export function meResponse(s: Session, r: AccountReply): MeResponse {
  return {
    user: { username: s.username, avatar: s.avatar },
    character: withUrls(r.character),
    inGuild: !!r.inGuild,
    guildUrl: r.guildId ? `https://discord.com/channels/${r.guildId}` : null,
  };
}

export const jsonError = (status: number, error: string) => Response.json({ error }, { status });

export const BOT_DOWN = "เซิร์ฟเวอร์เกมไม่ตอบสนอง ลองใหม่อีกครั้ง";
export const NEED_LOGIN = "กรุณาเข้าสู่ระบบด้วย Discord";

/** OAuth redirect URI (must be registered in the Discord developer portal). */
export const redirectUri = (req: Request) =>
  process.env.DISCORD_REDIRECT_URI ?? `${new URL(req.url).origin}/api/auth/callback`;
