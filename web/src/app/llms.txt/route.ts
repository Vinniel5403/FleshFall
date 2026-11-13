import { llmsTxt } from "@/lib/llms";

/** Static (prerendered at build) — no request data used. */
export function GET() {
  return new Response(llmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}
