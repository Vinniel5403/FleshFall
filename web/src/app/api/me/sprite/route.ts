import { randomBytes } from "node:crypto";
import { bot } from "@/lib/server/bot";
import { BOT_DOWN, jsonError, NEED_LOGIN, withUrls } from "@/lib/server/me";
import { deleteObjects, putObject, sniffImage } from "@/lib/server/r2";
import { getSession, sameOrigin } from "@/lib/server/session";

/** Matches SPRITE_BUDGET in lib/psd.ts (Vercel caps bodies at 4.5MB). */
const MAX_BODY = 4.3 * 1024 * 1024;
const MAX_PARTS = 40;

interface PartIn { id: string; x: number; y: number; w: number; h: number; z: number; ext: string; top?: unknown; bot?: unknown; hand?: unknown }

/**
 * Save a sprite parsed in the browser (multipart: `rig` JSON + one file per part named `p_<id>`).
 * Part bytes are sniffed here; the bot re-validates the manifest before storing it.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "forbidden");
  const s = await getSession();
  if (!s) return jsonError(401, NEED_LOGIN);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return jsonError(413, "สไปรต์ใหญ่เกินไป");

  const form = await req.formData().catch(() => null);
  let rig: { width: number; height: number; parts: PartIn[]; heightCm?: unknown };
  try {
    rig = JSON.parse(String(form?.get("rig") ?? ""));
  } catch {
    return jsonError(400, "ข้อมูลไม่ถูกต้อง");
  }
  if (!form || !Array.isArray(rig?.parts) || !rig.parts.length || rig.parts.length > MAX_PARTS) return jsonError(400, "ข้อมูลไม่ถูกต้อง");

  // read + sniff every part before touching storage
  const files: { part: PartIn; buf: ArrayBuffer; type: string }[] = [];
  for (const part of rig.parts) {
    if (typeof part?.id !== "string" || !/^[a-z0-9_]{1,40}$/.test(part.id)) return jsonError(400, "ชื่อส่วนไม่ถูกต้อง");
    const f = form.get(`p_${part.id}`);
    if (!(f instanceof Blob)) return jsonError(400, `ไม่พบไฟล์ของ ${part.id}`);
    const buf = await f.arrayBuffer();
    const kind = sniffImage(new Uint8Array(buf, 0, Math.min(16, buf.byteLength)));
    if (!kind || kind.ext === "jpg" || kind.ext !== part.ext) return jsonError(415, `ไฟล์ ${part.id} ต้องเป็น webp/png`);
    files.push({ part, buf, type: kind.type });
  }

  const base = `sprites/${s.uid}/${randomBytes(9).toString("hex")}`;
  const keys = files.map((f) => `${base}/${f.part.id}.${f.part.ext}`);
  try {
    await Promise.all(files.map((f, i) => putObject(keys[i], f.buf, f.type)));
  } catch (e) {
    console.warn("sprite upload failed", (e as Error).message);
    await deleteObjects(keys);
    return jsonError(502, "อัปโหลดไม่สำเร็จ");
  }
  try {
    const sprite = {
      base,
      width: rig.width,
      height: rig.height,
      heightCm: rig.heightCm,
      parts: rig.parts.map(({ id, x, y, w, h, z, ext, top, bot, hand }) => ({ id, x, y, w, h, z, ext, top, bot, hand })),
    };
    const r = await bot("sprite/set", { userId: s.uid, sprite });
    if (r.status !== 200) {
      await deleteObjects(keys);
      return jsonError(r.status, r.data.error ?? "บันทึกสไปรต์ไม่สำเร็จ");
    }
    if (r.data.evicted?.length) await deleteObjects(r.data.evicted);
    return Response.json({ character: withUrls(r.data.character) });
  } catch {
    await deleteObjects(keys);
    return jsonError(503, BOT_DOWN);
  }
}

/** Change only the character's height (json: { heightCm }). */
export async function PATCH(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "forbidden");
  const s = await getSession();
  if (!s) return jsonError(401, NEED_LOGIN);
  const { heightCm } = (await req.json().catch(() => ({}))) as { heightCm?: unknown };
  try {
    const r = await bot("sprite/height", { userId: s.uid, heightCm });
    if (r.status !== 200) return jsonError(r.status, r.data.error ?? "บันทึกไม่สำเร็จ");
    return Response.json({ character: withUrls(r.data.character) });
  } catch {
    return jsonError(503, BOT_DOWN);
  }
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "forbidden");
  const s = await getSession();
  if (!s) return jsonError(401, NEED_LOGIN);
  try {
    const r = await bot("sprite/clear", { userId: s.uid });
    if (r.status !== 200) return jsonError(r.status, r.data.error ?? "ลบไม่สำเร็จ");
    if (r.data.evicted?.length) await deleteObjects(r.data.evicted);
    return Response.json({ character: withUrls(r.data.character) });
  } catch {
    return jsonError(503, BOT_DOWN);
  }
}
