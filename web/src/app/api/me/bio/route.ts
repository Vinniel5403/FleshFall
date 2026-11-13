import { bot } from "@/lib/server/bot";
import { BOT_DOWN, jsonError, NEED_LOGIN, withUrls } from "@/lib/server/me";
import { getSession, sameOrigin } from "@/lib/server/session";

/** Save the character's public notes (json: { bio }); '' clears them. */
export async function PUT(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "forbidden");
  const s = await getSession();
  if (!s) return jsonError(401, NEED_LOGIN);
  const { bio } = (await req.json().catch(() => ({}))) as { bio?: unknown };
  if (typeof bio !== "string") return jsonError(400, "bad bio");
  try {
    const r = await bot("bio", { userId: s.uid, bio });
    if (r.status !== 200) return jsonError(r.status, r.data.error ?? "บันทึกไม่สำเร็จ");
    return Response.json({ character: withUrls(r.data.character) });
  } catch {
    return jsonError(503, BOT_DOWN);
  }
}
