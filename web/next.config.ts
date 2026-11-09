import type { NextConfig } from "next";

/** Fully static site — game data is bundled from web/src/data/game.json (`npm run web:data`). */
const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
