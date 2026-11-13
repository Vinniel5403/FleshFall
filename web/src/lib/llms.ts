import { GAME } from "./game";
import { DESCRIPTION, PAGES, SITE, SITE_NAME } from "./site";

/** llms.txt spec (llmstxt.org): H1, blockquote summary, prose, then H2 link lists. Teaser-level only. */
export function llmsTxt(): string {
  const { icons, roles } = GAME;
  return [
    `# ${SITE_NAME} (เมดเนื้อ)`,
    "",
    `> ${DESCRIPTION}`,
    "",
    "Fleshfall เป็นโปรเจกต์ ARG สยองขวัญภาษาไทย (18+, CW: gore · violence · religion) เล่นเป็นเกม RPG ผ่านบอท Discord — ตอนนี้อยู่ในช่วง Coming Soon",
    "ผู้เล่นออกจาก Rouge Land (เกาะเนื้อ) ไปล่าสัตว์ประหลาดในเมืองต่าง ๆ ของ Old Realm ของที่ได้ระหว่างทางจะใช้ได้ก็ต่อเมื่อกลับบ้านได้อย่างปลอดภัย",
    "",
    `- 7 Icon (เทพ): ${icons.map((i) => i.name).join(", ")}`,
    `- บทบาท: ${roles.map((r) => r.name).join(", ")}`,
    "- ศัพท์เฉพาะ: Icon, M.A.I.D.S, Miasma, Rouge Land, Fiend, Old Realm, Cypress Isle",
    "- แฮชแท็ก: #FleshFall_ARG #FF_ARG #เมดเนื้อ",
    "",
    "## Pages",
    "",
    ...PAGES.map((p) => `- [${p.title}](${SITE}${p.path === "/" ? "" : p.path}): ${p.desc}`),
    "",
    "## Optional",
    "",
    `- [Sitemap](${SITE}/sitemap.xml)`,
    "",
  ].join("\n");
}
