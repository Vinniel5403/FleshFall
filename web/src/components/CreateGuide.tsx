"use client";

import { useState } from "react";
import { useApi } from "@/lib/api";
import { doorVar } from "@/lib/md";
import type { Icon, Role } from "@/lib/types";

/** Interactive character builder: pick role + Icon + name → the exact /start command to paste in Discord. */
export function CreateGuide() {
  const { data: roles, error } = useApi<Role[]>("roles");
  const { data: icons } = useApi<Icon[]>("icons");
  const [role, setRole] = useState("maid");
  const [icon, setIcon] = useState("loki");
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);

  if (error) return <p className="notice">{error}</p>;
  if (!roles || !icons) return <p className="notice">กำลังโหลด…</p>;

  const r = roles.find((x) => x.id === role) ?? roles[0]!;
  const ic = icons.find((x) => x.id === icon) ?? icons[0]!;
  const cmd = `/start name:${name.trim() || "ชื่อตัวละคร"} role:${r.id} icon:${ic.id}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the command is still visible to copy by hand */
    }
  };

  return (
    <div className="create">
      {/* STEP 1 */}
      <section className="step">
        <header>
          <span className="step-no">01</span>
          <div>
            <h3>เลือกบทบาท</h3>
            <p className="sub">บทบาทกำหนดค่าพลังเริ่มต้น จุดเกิด และความสามารถพิเศษ</p>
          </div>
        </header>
        <div className="pick-grid">
          {roles.map((x) => (
            <button key={x.id} className={`pick ${x.id === r.id ? "on" : ""}`} onClick={() => setRole(x.id)}>
              <span className="pick-emoji">{x.emoji}</span>
              <b>{x.name}</b>
              <small>{x.short}</small>
            </button>
          ))}
        </div>
        <div className="pick-detail">
          <div className="chips">
            <span className="chip">🩸 เนื้อกาย {r.maxHp}</span>
            <span className="chip">⚡ แรง {r.maxStamina}</span>
            <span className="chip">พละ {r.stats.str}</span>
            <span className="chip">ว่องไว {r.stats.agi}</span>
            <span className="chip">สัมผัส {r.stats.int}</span>
          </div>
          <ul>
            {r.perks.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* STEP 2 */}
      <section className="step">
        <header>
          <span className="step-no">02</span>
          <div>
            <h3>เลือกเทพที่ศรัทธา</h3>
            <p className="sub">ทุกพรมีผลกรรม — เลือกให้ดี เพราะเปลี่ยนไม่ได้</p>
          </div>
        </header>
        <div className="pick-grid icons7">
          {icons.map((x) => (
            <button
              key={x.id}
              className={`pick ${x.id === ic.id ? "on" : ""}`}
              style={{ "--door": doorVar(x.door) } as React.CSSProperties}
              onClick={() => setIcon(x.id)}
            >
              <span className="pick-emoji">{x.emoji}</span>
              <b>{x.name}</b>
              <small>{x.doorName}</small>
            </button>
          ))}
        </div>
        <div className="pick-detail" style={{ "--door": doorVar(ic.door) } as React.CSSProperties}>
          <p className="icons-concept">{ic.concept}</p>
          <div className="icons-trade">
            <div>
              <b>✦ พร</b>
              <p>{ic.blessing}</p>
            </div>
            <div>
              <b>✖ ผลกรรม</b>
              <p>{ic.repercussion}</p>
            </div>
          </div>
        </div>
      </section>

      {/* STEP 3 */}
      <section className="step">
        <header>
          <span className="step-no">03</span>
          <div>
            <h3>ตั้งชื่อ แล้วพิมพ์คำสั่งใน Discord</h3>
            <p className="sub">ไม่เกิน 32 ตัวอักษร</p>
          </div>
        </header>
        <input className="name-input" value={name} maxLength={32} placeholder="ชื่อตัวละคร" onChange={(e) => setName(e.target.value)} />
        <div className="cmd">
          <code>{cmd}</code>
          <button onClick={copy}>{copied ? "✓ คัดลอกแล้ว" : "คัดลอก"}</button>
        </div>
        <p className="sub">
          พิมพ์ <code>/start</code> ในห้องใดก็ได้ของเซิร์ฟ FleshFall แล้วเลือกค่าตามนี้
        </p>
      </section>

      {/* STEP 4 */}
      <section className="step">
        <header>
          <span className="step-no">04</span>
          <div>
            <h3>ก้าวเข้าสู่วังวน</h3>
          </div>
        </header>
        <ol className="flow">
          <li>
            ไปที่ห้อง <b>#butchery</b> กด 📜 โปรไฟล์ เพื่อดูตัวละคร
          </li>
          <li>
            กด <b>🗺️ ออกสำรวจ</b> เลือกทวีปและเมือง — เมืองระดับ 🟢 Easy เหมาะกับมือใหม่
          </li>
          <li>ในห้องเมือง กด 🎲 ออกล่า หรือ 🔍 สำรวจ โชคดีอาจเจอประตูดันเจียน</li>
          <li>
            เนื้อหมด แรงหมด กด <b>🏠 กลับ Rouge Land</b> (30 นาที) เพื่อซื้อของ ปรุงอาหาร และอัปเกรดที่บาร์
          </li>
        </ol>
      </section>
    </div>
  );
}
