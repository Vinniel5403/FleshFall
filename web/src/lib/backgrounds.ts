import { readdirSync } from "node:fs";
import { join } from "node:path";
import { ART } from "./art";

export interface Slide {
  src: string;
  pos: string;
}

const IMG = /\.(png|jpe?g|webp|avif|gif)$/i;

/** Every image in public/background, sorted by name. Known art keeps its focus point. */
export function backgroundSlides(): Slide[] {
  let files: string[] = [];
  try {
    files = readdirSync(join(process.cwd(), "public", "background")).filter((f) => IMG.test(f)).sort();
  } catch {
    return [ART.kv];
  }
  const known = new Map(Object.values(ART).map((a) => [a.src, a.pos]));
  return files.map((f) => {
    const src = `/background/${encodeURIComponent(f)}`;
    return { src, pos: known.get(src) ?? "50% 40%" };
  });
}
