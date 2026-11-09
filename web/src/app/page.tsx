import Image from "next/image";
import Link from "next/link";
import { HeroCarousel } from "@/components/HeroCarousel";
import { IconGallery } from "@/components/IconGallery";
import { ART } from "@/lib/art";
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

const ROLES = [
  { name: "เมด / นักแล่เนื้อ", en: "The Maids / Butchers", body: "ผู้รับใช้ที่ละทิ้งตัวตนเพื่อจัดสรรและชำแหละเนื้อ เครื่องแบบเนี้ยบซ่อนร่างที่บิดเบี้ยว" },
  { name: "สุนัขล่าเนื้อ", en: "The Hounds", body: "นักล่าผู้บ้าคลั่ง แลกความเป็นมนุษย์กับพลัง ออกล่าเนื้อในวังวนนอกเกาะ มักคู่กับเหล่าเมด" },
  { name: "พนักงานบาร์", en: "The Bar Staff", body: "ผู้รักษาเขตปลอดภัย ปรุงเนื้อเพื่อลดผลข้างเคียงของคำสาป — บางคนมีอาการ Closing Shift" },
  { name: "ลูกค้า / ปีศาจ", en: "The Patrons / Fiends", body: "อดีตมนุษย์ที่กลายเป็นก้อนเนื้อมีสติปัญญา ยังปรารถนาจะลิ้มรสเนื้อ ลูกค้าหลักของบาร์" },
  { name: "ผู้หลงมิติ", en: "The Outsider", body: "หลงจากโลกจริงเข้ามาเหมือนติด backroom ตามหาทางออกที่ไม่มีจริง การเดินทางผูกกับเทพบรรพกาลโดยตรง" },
  { name: "ผู้รอดจาก Meat Land", en: "The Meat Land Survivor", body: "เศษเดนที่หนีออกจากเกาะเนื้อได้ ร่างมีร่องรอยงอกหรือผุพัง รู้จักสัตว์ประหลาดดีกว่าใคร มักเป็นไกด์" },
];

