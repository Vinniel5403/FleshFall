"use client";

import Link from "next/link";
import { useApi } from "@/lib/api";
import type { Status } from "@/lib/types";

export function Hero() {
  const { data: s, error } = useApi<Status>("status");
  const crimson = !!s?.crimsonMoon;
  return (
    <section className="hero">
      <div className={`moon ${crimson ? "crimson" : ""}`} aria-hidden="true" />
      <p className="eyebrow">เมดเนื้อ · Rouge Land · Old Realm</p>
      <h1>
        FLESH<span>FALL</span>
      </h1>
      <p className="tag">
        ผู้หลงมิติที่หิวโหย จะเลือกกินเนื้อเพื่ออยู่รอด
        <br />
        หรืออดตายพร้อมความเป็นมนุษย์ที่เหลืออยู่
      </p>
      <div className={`moon-status ${crimson ? "crimson" : ""}`}>
        {error
          ? "🌑 ไม่ได้เชื่อมต่อเซิร์ฟเวอร์เกม"
          : !s
            ? "…"
            : crimson
              ? "🌕 Crimson Moon กำลังส่องแสง — สัตว์ประหลาดโหดขึ้น 30%"
              : `🌑 Crimson Moon ครั้งถัดไป ${new Date(s.nextCrimsonMoon).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}`}
      </div>
      {s && (
        <div className="stats">
          {(
            [
              [s.players, "ผู้เล่น"],
              [s.exploring, "กำลังสำรวจ"],
              [s.cities, "เมือง"],
              [s.fiends, "กลายเป็น Fiend"],
            ] as const
          ).map(([n, l]) => (
            <div className="stat" key={l}>
              <b>{n}</b>
              <span>{l}</span>
            </div>
          ))}
        </div>
      )}
      <Link className="cta" href="/hunt">
        🎲 ลองออกล่า
      </Link>
    </section>
  );
}
