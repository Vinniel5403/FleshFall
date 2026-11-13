import { botPublic } from "@/lib/server/bot";
import { BOT_DOWN, jsonError } from "@/lib/server/me";
import { publicUrl } from "@/lib/server/r2";
import type { PlayerHit } from "@/lib/types";

/** Character name search for /players (proxies the bot's public API, adds portrait URLs). */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 40);
  try {
    const hits = (await botPublic<PlayerHit[]>(`characters?q=${encodeURIComponent(q)}`)) ?? [];
    return Response.json(hits.map((h) => ({ ...h, portraitUrl: h.portrait ? publicUrl(h.portrait) : null })));
  } catch {
    return jsonError(503, BOT_DOWN);
  }
}
