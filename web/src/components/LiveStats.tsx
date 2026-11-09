"use client";

import { useApi } from "@/lib/api";
import type { Status } from "@/lib/types";

/** Live ticker strip under the key visual. */
export function LiveStats() {
  const { data: s, error } = useApi<Status>("status");
  const moon = !s
    ? error
      ? "🌑 ไม่ได้เชื่อมต่อเซิร์ฟเวอร์เกม"
      : "…"
    : s.crimsonMoon
      ? "🌕 Crimson Moon กำลังส่องแสง — สัตว์ประหลาดโหดขึ้น 30%"
      : `🌑 Crimson Moon ครั้งถัดไป ${new Date(s.nextCrimsonMoon).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}`;
  return (
    <section className={`ticker ${s?.crimsonMoon ? "crimson" : ""}`}>
      <span className="ticker-tag">NEWS</span>
      <span className="ticker-moon">{moon}</span>
      {s && (
        <span className="ticker-stats">
          <b>{s.players}</b> ผู้เล่น · <b>{s.exploring}</b> กำลังสำรวจ · <b>{s.cities}</b> เมือง · <b>{s.fiends}</b> Fiend
        </span>
      )}
    </section>
  );
}
