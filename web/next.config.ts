import type { NextConfig } from "next";

/** Bot's web API (src/web/server.ts). `npm run api` at the repo root, or API_PORT in the bot. */
const API = process.env.FLESHFALL_API ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API}/api/:path*` }];
  },
};

export default nextConfig;
