import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { HeroCarousel } from "@/components/HeroCarousel";
import { CharacterSelect } from "@/components/CharacterSelect";
import { IconGallery } from "@/components/IconGallery";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";
import { ART } from "@/lib/art";
import { SectionHead } from "@/components/SectionHead";
import { Staff } from "@/components/Staff";
import { LoreDossier } from "@/components/LoreDossier";
import { Brackets } from "@/components/Dossier";
import { backgroundSlides } from "@/lib/backgrounds";

const LANDS = [
  {
    en: "CYPRESS ISLE",
    th: "เกาะไซปรัส",
    tag: "Mainland",
    body: "อารยธรรมที่บิดเบี้ยวและพึ่งพิงเลือดเนื้อ ดูคล้ายโลกมนุษย์ แต่เต็มไปด้วยของวินเทจยุค 19XX ซากสถาปัตยกรรมกรีก และประตูสีดำนับหมื่นบาน",
  },
  {
    en: "OLD REALM",
    th: "วังวนรอบนอกเกาะ",
    tag: "Subspace",
    body: "เทียมโลกมนุษย์ที่บิดเบี้ยว สุดขอบฟ้ามีทวีปรูปร่างเหมือนโลกจริง สิ่งมีชีวิตเหลือเพียงเงาดำจาง ๆ บางแห่งมีดันเจียนลึกลงไปในหุบเหว",
  },
  {
    en: "MEAT LAND",
    th: "เกาะเนื้อ · Rouge Land",
    tag: "The Progenitor",
    body: "ดินแดนที่เต็มไปด้วยเนื้อสด กระดูกสังขาร อวัยวะที่งอกเงย — คือร่างของ “ผู้ให้กำเนิด” ที่ยังคงเต้นระรัวอยู่",
  },
];

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <>
      <HeroCarousel slides={backgroundSlides()} />

      {/* INTRO + CW */}
      <section className="intro">
        <Reveal>
        <SectionHead en="WELCOME" th="สู่แดนแห่งเนื้อสดและเมดผู้หิวโหย" center />
        <p className="intro-lead">
          ยินดีต้อนรับสู่ดินแดนที่ความหิวโหยเข่นฆ่าคือความโสภา พวกสัตว์เศษเดนศรัทธาความต่ำช้า และอวัยวะคือทรัพยากร
          ผู้เล่นต้องเอาชีวิตรอดในโลกวังวนสุดวิปลาส
        </p>
        <div className="cw">
          <span className="cw-age">20+</span>
          <span>CW: gore · disturbing images · violence · religion</span>
        </div>
        <div className="tags">
          {["#FleshFall_ARG", "#FF_ARG", "#เมดเนื้อ"].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        </Reveal>
      </section>

      {/* LORE — dossier layout */}
      <LoreDossier />

      {/* BACKSTORY: vintage subspace */}
      <section className="story">
        <Reveal from="left" className="story-art">
          <Brackets label="ARCHIVE · 19XX · SUBSPACE" />
          <Image src={ART.gramophone.src} alt={ART.gramophone.alt} unoptimized fill sizes="(max-width: 900px) 100vw, 55vw" style={{ objectPosition: ART.gramophone.pos }} />
        </Reveal>
        <Reveal from="right" delay={0.1} className="story-copy">
          <SectionHead en="BACKSTORY" th="ดินแดนที่ไร้พระเจ้า" />
          <p>
            ไม่มีอิทธิพลของพระเจ้า ไม่มีการไถ่บาป มีเพียง <b>“กลไกของจักรวาล”</b> ที่ขับเคลื่อนทุกสิ่ง
          </p>
          <p>
            ผู้คนบนเกาะบางส่วนเคยเป็นมนุษย์ที่หลงเข้ามาใน subspace นี้เมื่อหลายร้อยปีก่อน ข้าวของและแฟชั่นบนเกาะจึงเป็นของวินเทจจากร้อยสองร้อยปีที่ผ่านมา
          </p>
          <p>การจะเข้ามาได้ ต้องผ่านพิธีกรรมสื่อสารกับเทพบรรพกาล ผ่านตราสื่อสารของเทพแต่ละองค์</p>
        </Reveal>
      </section>

      {/* GEOGRAPHY — hidden for now
      <section className="lands">
        <SectionHead en="GEOGRAPHY" th="สามดินแดน" center />
        <RevealGroup className="lands-grid">
          {LANDS.map((l, n) => (
            <RevealItem key={l.en}>
            <article className="land">
              <span className="land-no">0{n + 1}</span>
              <p className="land-en">{l.en}</p>
              <h3>{l.th}</h3>
              <span className="chip">{l.tag}</span>
              <p>{l.body}</p>
            </article>
            </RevealItem>
          ))}
        </RevealGroup>
        <div className="center">
          <Link className="cta ghost" href="/world">
            ดูแผนที่ Old Realm 50 เมือง →
          </Link>
        </div>
      </section>
      */}

      {/* ICONS */}
      <section className="icons-hero" id="icons">
        <div className="icons-hero-bg" aria-hidden="true">
          <Image src="/icons/lineup.webp" alt="" fill sizes="100vw" />
        </div>
        <Reveal className="head">
          <div>
            <SectionHead en="THE ICONS" th="รูปเคารพทั้งเจ็ด" />
            <p className="lead" style={{ margin: "12px 0 0" }}>มีเพียงเจ็ดเท่านั้น สิ่งอื่นนอกจากนี้คือนอกรีต — พรทุกอย่างมีผลกรรม</p>
          </div>
        </Reveal>
        <IconGallery />
      </section>

      {/* CHARACTERS */}
      <CharacterSelect />

      {/* FINAL CTA */}
      <section className="final">
        <Image src={ART.kv.src} alt="" fill sizes="100vw" style={{ objectPosition: ART.kv.pos }} className="final-img" />
        <div className="final-shade" aria-hidden="true" />
        <Reveal className="final-copy">
          <SectionHead en="JOIN" th="สร้างตัวละครของคุณ" center />
          <p>เลือกบทบาท เลือกเทพที่จะศรัทธา แล้วก้าวเข้าสู่วังวน</p>
          <Link className="cta" href="/create">
            ✦ สร้างตัวละคร
          </Link>
        </Reveal>
      </section>

      {/* STAFF */}
      <Staff />
    </>
  );
}
