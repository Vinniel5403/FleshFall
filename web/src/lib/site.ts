/** Site-wide SEO constants (shared by layout metadata, robots, sitemap, llms.txt, manifest, JSON-LD). */
export const SITE = "https://fleshfall.org";
export const SITE_NAME = "Fleshfall";
export const SITE_TITLE = "Fleshfall — เมดเนื้อ";
export const DESCRIPTION =
  "Fleshfall (เมดเนื้อ) เกม RPG สยองขวัญบน Discord จากโลก ARG — เป็นเมด นักล่าเนื้อ หรือคนหลงมิติ ออกล่าใน Old Realm ผ่านประตูสีของ 7 Icon แล้วกลับ Rouge Land ให้รอด เร็ว ๆ นี้";
export const THEME = "#0b0606";

/** Public, indexable pages. Coming-soon build = landing only. */
export const PAGES: { path: string; title: string; desc: string; priority: number; freq: "daily" | "weekly" | "monthly" }[] = [
  { path: "/", title: SITE_TITLE, desc: DESCRIPTION, priority: 1, freq: "weekly" },
];
