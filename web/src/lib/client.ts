/** Browser-side helpers shared by /create (CharacterForge) and /profile (ProfileStudio). Client components only. */
import type { ImageSlot } from "./types";

/** Upload body cap (Vercel ~4.5MB; the route handler also checks). */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Longest edge per slot after browser-side resize. */
export const MAX_DIM: Record<ImageSlot, number> = { portrait: 1024, art: 2560, sheet: 2560, gallery: 2048 };

/** Resize + re-encode in the browser (webp, jpeg fallback) so uploads stay small and clean. */
export async function shrink(file: Blob, maxDim: number): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  let dim = maxDim;
  for (let attempt = 0; attempt < 4; attempt++) {
    const scale = Math.min(1, dim / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bmp.width * scale));
    canvas.height = Math.max(1, Math.round(bmp.height * scale));
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const enc = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
    let blob = await enc("image/webp", 0.88);
    if (!blob || blob.type !== "image/webp") blob = await enc("image/jpeg", 0.88); // Safari without webp encode
    if (blob && blob.size <= MAX_UPLOAD_BYTES) return blob;
    dim = Math.round(dim * 0.75);
  }
  throw new Error("ภาพใหญ่เกินไป");
}

/** fetch → JSON; throws the server's Thai `error` message on non-2xx. */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "เกิดข้อผิดพลาด");
  return data;
}

export const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

/** Login state broadcast: the header listens so it can swap "สร้างตัวละคร" ↔ "โปรไฟล์" without a reload. */
export const AUTH_EVENT = "ff:auth";
export interface AuthUser { username: string; avatar: string | null }
export const announceAuth = (user: AuthUser | null) => window.dispatchEvent(new CustomEvent<AuthUser | null>(AUTH_EVENT, { detail: user }));
