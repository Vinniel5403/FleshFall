import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageBanner } from "@/components/PageBanner";
import { SectionHead } from "@/components/SectionHead";
import { Brackets } from "@/components/Dossier";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";
import { CodexNav } from "@/components/CodexNav";
import { doorVar } from "@/lib/md";
import { pageMeta } from "@/lib/site";
import {
  ABYSS,
  CHAPTERS,
  CODEX_ART,
  CREATION,
  DOORS,
  FIENDS,
  FLESH,
  ICONS,
  ICONS_INTRO,
  ICON_RULES,
  LANDS,
  MAIDS,
  PROLOGUE,
  ROLES,
  TAG_RULES,
  THANKS,
} from "@/lib/codex";
import "../codex.css";

export const metadata: Metadata = pageMeta("/codex");

const css = (v: Record<string, string>) => v as React.CSSProperties;

/** One chapter: anchor + roman numeral + ornate head. */
function Chapter({ id, children, className = "" }: { id: (typeof CHAPTERS)[number]["id"]; children: React.ReactNode; className?: string }) {
  const ch = CHAPTERS.find((c) => c.id === id)!;
  return (
    <section id={id} className={`cx-ch ${className}`} aria-labelledby={`${id}-h`}>
      <Reveal className="cx-ch-head">
        <span className="cx-ch-no" aria-hidden="true">
          CHAPTER {ch.no}
        </span>
        <div id={`${id}-h`}>
          <SectionHead en={ch.en} th={ch.th} />
        </div>
      </Reveal>
      {children}
    </section>
  );
}

