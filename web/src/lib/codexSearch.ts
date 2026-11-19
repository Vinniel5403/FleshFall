/**
 * Search index for /codex — one entry per card/paragraph of `lib/codex.ts`.
 * Built on the server (static page) and handed to `components/CodexSearch.tsx`.
 */
import { ABYSS, CHAPTERS, CREATION, DOORS, FIENDS, FLESH, ICONS, ICONS_INTRO, ICON_RULES, LANDS, MAIDS, PROLOGUE, ROLES, TAG_RULES, THANKS } from "./codex";

type ChapterId = (typeof CHAPTERS)[number]["id"];

export interface CodexEntry {
  /** Chapter the entry belongs to (label + roman numeral in the result row). */
  ch: ChapterId;
  /** Element id to jump to (a chapter, `icon-<id>` or `role-<id>`). */
  anchor: string;
  title: string;
  /** English name shown beside the title, also searchable. */
  en?: string;
  /** Everything else that should match. */
  text: string;
  /** Exact on-page text to land on inside the anchor (defaults to the title; "" = the anchor itself). */
  find?: string;
}

const join = (...parts: (string | undefined | readonly string[])[]) => parts.flat().filter(Boolean).join(" · ");

export function codexIndex(): CodexEntry[] {
  const out: CodexEntry[] = [];
  const add = (ch: ChapterId, title: string, text: string, more: Partial<CodexEntry> = {}) => out.push({ ch, anchor: ch, title, text, ...more });

  for (const c of CHAPTERS) add(c.id, c.th, "", { en: c.en, find: "" });

  add("prologue", "ยินดีต้อนรับ", PROLOGUE.welcome, { find: PROLOGUE.welcome });
  for (const t of PROLOGUE.tenets) add("prologue", t.th, t.body, { en: t.en });
  add("prologue", "พิธีกรรมเข้าสู่ subspace", PROLOGUE.ritual, { find: PROLOGUE.ritual });

  for (const l of LANDS) add("geography", l.th, join(l.tag, l.body, l.notes), { en: l.en, find: l.en });

  add("flesh", FLESH.fresh.th, join(FLESH.fresh.lead, FLESH.fresh.body), { en: FLESH.fresh.en });
  add("flesh", FLESH.rotten.th, join(FLESH.rotten.lead, FLESH.rotten.body), { en: FLESH.rotten.en });
  add("flesh", FLESH.moon.th, FLESH.moon.body, { en: "CRIMSON MOON" });

  add("maids", "M.A.I.D.S", MAIDS.full, { find: MAIDS.full });
  for (const o of MAIDS.origin) add("maids", o.th, o.body, { en: o.en });
  add("maids", "คุณสมบัติของผู้รับใช้", join(MAIDS.vows));
  add("maids", MAIDS.priest.name, join(MAIDS.priest.title, MAIDS.priest.body));
  for (const r of MAIDS.priest.rites) add("maids", r.th, r.body);
  add("maids", "ฟอนแตงเดอซัง", join(MAIDS.fontaine.body, MAIDS.fontaine.notes), { en: MAIDS.fontaine.name, find: MAIDS.fontaine.name });
  for (const g of MAIDS.grades) add("maids", `Grade ${g.g} — ${g.en}`, join(g.lead, g.duties, g.hunt), { find: g.en });

  add("icons", "รูปบูชาคืออะไร", ICONS_INTRO, { find: ICONS_INTRO });
  for (const ic of ICONS)
    add("icons", ic.title, join(ic.of, ic.doorTh, ic.realm, ic.concept, ic.blessing, ic.curse, ic.followers, ic.dungeon, ic.note), { en: ic.name, anchor: `icon-${ic.id}`, find: ic.name });
  for (const r of ICON_RULES) add("icons", r.th, r.body);

  add("doors", "ประตูดันเจียน", DOORS.lead, { find: DOORS.lead });
  for (const d of DOORS.special) add("doors", d.th, d.body);
  add("doors", "กฎของประตูทางออก", join(DOORS.rule, DOORS.source), { find: DOORS.rule });

  add("fiends", "ปีศาจคืออะไร", FIENDS.lead, { en: "Fiend", find: FIENDS.lead });
  for (const f of FIENDS.causes) add("fiends", f.th, f.body);
  add("fiends", "รูปร่างของปีศาจ", FIENDS.forms, { find: FIENDS.forms });
  add("fiends", FIENDS.metal.th, join(FIENDS.metal.items.map((m) => `${m.th} ${m.body}`)), { en: FIENDS.metal.en });

  add("abyss", "ทะเลทมิฬ", ABYSS.lead, { en: "Abysmarine", find: "Abysmarine" });
  for (const f of ABYSS.facts) add("abyss", f.th, f.body);
  add("abyss", ABYSS.salt.th, ABYSS.salt.body, { en: ABYSS.salt.en });

  for (const r of ROLES) add("characters", r.th, join(r.body, r.points, r.sheets?.map((s) => s.caption)), { en: r.en, anchor: `role-${r.id}`, find: r.en });
  add("characters", "แนวทางการวาด & การสร้างตัวละคร", join(CREATION.tone, CREATION.rule));
  for (const a of CREATION.appendix) add("characters", a.th, a.body, { find: a.body });

  TAG_RULES.forEach((r, n) => add("rules", `กฎข้อ ${n + 1}`, r, { find: r }));

  for (const t of THANKS) add("credits", t.name, t.role);

  return out;
}
