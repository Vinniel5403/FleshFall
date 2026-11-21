import { botAdmin } from "@/lib/server/bot";
import { BOT_DOWN, jsonError, NEED_LOGIN } from "@/lib/server/me";
import { deleteObjects } from "@/lib/server/r2";
import { getSession, sameOrigin } from "@/lib/server/session";
import type { AdminItem } from "@/lib/types";

/** Save an item form (json: { item, isNew }) — the bot validates every field. */
export async function PUT(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "forbidden");
  const s = await getSession();
  if (!s) return jsonError(401, NEED_LOGIN);
  const { item, isNew } = (await req.json().catch(() => ({}))) as { item?: unknown; isNew?: unknown };
  if (!item || typeof item !== "object") return jsonError(400, "ข้อมูลไม่ถูกต้อง");
  try {
    const r = await botAdmin<{ item: AdminItem }>("admin/item", { userId: s.uid, item, isNew: isNew === true });
    if (r.status !== 200) return jsonError(r.status, r.data.error ?? "บันทึกไม่สำเร็จ");
    return Response.json(r.data);
  } catch {
    return jsonError(503, BOT_DOWN);
  }
}

/** Delete a custom item for good (json: { id }) — the bot strips it from every player; its art leaves R2. */
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "forbidden");
  const s = await getSession();
  if (!s) return jsonError(401, NEED_LOGIN);
  const { id } = (await req.json().catch(() => ({}))) as { id?: unknown };
  if (typeof id !== "string") return jsonError(400, "ข้อมูลไม่ถูกต้อง");
  try {
    const r = await botAdmin<{ deleted: string; players: number }>("admin/item/delete", { userId: s.uid, id });
    if (r.status !== 200) return jsonError(r.status, r.data.error ?? "ลบไม่สำเร็จ");
    if (r.data.evicted?.length) await deleteObjects(r.data.evicted);
    return Response.json({ deleted: r.data.deleted, players: r.data.players });
  } catch {
    return jsonError(503, BOT_DOWN);
  }
}
