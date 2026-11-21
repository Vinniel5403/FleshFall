import { botAdmin } from "@/lib/server/bot";
import { BOT_DOWN, jsonError, NEED_LOGIN } from "@/lib/server/me";
import { getSession, sameOrigin } from "@/lib/server/session";
import type { AdminItem } from "@/lib/types";

/** Put a code item back the way items.ts has it (json: { id }); uploaded art stays. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "forbidden");
  const s = await getSession();
  if (!s) return jsonError(401, NEED_LOGIN);
  const { id } = (await req.json().catch(() => ({}))) as { id?: unknown };
  if (typeof id !== "string") return jsonError(400, "ข้อมูลไม่ถูกต้อง");
  try {
    const r = await botAdmin<{ item: AdminItem }>("admin/item/reset", { userId: s.uid, id });
    if (r.status !== 200) return jsonError(r.status, r.data.error ?? "รีเซ็ตไม่สำเร็จ");
    return Response.json(r.data);
  } catch {
    return jsonError(503, BOT_DOWN);
  }
}
