import { randomBytes } from "node:crypto";
import { bot } from "@/lib/server/bot";
import { BOT_DOWN, jsonError, NEED_LOGIN, withUrls } from "@/lib/server/me";
import { mediaId } from "@/lib/server/media";
import { deleteObjects, putObject, sniffImage } from "@/lib/server/r2";
import { getSession, sameOrigin } from "@/lib/server/session";

/** Mirrors IMAGE_MAX_BYTES in src/game/account.ts (Vercel caps request bodies at 4.5MB). */
const MAX_BYTES = 4 * 1024 * 1024;
const SLOTS = new Set(["portrait", "art", "sheet", "gallery"]);

/** Upload one image (multipart: slot, file). The browser already resized it to webp. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "forbidden");
  const s = await getSession();
  if (!s) return jsonError(401, NEED_LOGIN);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES + 64 * 1024) return jsonError(413, "ไฟล์ใหญ่เกิน 4MB");

  const form = await req.formData().catch(() => null);
  const slot = form?.get("slot");
  const file = form?.get("file");
  if (typeof slot !== "string" || !SLOTS.has(slot) || !(file instanceof Blob)) return jsonError(400, "ข้อมูลไม่ถูกต้อง");
  if (file.size > MAX_BYTES) return jsonError(413, "ไฟล์ใหญ่เกิน 4MB");
  const buf = await file.arrayBuffer();
  const kind = sniffImage(new Uint8Array(buf, 0, Math.min(16, buf.byteLength)));
  if (!kind) return jsonError(415, "รองรับเฉพาะ webp / png / jpg");

  const key = `chars/${mediaId(s.uid)}/${slot}-${randomBytes(9).toString("hex")}.${kind.ext}`;
  try {
    await putObject(key, buf, kind.type);
  } catch (e) {
    console.warn("upload failed", (e as Error).message);
    return jsonError(502, "อัปโหลดไม่สำเร็จ");
  }
  try {
    const r = await bot("image/add", { userId: s.uid, slot, key });
    if (r.status !== 200) {
      await deleteObjects([key]);
      return jsonError(r.status, r.data.error ?? "บันทึกภาพไม่สำเร็จ");
    }
    if (r.data.evicted?.length) await deleteObjects(r.data.evicted);
    return Response.json({ character: withUrls(r.data.character) });
  } catch {
    await deleteObjects([key]);
    return jsonError(503, BOT_DOWN);
  }
}

/** Remove one image (json: { key }). */
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "forbidden");
  const s = await getSession();
  if (!s) return jsonError(401, NEED_LOGIN);
  const { key } = (await req.json().catch(() => ({}))) as { key?: unknown };
  // the bot only removes keys that are on this character (and reports `removed`), so R2 deletes stay scoped
  if (typeof key !== "string" || !/^chars\/[0-9a-z]+\/[a-z]+-[a-z0-9]+\.(webp|png|jpg)$/.test(key)) return jsonError(400, "ข้อมูลไม่ถูกต้อง");
  try {
    const r = await bot("image/remove", { userId: s.uid, key });
    if (r.status !== 200) return jsonError(r.status, r.data.error ?? "ลบไม่สำเร็จ");
    if (r.data.removed) await deleteObjects([key]);
    return Response.json({ character: withUrls(r.data.character) });
  } catch {
    return jsonError(503, BOT_DOWN);
  }
}
