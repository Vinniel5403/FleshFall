"use client";

import type { AccountView } from "@/lib/types";
import { Card, Meter, PanelHead } from "./ui";

export type TabId = "overview" | "identity" | "images" | "sprite" | "room" | "account";

export interface Task { id: string; label: string; done: boolean; tab: TabId; hint: string }

/** The "file completeness" checklist (also drives the nav badge). */
export function profileTasks(c: AccountView, inGuild: boolean): Task[] {
  const has = (slot: string) => c.images.some((i) => i.slot === slot);
  return [
    { id: "guild", label: "เข้าเซิร์ฟ Discord", done: inGuild, tab: "account", hint: "ต้องอยู่ในเซิร์ฟถึงจะเล่นได้" },
    { id: "portrait", label: "ภาพโปรไฟล์", done: has("portrait"), tab: "images", hint: "ใช้ในการ์ด Discord และห้อง RP" },
    { id: "art", label: "ภาพตัวละคร", done: has("art"), tab: "images", hint: "ภาพเต็มตัวบนการ์ด /profile" },
    { id: "bio", label: "บันทึกตัวละคร", done: !!c.bio?.trim(), tab: "identity", hint: "ประวัติ นิสัย ให้คนอื่นรู้จัก" },
    { id: "sprite", label: "สไปรต์ PSD", done: !!c.sprite, tab: "sprite", hint: "ตัวละครขยับได้ เดินในห้อง" },
    { id: "room", label: "แต่งห้องส่วนตัว", done: !!c.room?.items.length, tab: "room", hint: "วางเฟอร์นิเจอร์อย่างน้อย 1 ชิ้น" },
  ];
}

export function OverviewPanel({
  character: c,
  inGuild,
  welcome,
  go,
}: {
  character: AccountView;
  inGuild: boolean;
  welcome: boolean;
  go: (t: TabId) => void;
}) {
  const tasks = profileTasks(c, inGuild);
  const done = tasks.filter((t) => t.done).length;
  const pct = Math.round((done / tasks.length) * 100);
  const st = c.status;
  const next = tasks.find((t) => !t.done);

  return (
    <div className="st-stack">
      <PanelHead en="OVERVIEW" title={welcome ? `ยินดีต้อนรับสู่ FleshFall, ${c.name}` : "ภาพรวม"} desc={welcome ? "ตัวละครของคุณถูกบันทึกลงแฟ้ม M.A.I.D.S แล้ว — ตกแต่งให้ครบ แล้วเข้าไปเอาชีวิตรอดใน Discord" : "สถานะตัวละครล่าสุดจากเกม และสิ่งที่ยังตั้งค่าไม่ครบ"} />

      <Card className="st-progress-card">
        <div className="st-progress">
          <div className="st-ring" style={{ "--p": pct } as React.CSSProperties} role="img" aria-label={`แฟ้มสมบูรณ์ ${pct}%`}>
            <span>
              {pct}
              <small>%</small>
            </span>
          </div>
          <div className="st-progress-copy">
            <p className="st-kicker">FILE COMPLETENESS</p>
            <h3>{done === tasks.length ? "แฟ้มสมบูรณ์แล้ว" : `ตั้งค่าแล้ว ${done} จาก ${tasks.length}`}</h3>
            <p className="st-note">{next ? `ต่อไป: ${next.label} — ${next.hint}` : "ตัวละครของคุณพร้อมเต็มที่ ออกล่าได้เลย"}</p>
            {next && (
              <button type="button" className="st-btn primary" onClick={() => go(next.tab)}>
                {next.label} →
              </button>
            )}
          </div>
        </div>
        <ul className="st-tasks">
          {tasks.map((t) => (
            <li key={t.id}>
              <button type="button" className={t.done ? "done" : undefined} onClick={() => go(t.tab)}>
                <span className="st-check" aria-hidden="true">{t.done ? "✓" : ""}</span>
                <span className="st-task-label">{t.label}</span>
                <span className="st-task-go" aria-hidden="true">›</span>
                <span className="sr-only">{t.done ? "(เสร็จแล้ว)" : "(ยังไม่ได้ทำ)"}</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {st && (
        <Card title="สถานะในเกม" aside={<span className="st-count">📍 {st.where}</span>}>
          <div className="pf-level st-level">
            <span className="pf-lv">
              <small>LV</small>
              {c.level}
            </span>
            <Meter label="ประสบการณ์" value={st.xp} max={st.xpNext} unit=" XP" tone="xp" />
          </div>
          <div className="pf-meters">
            <Meter label="เนื้อกาย" value={st.hp} max={st.maxHp} tone="hp" />
            <Meter label="แรง" value={st.stamina} max={st.maxStamina} tone="st" />
            <Meter label="ความเป็นมนุษย์" value={st.humanity} max={100} tone="hu" />
            <Meter label="สติ" value={st.sanity} max={100} tone="sa" />
          </div>
          <dl className="pf-stats">
            <div>
              <dt>พละ</dt>
              <dd>{st.stats.str}</dd>
            </div>
            <div>
              <dt>ว่องไว</dt>
              <dd>{st.stats.agi}</dd>
            </div>
            <div>
              <dt>สัมผัส</dt>
              <dd>{st.stats.int}</dd>
            </div>
            <div>
              <dt>เนื้อสด</dt>
              <dd>🥩 {st.flesh}</dd>
            </div>
          </dl>
        </Card>
      )}

      <Card title="เริ่มเล่นใน Discord">
        <ol className="st-guide">
          <li>
            <b>#butchery</b> กด 📜 โปรไฟล์ เพื่อดูตัวละคร
          </li>
          <li>
            กด <b>🗺️ ออกสำรวจ</b> เลือกทวีปและเมือง — 🟢 Easy เหมาะกับมือใหม่
          </li>
          <li>ในเมือง กด 🎲 ออกล่า หรือ 🔍 สำรวจ โชคดีอาจเจอประตูดันเจียน</li>
          <li>
            ของที่ได้จะถึงมือเมื่อกลับ <b>🏠 Rouge Land</b> — ตายกลางทาง ของรอบนั้นหายหมด
          </li>
        </ol>
        {!inGuild && (
          <button type="button" className="st-btn ghost" onClick={() => go("account")}>
            ยังไม่ได้เข้าเซิร์ฟ — ไปที่บัญชี →
          </button>
        )}
      </Card>
    </div>
  );
}
