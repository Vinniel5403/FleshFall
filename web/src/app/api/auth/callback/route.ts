import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirectUri } from "@/lib/server/me";
import { setSession, STATE_COOKIE } from "@/lib/server/session";

const WEEK = 7 * 24 * 3600 * 1000;
const same = (a: string, b: string) => !!a && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Discord OAuth callback → encrypted session cookie → back to /create. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (q = "") => Response.redirect(`${url.origin}/create${q}#forge`, 302);
  const failed = (why: string) => (console.warn(`[auth] login failed: ${why}`), back("?login=failed"));
  const jar = await cookies();
  const state = jar.get(STATE_COOKIE)?.value ?? "";
  jar.delete(STATE_COOKIE);
  const code = url.searchParams.get("code");
  if (!code) return failed(`no code (${url.searchParams.get("error") ?? "?"})`);
  if (!same(state, url.searchParams.get("state") ?? "")) return failed("state mismatch (cookie expired or blocked)");
  if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) return failed("DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET missing");

  try {
    const tok = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri(req),
      }),
      cache: "no-store",
    });
    if (!tok.ok) return failed(`token exchange ${tok.status} ${(await tok.text()).slice(0, 200)} — check client secret + redirect URI ${redirectUri(req)}`);
    const t = (await tok.json()) as { access_token: string; expires_in: number; scope: string };
    if (!t.scope.split(" ").includes("guilds.join")) return failed(`missing guilds.join scope (${t.scope})`);

    const me = await fetch("https://discord.com/api/users/@me", {
      headers: { authorization: `Bearer ${t.access_token}` },
      cache: "no-store",
    });
    if (!me.ok) return failed(`users/@me ${me.status}`);
    const u = (await me.json()) as { id: string; username: string; global_name?: string | null; avatar?: string | null };
    await setSession({
      uid: u.id,
      username: u.global_name || u.username,
      avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64` : null,
      accessToken: t.access_token,
      exp: Date.now() + Math.min(t.expires_in * 1000, WEEK),
    });
    return back();
  } catch (e) {
    return failed((e as Error).message);
  }
}
