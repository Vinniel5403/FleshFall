import { GAME } from "./game";
import { DESCRIPTION, PAGES, SITE, SITE_NAME } from "./site";

/** llms.txt spec (llmstxt.org): H1, blockquote summary, prose, then H2 link lists. */
export function llmsTxt(): string {
  const { icons, roles } = GAME;
  return [
    `# ${SITE_NAME} (เมดเนื้อ)`,
    "",
    `> ${DESCRIPTION}`,
    "",
    "Fleshfall เป็นโปรเจกต์ ARG สยองขวัญภาษาไทย เล่นเป็นเกม RPG ผ่านบอท Discord ส่วนเว็บไซต์ใช้สร้างตัวละคร (ล็อกอินด้วย Discord) และเป็นคลังข้อมูลโลก",
    "ผู้เล่นออกจาก Rouge Land (เกาะเนื้อ) ไปล่าสัตว์ประหลาดในเมืองต่าง ๆ ของ Old Realm ของที่ได้ระหว่างทางจะใช้ได้ก็ต่อเมื่อกลับบ้านได้อย่างปลอดภัย ถ้าตายก่อนถึงบ้านจะเสียของทั้งรอบ",
    "",
    `- 7 Icon (เทพ): ${icons.map((i) => `${i.name} (${i.doorName})`).join(", ")}`,
    `- บทบาท: ${roles.map((r) => r.name).join(", ")}`,
    "- ศัพท์เฉพาะที่ใช้เป็นภาษาอังกฤษ: Icon, M.A.I.D.S, Miasma, Rouge Land, Fiend, Old Realm, Cypress Isle",
    "",
    "## Pages",
    "",
    ...PAGES.map((p) => `- [${p.title}](${SITE}${p.path === "/" ? "" : p.path}): ${p.desc}`),
    "",
    "## Reference",
    "",
    `- [Full game data](${SITE}/llms-full.txt): ข้อมูลโลก Icon บทบาท ทวีป เมือง สัตว์ประหลาด และไอเทมทั้งหมดในไฟล์เดียว`,
    "",
    "## Optional",
    "",
    `- [Sitemap](${SITE}/sitemap.xml)`,
    "",
  ].join("\n");
}

/** Everything static on the site as one plain-text dump for LLM context windows. */
export function llmsFullTxt(): string {
  const { world, icons, roles, items, bestiary } = GAME;
  const out: string[] = [llmsTxt(), "---", "", "## Icons", ""];
  for (const i of icons) {
    out.push(`### ${i.emoji} ${i.name} — ${i.title}`, "", `- ประตู: ${i.doorName}`, `- แนวคิด: ${i.concept}`, `- พร: ${i.blessing}`, `- ผลกรรม: ${i.repercussion}`, "");
  }
  out.push("## Roles", "");
  for (const r of roles) {
    out.push(`### ${r.emoji} ${r.name}`, "", r.short, "", ...r.perks.map((p) => `- ${p}`), `- ค่าพื้นฐาน: STR ${r.stats.str} · AGI ${r.stats.agi} · INT ${r.stats.int} · HP ${r.maxHp}`, "");
  }
  out.push("## Dungeon doors", "");
  for (const d of Object.values(world.doors)) out.push(`- ${d.emoji} ${d.name}${d.rule ? `: ${d.rule.note}` : ""}`);
  out.push("", "## Old Realm — continents & cities", "");
  for (const c of world.continents) {
    out.push(`### ${c.emoji} ${c.name} (Icon: ${c.icon}, ประตู ${world.doors[c.door]?.name ?? c.door})`, "");
    for (const city of c.cities) out.push(`- ${city.emoji} ${city.name} [${world.tiers[city.tier]?.name ?? city.tier}]: ${city.desc}`);
    out.push("");
  }
  out.push("## Bestiary", "");
  for (const m of bestiary) out.push(`- ${m.emoji} ${m.name}: ${m.desc} (HP ${m.hp}, AC ${m.ac}, dmg ${m.dmg[0]}–${m.dmg[1]})`);
  out.push("", "## Items", "");
  for (const it of items) out.push(`- ${it.emoji} ${it.name} [${it.type}]: ${it.description}`);
  out.push("");
  return out.join("\n");
}
