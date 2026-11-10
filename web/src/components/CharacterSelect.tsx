"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { ART, type Art } from "@/lib/art";
import { SectionHead } from "./SectionHead";

interface RoleCard {
  id: string;
  en: string;
  th: string;
  epithet: string;
  desc: string;
  /** cutout = transparent art that rises out of the frame; framed = art fills the frame */
  art?: Art & { kind: "cutout" | "framed" };
}

const ROLES: RoleCard[] = [
  {
    id: "maid",
    en: "Maid",
    th: "เมด / นักแล่เนื้อ",
    epithet: "ผู้กุมเนื้อสด",
    desc: "ผู้รับใช้ที่ละทิ้งตัวตนเพื่อจัดสรรและชำแหละเนื้อ เครื่องแบบสวยเนี้ยบเพื่อซ่อนร่างกายที่บิดเบี้ยว ผู้กุมเนื้อสด — ทรัพยากรที่มีค่าที่สุดบนเกาะ",
    art: { ...ART.cleaver, kind: "cutout" },
  },
  {
    id: "hound",
    en: "Hound",
    th: "สุนัขล่าเนื้อ",
    epithet: "นักล่าผู้บ้าคลั่ง",
    desc: "นักล่าที่ยอมแลกความเป็นมนุษย์กับพลัง ออกล่าเนื้อในวังวนนอกเกาะ อาวุธแสวงเครื่องจากกระดูกและเนื้อ มักคู่กับเหล่าเมด",
    art: { ...ART.houndAxe, kind: "cutout" },
  },
  {
    id: "bar",
    en: "Bar Owner",
    th: "เจ้าของบาร์",
    epithet: "ผู้มีสภาวะไม่แน่นอน",
    desc: "ตัวละครลึกลับที่ต้องรับเนื้อจากฮันเตอร์มาปรุงเป็นอาหารพิเศษเพื่อคงสภาพตนเอง คอยปรุงเนื้อลดผลข้างเคียงคำสาป — และมีอาการ Closing Shift หมดสติชั่วคราวในช่วงเวลาเดิม ๆ ของวัน",
    art: { ...ART.barOwner, kind: "cutout" },
  },
  {
    id: "patron",
    en: "Patron",
    th: "ลูกค้า / ปีศาจ",
    epithet: "ผู้หิวโหยไม่สิ้นสุด",
    desc: "อดีตมนุษย์ที่กลายเป็นก้อนเนื้อมีสติปัญญาหลงเหลือ รูปทรงบิดเบี้ยว ยังปรารถนาจะลิ้มรสเนื้อ ลูกค้าหลักของบาร์ และผู้จ้างวานฮันเตอร์",
    art: { ...ART.patron, kind: "cutout" },
  },
  {
    id: "outsider",
    en: "Outsider",
    th: "ผู้หลงมิติ",
    epithet: "ผู้มาจากโลกจริง",
    desc: "หลงจากโลกจริงเข้ามาเหมือนติด backroom ตามหาทางออกที่ไม่มีจริง กว่าจะถึงเกาะก็เสียความเป็นมนุษย์ไปแทบหมด การเดินทางผูกกับเทพบรรพกาลโดยตรง",
    art: { ...ART.outsider, kind: "cutout" },
  },
];

const ease = [0.2, 0.8, 0.2, 1] as const;
const pad = (n: number) => String(n).padStart(2, "0");

/** Role showcase: name tabs on top, framed art on the left, story on the right. */
export function CharacterSelect() {
  const [i, setI] = useState(0);
  const r = ROLES[i]!;
  const go = (d: number) => setI((n) => (n + d + ROLES.length) % ROLES.length);

  return (
    <section className="cs ff-host" aria-label="Characters">
      {/* backdrop wordmark follows the selected role */}
      <div className="ff-bg" aria-hidden="true">
        <AnimatePresence mode="wait">
          <motion.span
            key={r.id}
            className="ff-word"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.6, ease }}
          >
            {r.en.toUpperCase()}
          </motion.span>
        </AnimatePresence>
      </div>
      <SectionHead en="CHARACTERS" th="คุณจะเป็นใครบนเกาะนี้" center />

      <div className="cs-tabs" role="tablist">
        {ROLES.map((x, n) => (
          <button key={x.id} role="tab" aria-selected={n === i} className={`cs-tab ${n === i ? "on" : ""}`} onClick={() => setI(n)}>
            <span className="cs-tab-en">{x.en}</span>
            <span className="cs-tab-th">{x.th}</span>
          </button>
        ))}
      </div>

      <div className="cs-stage">
        <div className="cs-frame">
          <span className="cs-corner tl" />
          <span className="cs-corner tr" />
          <span className="cs-corner bl" />
          <span className="cs-corner br" />
          <AnimatePresence mode="wait">
            <motion.div
              key={r.id}
              className={`cs-figure ${r.art?.kind ?? "none"}`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5, ease }}
            >
              {r.art ? (
                <Image
                  src={r.art.src}
                  alt={r.art.alt}
                  fill
                  sizes="(max-width: 900px) 90vw, 46vw"
                  style={{ objectFit: r.art.kind === "cutout" ? "contain" : "cover", objectPosition: r.art.kind === "cutout" ? "50% 100%" : r.art.pos }}
                />
              ) : (
                <span className="cs-norecord">
                  <b>No Record</b>
                  <small>ยังไม่มีภาพบันทึก</small>
                </span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={r.id}
            className="cs-info"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.45, ease }}
          >
            <p className="cs-no">
              {pad(i + 1)} <span>/ {pad(ROLES.length)}</span>
            </p>
            <h3 className="cs-en">{r.en}</h3>
            <p className="cs-th">{r.th}</p>
            <p className="cs-divider" aria-hidden="true">
              <i />
              <b>◆</b>
              <i />
            </p>
            <p className="cs-epithet">{r.epithet}</p>
            <p className="cs-desc">{r.desc}</p>
            <div className="cs-nav">
              <button onClick={() => go(-1)} aria-label="ก่อนหน้า">
                ‹ Prev
              </button>
              <button onClick={() => go(1)} aria-label="ถัดไป">
                Next ›
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
