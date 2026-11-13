import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";
import { PAGES, SITE } from "@/lib/site";

/** Images under public/<dir>, as absolute URLs (image sitemap → Google Images). */
function images(dir: string): string[] {
  try {
    return readdirSync(join(process.cwd(), "public", dir))
      .filter((f) => /\.(webp|png|jpe?g)$/i.test(f))
      .sort()
      .map((f) => `${SITE}/${dir}/${encodeURIComponent(f)}`);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("max"); // lastmod = build time, not every revalidate (keeps Google trusting it)
  const built = new Date();
  const art: Record<string, string[]> = {
    "/": [...images("background"), ...images("asset")],
    "/codex": images("icons"),
  };
  return PAGES.map((p) => ({
    url: p.path === "/" ? SITE : `${SITE}${p.path}`,
    lastModified: built,
    changeFrequency: p.freq,
    priority: p.priority,
    ...(art[p.path]?.length ? { images: art[p.path] } : {}),
  }));
}
