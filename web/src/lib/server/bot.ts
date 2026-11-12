/**
 * Server-to-server calls to the bot's private account API (src/web/account.ts on the VM).
 * The user id always comes from the verified session — never from the browser.
 */
import type { AccountView } from "@/lib/types";

export interface AccountReply {
  character: AccountView | null;
  inGuild?: boolean;
  guildId?: string;
  evicted?: string[];
  removed?: boolean;
  error?: string;
}

export async function bot(path: "get" | "create" | "join" | "image/add" | "image/remove" | "sprite/set" | "sprite/clear", body: Record<string, unknown>) {
  const base = process.env.BOT_API_URL;
  const secret = process.env.BOT_API_SECRET;
  if (!base || !secret) throw new Error("BOT_API_URL / BOT_API_SECRET missing");
  const res = await fetch(`${base.replace(/\/$/, "")}/api/account/${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await res.json().catch(() => ({ error: "bad response" }))) as AccountReply;
  return { status: res.status, data };
}
