import type { MetadataRoute } from "next";
import { DESCRIPTION, SITE_NAME, SITE_TITLE, THEME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    short_name: SITE_NAME,
    description: DESCRIPTION,
    lang: "th",
    start_url: "/",
    display: "standalone",
    background_color: THEME,
    theme_color: THEME,
    icons: [
      { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { src: "/icon.png", sizes: "160x160", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
