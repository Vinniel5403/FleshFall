import Image from "next/image";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";
import { SectionHead } from "@/components/SectionHead";
import { Backdrop, Brackets } from "@/components/Dossier";
import { ART } from "@/lib/art";

/** LORE as a "dossier": backdrop wordmark + blood band, rules as plates, bracketed cut-out. */
const RULES = [
  { en: "EQUIVALENT EXCHANGE", th: "การแลกเปลี่ยนที่เท่าเทียม", body: "การจะได้เนื้อสดมาต้องแลกด้วยคำสัญญา แรงงาน และเลือดเนื้อ" },
  {
    en: "COVENANT OF ICONS",
    th: "พันธสัญญาแห่งรูปเคารพ",
    body: "มนุษย์สามารถรับพร (Buff) จากรูปบูชา (Icons) ได้ แต่ต้องแลกด้วยผลข้างเคียงจากกระแสแห่งกรรม (debuff) ที่ทำให้เสียความเป็นมนุษย์ แปรสภาพเป็นเดนเนื้อ (flesh remnants)",
  },
  {
    en: "MIASMA",
    th: "เนื้อเน่า → Miasma",
    body: "เป็นสิ่งที่ทำให้เกิดอาการหลอนและการแปรสภาพ เป็นสิ่งที่ผู้อยู่อาศัยหวาดผวา ทั้งไร้ค่าและอันตราย ถูกใช้เป็นอาวุธชีวภาพได้ — ในวังวนรอบเกาะจะเต็มไปด้วยเนื้อเน่า อีกทั้งเป็นสัญญาณว่ารูปบูชาแห่งความเสื่อมสลายคืบคลานอยู่ไม่ไกล นักล่าเนื้อส่วนใหญ่ต้องหลีกเลี่ยง",
  },
];

export function LoreDossier() {
  return (
    <section className="dossier ff-host">
      <Backdrop word="FLESH" band />

      <Reveal from="left" className="dz-copy">
        <SectionHead en="LORE" th="เนื้อสดคือทุกสิ่งที่โสภา" />
        <p className="dz-lead">
          เกาะสีชาดที่ถูกแยกออกจากโลกเก่าโดยสมบูรณ์ <b>เนื้อสด</b> ที่เป็นทรัพยากรที่ล้ำค่าที่สุดและเป็นแหล่งพลังงานเพียงหนึ่งเดียว
          ถูกกุมไว้โดย <b>สาวรับใช้ผู้ทรงสิทธิ์</b> ขององค์กรแจกจ่ายเนื้อสด
        </p>

        <RevealGroup className="dz-rules">
          {RULES.map((r) => (
            <RevealItem key={r.en}>
              <article className="dz-rule">
                <div className="ff-plate">
                  <h3>{r.th}</h3>
                  <p>{r.body}</p>
                </div>
              </article>
            </RevealItem>
          ))}
        </RevealGroup>
      </Reveal>

      <Reveal from="right" delay={0.15} className="dz-art" aria-hidden="true">
        <Brackets label="M.A.I.D.S · FILE 07 · BLANC" />
        <Image src={ART.blanc.src} alt="" fill sizes="(max-width: 900px) 90vw, 40vw" unoptimized style={{ objectFit: "contain", objectPosition: "50% 100%" }} />
      </Reveal>
    </section>
  );
}
