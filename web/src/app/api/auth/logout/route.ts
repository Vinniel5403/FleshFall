import { clearSession, sameOrigin } from "@/lib/server/session";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response(null, { status: 403 });
  await clearSession();
  return new Response(null, { status: 204 });
}
