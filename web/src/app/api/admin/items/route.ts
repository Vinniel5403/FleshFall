import { botAdmin } from "@/lib/server/bot";
import { BOT_DOWN, jsonError, NEED_LOGIN } from "@/lib/server/me";
import { getSession } from "@/lib/server/session";
import type { AdminCatalog } from "@/lib/types";

/** Every item + the option lists the editor needs (admins only — the bot answers 403 otherwise). */
export async function GET() {
  const s = await getSession();
  if (!s) return jsonError(401, NEED_LOGIN);
  try {
    const r = await botAdmin<AdminCatalog>("admin/items", { userId: s.uid });
    if (r.status !== 200) return jsonError(r.status, r.data.error ?? "โหลดไม่สำเร็จ");
    return Response.json(r.data);
  } catch {
    return jsonError(503, BOT_DOWN);
  }
}
