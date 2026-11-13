/**
 * One-off: move character uploads out of Discord-id paths (chars/<uid>/…, sprites/<uid>/…) into the
 * opaque media folder (chars/<mediaId>/…), so public image URLs stop leaking Discord ids.
 *
 *   cd web && npx tsx scripts/migrate-media.ts            # dry run: list what would move
 *   cd web && npx tsx scripts/migrate-media.ts --apply    # copy → repoint character → delete old
 *   add --keep-old to skip deleting the old objects
 *
 * Needs web/.env.local (or env): BOT_API_URL, BOT_API_SECRET, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 * R2_SECRET_ACCESS_KEY, R2_BUCKET. Bot must be running the version with /api/account/media/*.
 * Safe to re-run: already-moved characters are no longer listed.
 */
import { existsSync } from "node:fs";
import { AwsClient } from "aws4fetch";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const APPLY = process.argv.includes("--apply");
const KEEP_OLD = process.argv.includes("--keep-old");

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} missing`);
  return v;
}

const r2 = new AwsClient({ accessKeyId: env("R2_ACCESS_KEY_ID"), secretAccessKey: env("R2_SECRET_ACCESS_KEY"), service: "s3", region: "auto" });
const bucket = env("R2_BUCKET");
const enc = (key: string) => key.split("/").map(encodeURIComponent).join("/");
const objectUrl = (key: string) => `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com/${bucket}/${enc(key)}`;

async function botCall<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${env("BOT_API_URL").replace(/\/$/, "")}/api/account/${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${env("BOT_API_SECRET")}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(`bot ${path} ${res.status}: ${data.error ?? ""}`);
  return data;
}

/** Server-side copy (S3 CopyObject); keeps content-type + cache-control. */
async function copy(from: string, to: string): Promise<void> {
  const res = await r2.fetch(objectUrl(to), { method: "PUT", headers: { "x-amz-copy-source": `/${bucket}/${enc(from)}` } });
  if (!res.ok) throw new Error(`copy ${from} → ${to}: ${res.status} ${await res.text()}`);
}

async function remove(key: string): Promise<void> {
  const res = await r2.fetch(objectUrl(key), { method: "DELETE" });
  if (!res.ok && res.status !== 404) console.warn(`  ! delete ${key}: ${res.status}`);
}

type Legacy = { userId: string; mediaId: string | null; images: string[]; sprite: { base: string; keys: string[] } | null };

const swap = (key: string, mid: string) => key.split("/").map((p, i) => (i === 1 ? mid : p)).join("/");

async function main(): Promise<void> {
  const { users } = await botCall<{ users: Legacy[] }>("media/legacy", {});
  console.log(`${users.length} character(s) with Discord-id paths${APPLY ? "" : " (dry run — pass --apply to migrate)"}`);

  let moved = 0;
  for (const u of users) {
    if (!u.mediaId) throw new Error("bot has no API_SECRET");
    const map: Record<string, string> = {};
    const objects: [string, string][] = [];
    for (const k of u.images) {
      map[k] = swap(k, u.mediaId);
      objects.push([k, map[k]!]);
    }
    if (u.sprite) {
      map[u.sprite.base] = swap(u.sprite.base, u.mediaId);
      for (const k of u.sprite.keys) objects.push([k, swap(k, u.mediaId)]);
    }
    console.log(`- ${u.mediaId}: ${objects.length} object(s)`);
    if (!APPLY) continue;
    try {
      for (const [from, to] of objects) await copy(from, to);
      await botCall("media/rename", { userId: u.userId, map });
    } catch (e) {
      console.warn(`  ! skipped: ${(e as Error).message}`); // old objects untouched, character still on old keys
      continue;
    }
    if (!KEEP_OLD) for (const [from] of objects) await remove(from);
    moved++;
  }
  if (APPLY) console.log(`done: ${moved}/${users.length} migrated${KEEP_OLD ? " (old objects kept)" : ""}`);
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
