/**
 * Cloudflare R2 (S3-compatible) for character images. Only the server touches the bucket;
 * the browser uploads to our route handler, which validates bytes before storing.
 * Public reads go through the bucket's custom domain (R2_PUBLIC_URL), never through Vercel.
 */
import { AwsClient } from "aws4fetch";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} missing`);
  return v;
}

let client: AwsClient | null = null;
const r2 = () =>
  (client ??= new AwsClient({
    accessKeyId: env("R2_ACCESS_KEY_ID"),
    secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    service: "s3",
    region: "auto",
  }));

const objectUrl = (key: string) =>
  `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com/${env("R2_BUCKET")}/${key.split("/").map(encodeURIComponent).join("/")}`;

export const publicUrl = (key: string) => `${env("R2_PUBLIC_URL").replace(/\/$/, "")}/${key}`;

export async function putObject(key: string, body: ArrayBuffer, contentType: string): Promise<void> {
  // Sign, then send the raw bytes ourselves: aws4fetch's own fetch re-wraps the body as a stream,
  // which goes out chunked without Content-Length and R2 answers 411.
  const signed = await r2().sign(objectUrl(key), {
    method: "PUT",
    body,
    headers: { "content-type": contentType, "cache-control": "public, max-age=31536000, immutable" },
  });
  const res = await fetch(signed.url, { method: "PUT", headers: signed.headers, body: new Uint8Array(body) });
  if (!res.ok) throw new Error(`R2 put ${res.status}`);
}

export async function deleteObjects(keys: string[]): Promise<void> {
  await Promise.all(
    keys.map((k) =>
      r2()
        .fetch(objectUrl(k), { method: "DELETE" })
        .then((r) => !r.ok && r.status !== 404 && console.warn("R2 delete", k, r.status))
        .catch((e) => console.warn("R2 delete", k, (e as Error).message)),
    ),
  );
}

/** Sniff the real format from magic bytes (ignore the browser's claimed type). */
export function sniffImage(b: Uint8Array): { ext: "webp" | "png" | "jpg"; type: string } | null {
  const at = (i: number, ...v: number[]) => v.every((x, j) => b[i + j] === x);
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return { ext: "webp", type: "image/webp" };
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { ext: "png", type: "image/png" };
  if (at(0, 0xff, 0xd8, 0xff)) return { ext: "jpg", type: "image/jpeg" };
  return null;
}
