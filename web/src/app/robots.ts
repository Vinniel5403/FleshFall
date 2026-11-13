import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/** Everything public is crawlable (incl. AI/LLM crawlers); API + auth routes are not. */
export default function robots(): MetadataRoute.Robots {
  const disallow = ["/api/"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      {
        // explicit welcome for AI search/answer crawlers so the lore can be cited
        userAgent: ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Google-Extended", "Applebot-Extended"],
        allow: "/",
        disallow,
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
