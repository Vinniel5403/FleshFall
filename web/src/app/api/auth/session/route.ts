import { getSession } from "@/lib/server/session";

/** Cheap "am I logged in?" for the header — reads the cookie only, never calls the bot. */
export async function GET() {
  const s = await getSession();
  return Response.json(
    { user: s ? { username: s.username, avatar: s.avatar } : null },
    { headers: { "cache-control": "private, no-store" } },
  );
}
