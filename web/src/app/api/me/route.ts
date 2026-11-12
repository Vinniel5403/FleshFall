import { bot } from "@/lib/server/bot";
import { BOT_DOWN, jsonError, meResponse } from "@/lib/server/me";
import { getSession } from "@/lib/server/session";
import type { MeResponse } from "@/lib/types";

/** Who am I + my character (if any) + am I in the Discord server. */
export async function GET() {
  const s = await getSession();
  if (!s) return Response.json({ user: null, character: null, inGuild: false, guildUrl: null } satisfies MeResponse);
  try {
    const r = await bot("get", { userId: s.uid });
    if (r.status !== 200) return jsonError(502, r.data.error ?? "bot error");
    return Response.json(meResponse(s, r.data));
  } catch {
    return jsonError(503, BOT_DOWN);
  }
}
