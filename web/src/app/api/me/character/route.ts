import { bot } from "@/lib/server/bot";
import { BOT_DOWN, jsonError, meResponse, NEED_LOGIN } from "@/lib/server/me";
import { deleteObjects } from "@/lib/server/r2";
import { getSession, sameOrigin } from "@/lib/server/session";

/** Create the player's one character; the bot then adds them to the Discord server. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "forbidden");
  const s = await getSession();
  if (!s) return jsonError(401, NEED_LOGIN);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const r = await bot("create", { userId: s.uid, name: b.name, role: b.role, icon: b.icon, accessToken: s.accessToken });
    if (r.status !== 200) return jsonError(r.status, r.data.error ?? "สร้างไม่สำเร็จ");
    if (r.data.evicted?.length) await deleteObjects(r.data.evicted); // a Fiend starting over
    return Response.json(meResponse(s, r.data));
  } catch {
    return jsonError(503, BOT_DOWN);
  }
}
