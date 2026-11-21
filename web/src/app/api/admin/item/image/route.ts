import { randomBytes } from "node:crypto";
import { botAdmin } from "@/lib/server/bot";
import { BOT_DOWN, jsonError, NEED_LOGIN } from "@/lib/server/me";
import { deleteObjects, putObject, sniffImage } from "@/lib/server/r2";
import { getSession, sameOrigin } from "@/lib/server/session";
import type { AdminItem } from "@/lib/types";

const MAX_BYTES = 4 * 1024 * 1024;
const ID = /^[a-z][a-z0-9_]{1,31}$/;

/**
 * Upload an item's art (multipart: id, file, w, h — the browser already resized it, keeping transparency).
 * Keys are new every time (R2 objects are cached immutable); the bot hands back the replaced key to delete.
 * The bot also checks the admin list before anything is stored — an upload by anyone else is deleted again.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "forbidden");
  const s = await getSession();
  if (!s) return jsonError(401, NEED_LOGIN);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES + 64 * 1024) return jsonError(413, "ไฟล์ใหญ่เกิน 4MB");
  const form = await req.formData().catch(() => null);
  const id = form?.get("id");
  const file = form?.get("file");
  const w = Number(form?.get("w")), h = Number(form?.get("h"));
  if (typeof id !== "string" || !ID.test(id) || !(file instanceof Blob) || !(w > 0 && h > 0)) return jsonError(400, "ข้อมูลไม่ถูกต้อง");
  if (file.size > MAX_BYTES) return jsonError(413, "ไฟล์ใหญ่เกิน 4MB");
  const buf = await file.arrayBuffer();
  const kind = sniffImage(new Uint8Array(buf, 0, Math.min(16, buf.byteLength)));
  if (!kind) return jsonError(415, "รองรับเฉพาะ webp / png / jpg");

  const key = `items/${id}-${randomBytes(9).toString("hex")}.${kind.ext}`;
  try {
    await putObject(key, buf, kind.type);
  } catch (e) {
    console.warn("item upload failed", (e as Error).message);
    return jsonError(502, "อัปโหลดไม่สำเร็จ");
  }
  try {
    const r = await botAdmin<{ item: AdminItem }>("admin/item/image", { userId: s.uid, id, key, size: [Math.round(w), Math.round(h)] });
    if (r.status !== 200) {
      await deleteObjects([key]);
      return jsonError(r.status, r.data.error ?? "บันทึกรูปไม่สำเร็จ");
    }
    if (r.data.evicted?.length) await deleteObjects(r.data.evicted);
    return Response.json({ item: r.data.item });
  } catch {
    await deleteObjects([key]);
    return jsonError(503, BOT_DOWN);
  }
}

/** Remove an item's art (json: { id }) — back to the emoji. */
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "forbidden");
  const s = await getSession();
  if (!s) return jsonError(401, NEED_LOGIN);
  const { id } = (await req.json().catch(() => ({}))) as { id?: unknown };
  if (typeof id !== "string" || !ID.test(id)) return jsonError(400, "ข้อมูลไม่ถูกต้อง");
  try {
    const r = await botAdmin<{ item: AdminItem }>("admin/item/image", { userId: s.uid, id, key: null });
    if (r.status !== 200) return jsonError(r.status, r.data.error ?? "ลบไม่สำเร็จ");
    if (r.data.evicted?.length) await deleteObjects(r.data.evicted);
    return Response.json({ item: r.data.item });
  } catch {
    return jsonError(503, BOT_DOWN);
  }
}
