import { bot } from "@/lib/server/bot";
import { BOT_DOWN, jsonError, NEED_LOGIN } from "@/lib/server/me";
import { getSession, sameOrigin } from "@/lib/server/session";

/** Retry adding the player to the Discord server (first attempt failed, or they left). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "forbidden");
  const s = await getSession();
  if (!s) return jsonError(401, NEED_LOGIN);
  try {
    const r = await bot("join", { userId: s.uid, accessToken: s.accessToken });
    if (r.status !== 200) return jsonError(r.status, r.data.error ?? "เข้าร่วมไม่สำเร็จ");
    return Response.json({ inGuild: !!r.data.inGuild });
  } catch {
    return jsonError(503, BOT_DOWN);
  }
}
