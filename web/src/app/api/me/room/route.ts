import { bot } from "@/lib/server/bot";
import { BOT_DOWN, jsonError, NEED_LOGIN, withUrls } from "@/lib/server/me";
import { getSession, sameOrigin } from "@/lib/server/session";

/** Save the private room layout (json: { room: { template, items } | null }). The bot validates the shape. */
export async function PUT(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "forbidden");
  const s = await getSession();
  if (!s) return jsonError(401, NEED_LOGIN);
  const body = (await req.json().catch(() => null)) as { room?: unknown } | null;
  if (!body || !("room" in body)) return jsonError(400, "bad room");
  try {
    const r = await bot("room", { userId: s.uid, room: body.room });
    if (r.status !== 200) return jsonError(r.status, r.data.error ?? "บันทึกไม่สำเร็จ");
    return Response.json({ character: withUrls(r.data.character) });
  } catch {
    return jsonError(503, BOT_DOWN);
  }
}
