import type { Metadata } from "next";
import Image from "next/image";
import { PageBanner } from "@/components/PageBanner";
import { ART } from "@/lib/art";
import { GAME } from "@/lib/game";
import { SectionHead } from "@/components/SectionHead";
import { doorVar } from "@/lib/md";
import { Backdrop, Brackets } from "@/components/Dossier";

export const metadata: Metadata = { title: "สร้างตัวละคร" };

const DESIGN = [
  {
    title: "เมด / นักแล่เนื้อ",
    body: "เครื่องแบบสวยเนี้ยบเพื่อซ่อนร่างที่บิดเบี้ยว ใส่ผ้ากันเปื้อนเลอะเลือด หรือสัญลักษณ์ของเทพที่ศรัทธาเป็นเข็มกลัด/เครื่องประดับได้",
  },
  {
    title: "สุนัขล่าเนื้อ",
    body: "อาวุธแสวงเครื่องจากกระดูกและเนื้อ หรือของวินเทจจากโลกจริง — ปรัชญาการออกแบบคือ “ใครสักคน กับอาวุธสักอย่าง” แค่นั้นแหละ",
  },
  {
    title: "พนักงานบาร์ / เจ้าของบาร์",
    body: "ผู้รักษาเขตปลอดภัย เจ้าของบาร์มี “สภาวะไม่แน่นอน” — Closing Shift หมดสติชั่วคราวช่วงเวลาเดิม ๆ ของวัน",
  },
  {
    title: "ผู้หลงมิติ",
    body: "หลงมาจากโลกจริง พกของจากโลกจริงติดตัว — ไฟแช็ก มือถือไร้สัญญาณ รูปถ่าย — และค่อย ๆ เสียความเป็นมนุษย์ระหว่างทาง",
  },
];

export default function CreatePage() {
  return (
    <>
      <PageBanner art="maid" en="CREATE" th="สร้างตัวละคร" lead="แนวทางสร้างตัวละครของคุณในโลก FleshFall" />
      <main>
        <section className="block page-body create">
          {/* STEP 1 — roles */}
          <section className="step">
            <header>
              <span className="step-no">01</span>
              <div>
                <h3>เลือกบทบาท</h3>
                <p className="sub">แต่ละบทบาทมีที่มาและวิธีเอาชีวิตรอดต่างกัน</p>
              </div>
            </header>
            <div className="guide-grid">
              {GAME.roles.filter((r) => r.id !== "survivor").map((r) => (
                <article key={r.id} className="guide-card">
                  <h4>
                    {r.emoji} {r.name}
                  </h4>
                  <p className="sub">{r.short}</p>
                </article>
              ))}
            </div>
          </section>

          {/* STEP 2 — icons */}
          <section className="step">
            <header>
              <span className="step-no">02</span>
              <div>
                <h3>เลือกเทพที่ศรัทธา</h3>
                <p className="sub">เทพที่คุณศรัทธาจะติดตัวไปตลอด — เลือกให้ดี</p>
              </div>
            </header>
            <div className="guide-grid">
              {GAME.icons.map((ic) => (
                <article key={ic.id} className="guide-card icon" style={{ "--door": doorVar(ic.door) } as React.CSSProperties}>
                  <h4>
                    {ic.emoji} {ic.name}
                  </h4>
                  <p className="sub">{ic.doorName}</p>
                  <p className="icons-concept">{ic.concept}</p>
                </article>
              ))}
            </div>
          </section>

          {/* STEP 3 — start in Discord */}
          <section className="step">
            <header>
              <span className="step-no">03</span>
              <div>
                <h3>สร้างตัวละครใน Discord</h3>
                <p className="sub">พิมพ์คำสั่งในเซิร์ฟ FleshFall แล้วเลือกบทบาทกับเทพ</p>
              </div>
            </header>
            <div className="cmd">
              <code>/start name:ชื่อตัวละคร role:บทบาท icon:เทพ</code>
            </div>
            <ol className="flow">
              <li>
                ไปที่ห้อง <b>#butchery</b> กด 📜 โปรไฟล์ เพื่อดูตัวละคร
              </li>
              <li>
                กด <b>🗺️ ออกสำรวจ</b> เลือกทวีปและเมือง — เมืองระดับ 🟢 Easy เหมาะกับมือใหม่
              </li>
              <li>ในห้องเมือง กด 🎲 ออกล่า หรือ 🔍 สำรวจ โชคดีอาจเจอประตูดันเจียน</li>
              <li>
                เนื้อหมด แรงหมด กด <b>🏠 กลับ Rouge Land</b> เพื่อซื้อของ ปรุงอาหาร และอัปเกรดที่บาร์
              </li>
            </ol>
          </section>
        </section>

        <section className="block design ff-host">
          <Backdrop word="DESIGN" band />
          <div className="design-copy">
            <SectionHead en="DESIGN" th="แนวทางออกแบบตัวละคร" />
            <p className="lead">วาดตัวละครของคุณเองได้ — ทุกชุดไม่จำกัดเพศ ✅</p>
            <div className="design-grid">
              {DESIGN.map((d) => (
                <article key={d.title} className="card">
                  <h3>{d.title}</h3>
                  <p>{d.body}</p>
                </article>
              ))}
            </div>
            <div className="cw" style={{ marginTop: 20 }}>
              <span className="cw-age">20+</span>
              <span>แท็กผลงาน: #FleshFall_ARG #FF_ARG #เมดเนื้อ · CW: gore, violence</span>
            </div>
          </div>
          <div className="design-art" aria-hidden="true">
            <Brackets label="M.A.I.D.S · DESIGN GUIDE" />
            <Image src={ART.cleaver.src} alt="" fill sizes="(max-width: 900px) 80vw, 34vw" style={{ objectFit: "contain", objectPosition: "50% 100%" }} />
          </div>
        </section>
      </main>
    </>
  );
}
