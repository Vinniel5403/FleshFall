/**
 * Discord login session: AES-256-GCM encrypted, httpOnly cookie (no database on Vercel).
 * Holds the Discord OAuth access token (scope guilds.join) so the bot can add the player to the guild.
 * Server-only — import from route handlers.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export interface Session {
  /** Discord user id */
  uid: string;
  username: string;
  avatar: string | null;
  accessToken: string;
  /** ms epoch */
  exp: number;
}

const COOKIE = "ff_session";
export const STATE_COOKIE = "ff_oauth_state";

function key(): Buffer {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET missing (≥32 chars)");
  return createHash("sha256").update(s).digest();
}

function seal(data: Session): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(JSON.stringify(data), "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString("base64url");
}

function unseal(token: string): Session | null {
  try {
    const raw = Buffer.from(token, "base64url");
    const d = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    const s = JSON.parse(Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8")) as Session;
    return s.exp > Date.now() ? s : null;
  } catch {
    return null;
  }
}

const secure = process.env.NODE_ENV === "production";

export async function getSession(): Promise<Session | null> {
  const v = (await cookies()).get(COOKIE)?.value;
  return v ? unseal(v) : null;
}

export async function setSession(s: Session): Promise<void> {
  (await cookies()).set(COOKIE, seal(s), {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(60, Math.floor((s.exp - Date.now()) / 1000)),
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export const cookieFlags = { httpOnly: true, secure, sameSite: "lax" as const, path: "/" };

/**
 * CSRF guard for state-changing routes: the session cookie is SameSite=Lax (not sent on
 * cross-site POSTs) and we also require a same-origin Origin header.
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  return !!origin && origin === new URL(req.url).origin;
}
