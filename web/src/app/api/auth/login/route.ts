import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirectUri } from "@/lib/server/me";
import { cookieFlags, STATE_COOKIE } from "@/lib/server/session";

/** Start Discord OAuth. `guilds.join` lets the bot add the player to the server after creation. */
export async function GET(req: Request) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) return new Response("DISCORD_CLIENT_ID missing", { status: 500 });
  const state = randomBytes(16).toString("hex");
  (await cookies()).set(STATE_COOKIE, state, { ...cookieFlags, maxAge: 600 });
  const q = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri(req),
    scope: "identify guilds.join",
    state,
    prompt: "none",
  });
  return Response.redirect(`https://discord.com/oauth2/authorize?${q}`, 302);
}