/** Framed artwork, optionally linking to the full-size file. */
function Figure({ src, alt, caption, ratio, contain, zoom, label }: { src: string; alt: string; caption?: string; ratio: string; contain?: boolean; zoom?: boolean; label?: string }) {
  const img = (
    <span className="cx-fig-frame" style={css({ "--ratio": ratio })}>
      <Image src={src} alt={alt} fill sizes="(max-width: 900px) 92vw, 50vw" style={{ objectFit: contain ? "contain" : "cover" }} />
      {zoom && (
        <span className="cx-fig-zoom" aria-hidden="true">
          ⤢
        </span>
      )}
    </span>
  );
  return (
    <figure className="cx-fig">
      {label && <Brackets label={label} />}
      {zoom ? (
        <a href={src} target="_blank" rel="noreferrer" aria-label={`${alt} (เปิดภาพเต็ม)`}>
          {img}
        </a>
      ) : (
        img
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

export default function CodexPage() {
  return (
    <>
      <PageBanner
        art="fontaine"
        en="CODEX"
        th="คลังบันทึกแห่งเกาะสีชาด"
        lead="ทุกสิ่งที่ต้องรู้ก่อนก้าวเข้าสู่วังวน — ดินแดน องค์กร รูปบูชาทั้งเจ็ด ปีศาจ และบทบาทของคุณบนเกาะนี้"
      />

      <div className="cx-wrap">
      <div className="cx">
        <aside className="cx-side">
          <CodexNav chapters={CHAPTERS} />
        </aside>

        <main className="cx-main">
          {/* I — PROLOGUE */}
          <Chapter id="prologue">
            <Reveal className="cx-prologue">
              <p className="cx-tagline">สู่แดนแห่งเนื้อสดและเมดผู้หิวโหย</p>
              <p className="cx-lead">{PROLOGUE.welcome}</p>
              <div className="cx-meta">
                <div className="cw">
                  <span className="cw-age">20+</span>
                  <span>CW: gore · disturbing images · violence · religion</span>
                </div>
                <div className="tags">
                  {["#FleshFall_ARG", "#FF_ARG", "#เมดเนื้อ"].map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              </div>
            </Reveal>
            <RevealGroup className="cx-tenets">
              {PROLOGUE.tenets.map((t, n) => (
                <RevealItem key={t.en}>
                  <article className="cx-tenet ff-plate">
                    <span className="cx-tenet-no">0{n + 1}</span>
                    <p className="cx-kicker">{t.en}</p>
                    <h3>{t.th}</h3>
                    <p>{t.body}</p>
                  </article>
                </RevealItem>
              ))}
            </RevealGroup>
            <Reveal>
              <p className="cx-quote">
                <span aria-hidden="true">❝</span>
                {PROLOGUE.ritual}
              </p>
            </Reveal>
          </Chapter>

          {/* II — GEOGRAPHY */}
          <Chapter id="geography">
            <div className="cx-lands">
              {LANDS.map((l, n) => (
                <Reveal key={l.id} from={n % 2 ? "right" : "left"} className={`cx-land ${n % 2 ? "flip" : ""}`}>
                  <Figure src={l.art} alt={l.th} ratio="4 / 3" label={`${l.en} · ${l.tag}`} />
                  <div className="cx-land-copy">
                    <p className="cx-kicker">
                      0{n + 1} · {l.tag}
                    </p>
                    <h3 className="cx-title-en">{l.en}</h3>
                    <p className="cx-title-th">{l.th}</p>
                    <p>{l.body}</p>
                    <ul className="cx-list">
                      {l.notes.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal className="cx-map">
              <Figure src={CODEX_ART.map} alt="แผนที่โดยคร่าวของเกาะสีชาด เกาะไซปรัส และวังวนนอกเกาะ" caption="fig.0 แผนที่โดยคร่าวของเกาะสีชาด เกาะไซปรัส และวังวนนอกเกาะ" ratio="1585 / 1509" contain zoom label="FIG.0 · MAP" />
            </Reveal>
          </Chapter>

          {/* III — FLESH */}
          <Chapter id="flesh">
            <Reveal className="cx-flesh">
              {[FLESH.fresh, FLESH.rotten].map((f, n) => (
                <article key={f.en} className={`cx-flesh-col ${n ? "rot" : "fresh"}`}>
                  <p className="cx-kicker">{f.en}</p>
                  <h3>{f.th}</h3>
                  <p className="cx-flesh-lead">{f.lead}</p>
                  <p>{f.body}</p>
                </article>
              ))}
            </Reveal>
            <Reveal className="cx-moon">
              <span className="cx-moon-disc" aria-hidden="true" />
              <div>
                <p className="cx-kicker">CRIMSON MOON</p>
                <h3>{FLESH.moon.th}</h3>
                <p>{FLESH.moon.body}</p>
              </div>
            </Reveal>
          </Chapter>

          {/* IV — M.A.I.D.S */}
          <Chapter id="maids">
            <Reveal className="cx-maids-emblem">
              <Image src={CODEX_ART.maidsEmblem} alt="M.A.I.D.S — Meat Allocation Identification Distribution Sanctuary" width={1800} height={506} sizes="(max-width: 900px) 92vw, 720px" />
              <p>{MAIDS.full}</p>
            </Reveal>

            <h3 className="cx-sub">ตำนานกำเนิดองค์กรเมดแห่งเกาะ</h3>
            <RevealGroup className="cx-timeline">
              {MAIDS.origin.map((o, n) => (
                <RevealItem key={o.en} className="cx-step">
                  <span className="cx-step-dot" aria-hidden="true">
                    {["I", "II", "III"][n]}
                  </span>
                  <p className="cx-kicker">{o.en}</p>
                  <h4>{o.th}</h4>
                  <p>{o.body}</p>
                </RevealItem>
              ))}
            </RevealGroup>

            <Reveal className="cx-vows">
              <h3 className="cx-sub">คุณสมบัติของผู้รับใช้</h3>
              <p className="cx-muted">ชุดเมดไม่ใช่แฟชั่นเพื่อความสวยงาม แต่คือ “เครื่องแบบของผู้รับใช้” ที่ต้องละทิ้งตัวตน</p>
              <ol>
                {MAIDS.vows.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ol>
            </Reveal>

            <div className="cx-split">
              <Reveal from="left">
                <Figure src={CODEX_ART.priest} alt={MAIDS.priest.name} ratio="1800 / 1504" label="FATHER · DAMIANOS" />
              </Reveal>
              <Reveal from="right" className="cx-split-copy">
                <p className="cx-kicker th">{MAIDS.priest.title}</p>
                <h3 className="cx-title-th big">{MAIDS.priest.name}</h3>
                <p>{MAIDS.priest.body}</p>
              </Reveal>
            </div>
            <RevealGroup className="cx-cards four">
              {MAIDS.priest.rites.map((r) => (
                <RevealItem key={r.th}>
                  <article className="card cx-card">
                    <h4>{r.th}</h4>
                    <p>{r.body}</p>
                  </article>
                </RevealItem>
              ))}
            </RevealGroup>

            <div className="cx-split flip">
              <Reveal from="right">
                <Figure src={CODEX_ART.fontaine} alt={MAIDS.fontaine.name} ratio="1800 / 1440" label="LE FONTAINE DE SANG" />
              </Reveal>
              <Reveal from="left" className="cx-split-copy">
                <p className="cx-kicker">HEADQUARTERS</p>
                <h3 className="cx-title-en">{MAIDS.fontaine.name}</h3>
                <p>{MAIDS.fontaine.body}</p>
                <ul className="cx-list">
                  {MAIDS.fontaine.notes.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <Figure src={CODEX_ART.hall} alt="โถงทางเดินในคฤหาสน์ฟอนแตงเดอซัง" ratio="1634 / 1024" caption="โถงทางเดิน — ประตูหลังร้านทุกบานเชื่อมมาที่นี่" />
              </Reveal>
            </div>

            <h3 className="cx-sub">หน่วยงานหน้าที่เมด</h3>
            <RevealGroup className="cx-grades">
              {MAIDS.grades.map((g) => (
                <RevealItem key={g.g}>
                  <article className="cx-grade">
                    <span className="cx-grade-letter" aria-hidden="true">
                      {g.g}
                    </span>
                    <p className="cx-kicker">GRADE {g.g}</p>
                    <h4>{g.en}</h4>
                    <p className="cx-grade-lead">{g.lead}</p>
                    <ul className="cx-list">
                      {g.duties.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                    <p className="cx-grade-hunt">
                      <b>ภารกิจล่า</b> {g.hunt}
                    </p>
                  </article>
                </RevealItem>
              ))}
            </RevealGroup>
          </Chapter>

          {/* V — THE ICONS */}
          <Chapter id="icons">
            <Reveal>
              <p className="cx-lead">{ICONS_INTRO}</p>
            </Reveal>
            <div className="cx-icons">
              {ICONS.map((ic, n) => (
                <Reveal key={ic.id} className={`cx-icon ${n % 2 ? "flip" : ""}`} from="fade">
                  <article style={css({ "--door": doorVar(ic.door) })} id={`icon-${ic.id}`}>
                    <div className="cx-icon-art">
                      <Image src={ic.art} alt={`${ic.name} — ${ic.title}`} fill sizes="(max-width: 900px) 92vw, 44vw" />
                      <span className="cx-icon-shade" aria-hidden="true" />
                      <p className="cx-icon-name" aria-hidden="true">
                        <span>{ic.of}</span>
                        <b>{ic.name}</b>
                      </p>
                    </div>
                    <div className="cx-icon-band" aria-hidden="true">
                      <span>THE ICONS</span>
                      <Image src={`/codex/sigil-${ic.id}.webp`} alt="" width={64} height={64} className="cx-sigil" />
                    </div>
                    <div className="cx-icon-copy">
                      <p className="cx-kicker th">
                        {ic.doorTh} · {ic.realm}
                      </p>
                      <h3>
                        {ic.name} <small>{ic.title}</small>
                      </h3>
                      <p className="cx-concept">“{ic.concept}”</p>
                      <dl className="cx-dl">
                        <div>
                          <dt>พร</dt>
                          <dd>{ic.blessing}</dd>
                        </div>
                        <div>
                          <dt>ผลกรรม</dt>
                          <dd>{ic.curse}</dd>
                        </div>
                        <div>
                          <dt>สาวก</dt>
                          <dd>{ic.followers}</dd>
                        </div>
                        <div>
                          <dt>ดันเจียน</dt>
                          <dd>{ic.dungeon}</dd>
                        </div>
                      </dl>
                      {ic.note && <p className="cx-note">{ic.note}</p>}
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
            <RevealGroup className="cx-cards two">
              {ICON_RULES.map((r) => (
                <RevealItem key={r.th}>
                  <article className="card cx-card">
                    <h4>{r.th}</h4>
                    <p>{r.body}</p>
                  </article>
                </RevealItem>
              ))}
            </RevealGroup>
          </Chapter>

          {/* VI — DOORS */}
          <Chapter id="doors">
            <Reveal>
              <p className="cx-lead">{DOORS.lead}</p>
            </Reveal>
            <RevealGroup className="cx-doors">
              {ICONS.map((ic) => (
                <RevealItem key={ic.id}>
                  <a className="cx-door" href={`#icon-${ic.id}`} style={css({ "--door": doorVar(ic.door) })}>
                    <span className="cx-door-leaf" aria-hidden="true" />
                    <b>{ic.doorTh}</b>
                    <small>{ic.name}</small>
                  </a>
                </RevealItem>
              ))}
            </RevealGroup>
            <RevealGroup className="cx-cards three">
              {DOORS.special.map((d) => (
                <RevealItem key={d.th}>
                  <article className="card cx-card cx-door-card" style={css({ "--door": doorVar(d.door) })}>
                    <h4>{d.th}</h4>
                    <p>{d.body}</p>
                  </article>
                </RevealItem>
              ))}
            </RevealGroup>
            <Reveal>
              <p className="cx-quote">
                <span aria-hidden="true">❝</span>
                {DOORS.rule}
                <cite>— {DOORS.source}</cite>
              </p>
            </Reveal>
          </Chapter>

          {/* VII — FIENDS */}
          <Chapter id="fiends">
            <Reveal>
              <p className="cx-lead">{FIENDS.lead}</p>
            </Reveal>
            <RevealGroup className="cx-cards three">
              {FIENDS.causes.map((f, n) => (
                <RevealItem key={f.th}>
                  <article className="card cx-card">
                    <span className="cx-card-no">0{n + 1}</span>
                    <h4>{f.th}</h4>
                    <p>{f.body}</p>
                  </article>
                </RevealItem>
              ))}
            </RevealGroup>
            <Reveal>
              <p className="cx-muted cx-block">{FIENDS.forms}</p>
            </Reveal>
            <Reveal className="cx-metal">
              <p className="cx-kicker">{FIENDS.metal.en}</p>
              <h3>{FIENDS.metal.th}</h3>
              <ol>
                {FIENDS.metal.items.map((m) => (
                  <li key={m.th}>
                    <b>{m.th}</b>
                    <span>{m.body}</span>
                  </li>
                ))}
              </ol>
            </Reveal>
          </Chapter>

          {/* VIII — ABYSMARINE */}
          <Chapter id="abyss">
            <div className="cx-split">
              <Reveal from="left">
                <Figure src={CODEX_ART.rougeSea} alt="เกาะสีชาดกลางทะเลทมิฬ" ratio="1800 / 1241" label="L'ABYSMARIN" />
              </Reveal>
              <Reveal from="right" className="cx-split-copy">
                <p className="cx-kicker">L’ABYSMARIN</p>
                <h3 className="cx-title-en">Abysmarine</h3>
                <p>{ABYSS.lead}</p>
              </Reveal>
            </div>
            <RevealGroup className="cx-cards three">
              {ABYSS.facts.map((f) => (
                <RevealItem key={f.th}>
                  <article className="card cx-card">
                    <h4>{f.th}</h4>
                    <p>{f.body}</p>
                  </article>
                </RevealItem>
              ))}
            </RevealGroup>
            <Reveal className="cx-salt">
              <span className="cx-salt-crystal" aria-hidden="true" />
              <div>
                <p className="cx-kicker">{ABYSS.salt.en}</p>
                <h3>{ABYSS.salt.th}</h3>
                <p>{ABYSS.salt.body}</p>
              </div>
            </Reveal>
          </Chapter>

          {/* IX — CHARACTERS */}
          <Chapter id="characters">
            <Reveal>
              <p className="cx-lead">เลือกบทบาทที่คุณอยากวาด แล้วมาเติมชีวิตให้โลกใบนี้!</p>
            </Reveal>
            <div className="cx-roles">
              {ROLES.map((r, n) => (
                <Reveal key={r.id} className="cx-role" from="fade">
                  <article id={`role-${r.id}`}>
                    <div className="cx-role-head">
                      <span className="cx-role-no">{String(n + 1).padStart(2, "0")}</span>
                      <div>
                        <h3 className="cx-title-en">{r.en}</h3>
                        <p className="cx-title-th">{r.th}</p>
                      </div>
                      {r.emblem && <Image src={r.emblem} alt="" width={120} height={120} className="cx-role-emblem" />}
                    </div>
                    <div className="cx-role-body">
                      <div className="cx-role-art">
                        <span className="cs-corner tl" />
                        <span className="cs-corner br" />
                        {r.art ? (
                          <Image src={r.art} alt={r.th} fill sizes="(max-width: 900px) 70vw, 28vw" />
                        ) : (
                          <span className="cs-norecord">
                            <b>No Record</b>
                            <small>ยังไม่มีภาพบันทึก</small>
                          </span>
                        )}
                      </div>
                      <div className="cx-role-copy">
                        <p>{r.body}</p>
                        {r.points && (
                          <ul className="cx-list">
                            {r.points.map((x) => (
                              <li key={x}>{x}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                    {r.sheets && (
                      <div className={`cx-sheets n${r.sheets.length}`}>
                        {r.sheets.map((s) => (
                          <Figure key={s.src} src={s.src} alt={s.caption} caption={s.caption} ratio="4 / 3" contain zoom />
                        ))}
                      </div>
                    )}
                  </article>
                </Reveal>
              ))}
            </div>

            <Reveal className="cx-creation">
              <h3 className="cx-sub">แนวทางการวาด & การสร้างตัวละคร</h3>
              <p className="cx-tone">
                {CREATION.tone.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </p>
              <p className="cx-muted">{CREATION.rule}</p>
              <dl className="cx-dl">
                {CREATION.appendix.map((a) => (
                  <div key={a.th}>
                    <dt>{a.th}</dt>
                    <dd>{a.body}</dd>
                  </div>
                ))}
              </dl>
              <Link className="cta" href="/create">
                ✦ สร้างตัวละคร
              </Link>
            </Reveal>
          </Chapter>

          {/* X — TAG RULES */}
          <Chapter id="rules">
            <Reveal>
              <ol className="cx-rules">
                {TAG_RULES.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ol>
            </Reveal>
          </Chapter>

          {/* XI — CREDITS */}
          <Chapter id="credits" className="cx-credits">
            <div className="cx-fin">
              <Reveal className="cx-thanks">
                {THANKS.map((t) => (
                  <p key={t.name}>
                    <b>{t.name}</b>
                    <i aria-hidden="true" />
                    <span>{t.role}</span>
                  </p>
                ))}
                <p className="cx-etal">Et al. (2026)</p>
              </Reveal>
              <Reveal from="right" className="cx-fin-art">
                <Image src={CODEX_ART.maidPeek} alt="" width={603} height={1538} sizes="(max-width: 900px) 50vw, 240px" />
                <p className="cx-fin-word">Fin…?</p>
              </Reveal>
            </div>
          </Chapter>
        </main>
      </div>
      </div>
    </>
  );
}