export default function Home() {
  return (
    <>
      <HeroCarousel slides={backgroundSlides()} />

      {/* INTRO + CW */}
      <section className="intro">
        <p className="sec-en center">WELCOME</p>
        <h2>สู่แดนแห่งเนื้อสดและเมดผู้หิวโหย</h2>
        <p className="intro-lead">
          ยินดีต้อนรับสู่ดินแดนที่ความหิวโหยเข่นฆ่าคือความโสภา พวกสัตว์เศษเดนศรัทธาความต่ำช้า และอวัยวะคือทรัพยากร
          ผู้เล่นต้องเอาชีวิตรอดในโลกวังวนสุดวิปลาส
        </p>
        <div className="cw">
          <span className="cw-age">18+</span>
          <span>CW: gore · disturbing images · violence · religion</span>
        </div>
        <div className="tags">
          {["#FleshFall_ARG", "#FF_ARG", "#เมดเนื้อ"].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </section>

      {/* LORE: rules of the world, with the cleaver maid cut-out */}
      <section className="lore">
        <div className="lore-copy">
          <p className="sec-en">LORE &amp; WORLD SETTING</p>
          <h2>เนื้อคือทุกสิ่ง</h2>
          <p>
            หลังเกาะถูกแยกออกจากกัน <b>เนื้อสด</b> คือทรัพยากรที่มีค่าที่สุดและเป็นแหล่งพลังงานเพียงหนึ่งเดียว — ทั้งอาหาร พลัง อำนาจ และเงินตรา —
            ถูกกุมไว้โดยสาวรับใช้ของร้านเนื้อ <b>เมดผู้หิวโหย</b>
          </p>
          <ul className="rules">
            <li>
              <b>การแลกเปลี่ยนที่เท่าเทียม</b>
              <span>จะได้เนื้อมา ต้องแลกด้วยคำสัญญา แรงงาน และอวัยวะ</span>
            </li>
            <li>
              <b>พันธสัญญาแห่งเทพ</b>
              <span>รับพร (Buff) จากเทพได้ แต่ต้องแลกด้วยผลข้างเคียงที่กัดกินความเป็นมนุษย์</span>
            </li>
            <li>
              <b>เนื้อเน่า → Miasma</b>
              <span>ต้นตอของกระแสลมประหลาด ทำให้หลอนและแปรสภาพ ใช้เป็นอาวุธชีวภาพได้ วังวนรอบเกาะเต็มไปด้วยมัน</span>
            </li>
          </ul>
        </div>
        <div className="lore-art" aria-hidden="true">
          <Image src={ART.cleaver.src} alt="" fill sizes="(max-width: 900px) 90vw, 40vw" style={{ objectFit: "contain", objectPosition: "50% 100%" }} />
        </div>
      </section>

      {/* BACKSTORY: vintage subspace */}
      <section className="story">
        <div className="story-art">
          <Image src={ART.gramophone.src} alt={ART.gramophone.alt} fill sizes="(max-width: 900px) 100vw, 55vw" style={{ objectPosition: ART.gramophone.pos }} />
        </div>
        <div className="story-copy">
          <p className="sec-en">BACKSTORY</p>
          <h2>ดินแดนที่ไร้พระเจ้า</h2>
          <p>
            ไม่มีอิทธิพลของพระเจ้า ไม่มีการไถ่บาป มีเพียง <b>“กลไกของจักรวาล”</b> ที่ขับเคลื่อนทุกสิ่ง
          </p>
          <p>
            ผู้คนบนเกาะบางส่วนเคยเป็นมนุษย์ที่หลงเข้ามาใน subspace นี้เมื่อหลายร้อยปีก่อน ข้าวของและแฟชั่นบนเกาะจึงเป็นของวินเทจจากร้อยสองร้อยปีที่ผ่านมา
          </p>
          <p>การจะเข้ามาได้ ต้องผ่านพิธีกรรมสื่อสารกับเทพบรรพกาล ผ่านตราสื่อสารของเทพแต่ละองค์</p>
        </div>
      </section>

      {/* GEOGRAPHY */}
      <section className="lands">
        <p className="sec-en center">GEOGRAPHY</p>
        <h2 className="center">สามดินแดน</h2>
        <div className="lands-grid">
          {LANDS.map((l, n) => (
            <article key={l.en} className="land">
              <span className="land-no">0{n + 1}</span>
              <p className="land-en">{l.en}</p>
              <h3>{l.th}</h3>
              <span className="chip">{l.tag}</span>
              <p>{l.body}</p>
            </article>
          ))}
        </div>
        <div className="center">
          <Link className="cta ghost" href="/world">
            ดูแผนที่ Old Realm 50 เมือง →
          </Link>
        </div>
      </section>

      {/* ICONS */}
      <section className="icons-hero" id="icons">
        <div className="icons-hero-bg" aria-hidden="true">
          <Image src="/icons/lineup.webp" alt="" fill sizes="100vw" />
        </div>
        <div className="head">
          <div>
            <p className="sec-en">THE ICONS</p>
            <h2>รูปเคารพทั้งเจ็ด</h2>
            <p className="lead" style={{ margin: "12px 0 0" }}>มีเพียงเจ็ดเท่านั้น สิ่งอื่นนอกจากนี้คือนอกรีต — พรทุกอย่างมีผลกรรม</p>
          </div>
          <p className="big-en" aria-hidden="true">ICONS</p>
        </div>
        <IconGallery />
      </section>

      {/* CHARACTERS */}
      <section className="feature">
        <Image src={ART.maid.src} alt={ART.maid.alt} fill sizes="100vw" style={{ objectPosition: ART.maid.pos }} className="feature-img" />
        <div className="feature-shade" aria-hidden="true" />
        <div className="feature-copy">
          <p className="sec-en">CHARACTERS</p>
          <h2>คุณจะเป็นใครบนเกาะนี้</h2>
          <p>เมด นักล่า พนักงานบาร์ ปีศาจ หรือผู้หลงมิติ — ทุกบทบาทมีวิธีเอาชีวิตรอดและราคาที่ต้องจ่ายต่างกัน</p>
          <p className="feature-quote">“ต้องการอะไรคะ”</p>
        </div>
      </section>

      <section className="roles-sec">
        <div className="roles-grid">
          {ROLES.map((r) => (
            <article key={r.en} className="role-card">
              <p className="role-en">{r.en}</p>
              <h3>{r.name}</h3>
              <p>{r.body}</p>
            </article>
          ))}
        </div>
        <div className="roles-art">
          <figure>
            <Image src={ART.cookbook.src} alt={ART.cookbook.alt} fill sizes="(max-width: 900px) 50vw, 25vw" style={{ objectPosition: ART.cookbook.pos }} />
            <figcaption>The Bar Staff</figcaption>
          </figure>
          <figure>
            <Image src={ART.hound.src} alt={ART.hound.alt} fill sizes="(max-width: 900px) 50vw, 25vw" style={{ objectPosition: ART.hound.pos }} />
            <figcaption>The Hounds</figcaption>
          </figure>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final">
        <Image src={ART.kv.src} alt="" fill sizes="100vw" style={{ objectPosition: ART.kv.pos }} className="final-img" />
        <div className="final-shade" aria-hidden="true" />
        <div className="final-copy">
          <p className="sec-en center">JOIN</p>
          <h2>สร้างตัวละครของคุณ</h2>
          <p>เลือกบทบาท เลือกเทพที่จะศรัทธา แล้วก้าวเข้าสู่วังวน</p>
          <Link className="cta" href="/create">
            ✦ สร้างตัวละคร
          </Link>
        </div>
      </section>
    </>
  );
}
