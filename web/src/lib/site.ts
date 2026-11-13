/** Site-wide SEO constants (shared by layout metadata, robots, sitemap, llms.txt, JSON-LD). */
export const SITE = "https://fleshfall.org";
export const SITE_NAME = "Fleshfall";
export const SITE_TITLE = "Fleshfall — เมดเนื้อ";
export const DESCRIPTION =
  "Fleshfall (เมดเนื้อ) เกม RPG สยองขวัญบน Discord จากโลก ARG — สร้างเมด นักล่าเนื้อ หรือคนหลงมิติ ออกล่าใน Old Realm ผ่านประตูสี 7 บานของ 7 Icon แล้วกลับ Rouge Land ให้รอดพร้อมเนื้อ";

/** Public, indexable pages. `/create` stays indexable: it's the sign-up landing. */
export const PAGES: { path: string; title: string; desc: string; priority: number; freq: "daily" | "weekly" | "monthly" }[] = [
  { path: "/", title: SITE_TITLE, desc: DESCRIPTION, priority: 1, freq: "weekly" },
  {
    path: "/world",
    title: "แผนที่ Old Realm",
    desc: "แผนที่ Old Realm มิติซ้อนทับโลกจริง 7 ทวีป 50 เมือง ระดับ Easy ถึง Epic แต่ละทวีปมี Icon ปกครองและประตูดันเจียนสีประจำ",
    priority: 0.8,
    freq: "weekly",
  },
  {
    path: "/codex",
    title: "คัมภีร์",
    desc: "คัมภีร์ Fleshfall: 7 Icon (Beelzebub, Hastur, Loki, Belphegor, Sophia, Thanatos, Wendigo), บทบาท M.A.I.D.S, สัตว์ประหลาด และไอเทมทั้งหมด",
    priority: 0.8,
    freq: "weekly",
  },
  {
    path: "/players",
    title: "แฟ้มประวัติผู้เล่น",
    desc: "ค้นหาตัวละครของผู้เล่น Fleshfall ดูภาพ ชีทตัวละคร สไปรต์ ค่าพลัง และบันทึกประวัติของแต่ละคน",
    priority: 0.7,
    freq: "daily",
  },
  {
    path: "/create",
    title: "สร้างตัวละคร",
    desc: "สร้างตัวละคร Fleshfall ด้วยบัญชี Discord เลือกบทบาท อัปโหลดภาพและสไปรต์ แล้วเข้าเซิร์ฟเวอร์เล่นได้ทันที",
    priority: 0.9,
    freq: "monthly",
  },
];

export function page(path: string) {
  return PAGES.find((p) => p.path === path)!;
}

/** Shared Open Graph / Twitter base. Page-level openGraph replaces the layout's whole object, so pages spread this. */
export const OG = {
  type: "website" as const,
  siteName: SITE_NAME,
  locale: "th_TH",
  images: [{ url: "/opengraph-image.jpg", width: 1200, height: 630, alt: "Fleshfall — สู่แดนแห่งเนื้อสดและเมดผู้หิวโหย" }],
};
export const TWITTER = { card: "summary_large_image" as const, images: ["/twitter-image.jpg"] };

/** Full metadata for a public page in PAGES (title, description, canonical, OG, Twitter). */
export function pageMeta(path: string) {
  const p = page(path);
  const title = `${p.title} · ${SITE_NAME}`;
  return {
    title: p.title,
    description: p.desc,
    alternates: { canonical: p.path },
    openGraph: { ...OG, title, description: p.desc, url: p.path },
    twitter: { ...TWITTER, title, description: p.desc },
  };
}
