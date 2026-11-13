import Image from "next/image";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";
import { SectionHead } from "@/components/SectionHead";
import { Backdrop, Brackets } from "@/components/Dossier";
import { ART } from "@/lib/art";

/** LORE as a "dossier": backdrop wordmark + blood band, rules as plates, bracketed cut-out. */
const RULES = [
  { en: "EQUIVALENT EXCHANGE", th: "การแลกเปลี่ยนที่เท่าเทียม", body: "จะได้เนื้อมา ต้องแลกด้วยคำสัญญา แรงงาน และอวัยวะ" },
  { en: "DIVINE COVENANT", th: "พันธสัญญาแห่งเทพ", body: "รับพร (Buff) จากเทพได้ แต่ต้องแลกด้วยผลข้างเคียงที่กัดกินความเป็นมนุษย์" },
  { en: "MIASMA", th: "เนื้อเน่า → Miasma", body: "ต้นตอของกระแสลมประหลาด ทำให้หลอนและแปรสภาพ ใช้เป็นอาวุธชีวภาพได้ วังวนรอบเกาะเต็มไปด้วยมัน" },
];

export function LoreDossier() {
  return (
    <section className="dossier ff-host">
      <Backdrop word="FLESH" band />

      <Reveal from="left" className="dz-copy">
        <SectionHead en="LORE" th="เนื้อคือทุกสิ่ง" />
        <p className="dz-lead">
          หลังเกาะถูกแยกออกจากกัน <b>เนื้อสด</b> คือทรัพยากรที่มีค่าที่สุดและเป็นแหล่งพลังงานเพียงหนึ่งเดียว — ทั้งอาหาร พลัง อำนาจ และเงินตรา —
          ถูกกุมไว้โดยสาวรับใช้ของร้านเนื้อ <b>เมดผู้หิวโหย</b>
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
