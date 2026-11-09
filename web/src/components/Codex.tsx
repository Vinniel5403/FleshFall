"use client";

import { useState } from "react";
import { useGame } from "@/lib/game";
import { doorVar } from "@/lib/md";
import type { Icon, Item, Monster, Role } from "@/lib/types";

const TABS = { icons: "7 Icon", roles: "บทบาท", bestiary: "สัตว์ประหลาด", items: "ไอเทม" } as const;
type Tab = keyof typeof TABS;
const ITEM_TYPES = { all: "ทั้งหมด", consumable: "🍽️ ของกิน/ยา", weapon: "🗡️ อาวุธ", armor: "🛡️ เกราะ", material: "🧱 วัตถุดิบ", vintage: "📻 ของวินเทจ" } as const;

function Icons() {
  const { data } = useGame("icons");
  return (
    <>
      <p className="lead">มีเพียงเจ็ดเท่านั้น สิ่งอื่นนอกจากนี้คือนอกรีต — พรทุกอย่างมีผลกรรม</p>
      <div className="grid icons">
        {data?.map((i) => (
          <div key={i.id} className="card icon-card" style={{ "--door": doorVar(i.door) } as React.CSSProperties}>
            <div className="emoji">{i.emoji}</div>
            <h3>{i.name}</h3>
            <div className="sub">
              {i.title} · {i.doorName}
            </div>
            <p>
              <i>{i.concept}</i>
            </p>
            <p className="bless">✦ {i.blessing}</p>
            <p className="curse">✖ {i.repercussion}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function Roles() {
  const { data } = useGame("roles");
  return (
    <div className="grid roles">
      {data?.map((r) => (
        <div key={r.id} className="card">
          <h3>
            {r.emoji} {r.name}
          </h3>
          <div className="sub">{r.short}</div>
          <div style={{ marginTop: 8 }}>
            <span className="chip">🩸 {r.maxHp}</span>
            <span className="chip">⚡ {r.maxStamina}</span>
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
      ))}
    </div>
  );
}

function Bestiary() {
  const { data } = useGame("bestiary");
  return (
    <div className="grid beasts">
      {data?.map((m) => (
        <div key={m.id} className="card beast">
          <div className="emoji">{m.emoji}</div>
          <h3>{m.name}</h3>
          <p>{m.desc}</p>
          <div className="nums">
            <span>❤ {m.hp}</span>
            <span>🛡 AC {m.ac}</span>
            <span>
              ⚔ {m.dmg[0]}–{m.dmg[1]}
            </span>
            <span>✦ {m.xp} XP</span>
            {m.minLevel && <span>Lv {m.minLevel}+</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Items() {
  const { data } = useGame("items");
  const [type, setType] = useState<keyof typeof ITEM_TYPES>("all");
  return (
    <>
      <div className="tabs">
        {Object.entries(ITEM_TYPES).map(([k, l]) => (
          <button key={k} className={`tab ${k === type ? "on" : ""}`} onClick={() => setType(k as keyof typeof ITEM_TYPES)}>
            {l}
          </button>
        ))}
      </div>
      <div className="grid items">
        {data
          ?.filter((i) => type === "all" || i.type === type)
          .map((i) => (
            <div key={i.id} className="card item">
              <h3>
                {i.emoji} {i.name}
              </h3>
              <div className="price">{i.value} 🥩 เนื้อสด</div>
              <p>{i.description}</p>
            </div>
          ))}
      </div>
    </>
  );
}

export function Codex() {
  const [tab, setTab] = useState<Tab>("icons");
  return (
    <>
      <div className="tabs">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <button key={t} className={`tab ${t === tab ? "on" : ""}`} onClick={() => setTab(t)}>
            {TABS[t]}
          </button>
        ))}
      </div>
      {tab === "icons" && <Icons />}
      {tab === "roles" && <Roles />}
      {tab === "bestiary" && <Bestiary />}
      {tab === "items" && <Items />}
    </>
  );
}
