import type { Metadata } from "next";
import Image from "next/image";
import { CreateGuide } from "@/components/CreateGuide";
import { PageBanner } from "@/components/PageBanner";
import { ART } from "@/lib/art";

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
    title: "ผู้หลงมิติ / ผู้รอดจาก Meat Land",
    body: "ผู้หลงมิติพกของจากโลกจริงติดตัว ผู้รอดมีร่องรอย “งอก” หรือ “ผุพัง” เช่นแขนเนื้อกึ่งพืช หรือดวงตาที่มองเห็นความกลัว",
  },
];

export default function CreatePage() {
  return (
    <>
      <PageBanner art="maid" en="CREATE" th="สร้างตัวละคร" lead="เลือกบทบาท เลือกเทพ ตั้งชื่อ — แล้วเริ่มเล่นใน Discord" />
      <main>
        <section className="block page-body">
          <CreateGuide />
        </section>

        <section className="block design">
          <div className="design-copy">
            <p className="sec-en">CHARACTER DESIGN</p>
            <h2>แนวทางออกแบบตัวละคร</h2>
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
              <span className="cw-age">18+</span>
              <span>แท็กผลงาน: #FleshFall_ARG #FF_ARG #เมดเนื้อ · CW: gore, violence</span>
            </div>
          </div>
          <div className="design-art" aria-hidden="true">
            <Image src={ART.cleaver.src} alt="" fill sizes="(max-width: 900px) 80vw, 34vw" style={{ objectFit: "contain", objectPosition: "50% 100%" }} />
          </div>
        </section>
      </main>
    </>
  );
}
