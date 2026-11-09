"use client";

import { useEffect, useRef, useState } from "react";
import { api, useApi } from "@/lib/api";
import { md, TIER_NAME } from "@/lib/md";
import type { ApiError, HuntView, Icon, Role, World } from "@/lib/types";

type LogLine = { key: number; html: string; sep?: boolean };

export function HuntDemo() {
  const { data: roles, error } = useApi<Role[]>("roles");
  const { data: icons } = useApi<Icon[]>("icons");
  const { data: world } = useApi<World>("world");
  const [hunt, setHunt] = useState<HuntView | null>(null);
  const [prev, setPrev] = useState<HuntView | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ role: "outsider", icon: "loki", zone: "paris", level: 1 });
  const logRef = useRef<HTMLOListElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  const push = (lines: string[], fresh: boolean) =>
    setLog((l) => [
      ...(fresh ? [] : [...l, { key: seq.current++, html: "— — —", sep: true }]),
      ...lines.filter(Boolean).map((x) => ({ key: seq.current++, html: md(x) })),
    ]);

  async function run(path: string, body: unknown, fresh: boolean) {
    setBusy(true);
    try {
      const v = await api<HuntView | ApiError>(path, body);
      if ("error" in v) return push([`⚠️ ${v.error}`], fresh);
      setPrev(fresh ? null : hunt);
      setHunt(v);
      push(v.lines, fresh);
    } catch {
      push(["⚠️ ติดต่อเซิร์ฟเวอร์เกมไม่ได้"], fresh);
    } finally {
      setBusy(false);
    }
  }

  const start = () => run("demo/start", form, true);

  if (error) return <p className="notice">{error}</p>;

  return (
    <>
      <form
        className="hunt-setup"
        onSubmit={(e) => {
          e.preventDefault();
          start();
        }}
      >
        <label>
          บทบาท
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {roles?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.emoji} {r.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Icon
          <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
            {icons?.map((i) => (
              <option key={i.id} value={i.id}>
                {i.emoji} {i.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          เมือง
          <select value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })}>
            {world?.continents.map((c) => (
              <optgroup key={c.id} label={c.name}>
                {c.cities.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} ({TIER_NAME[z.tier]})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label>
          เลเวล
          <input type="number" min={1} max={20} value={form.level} onChange={(e) => setForm({ ...form, level: Number(e.target.value) })} />
        </label>
        <button type="submit" disabled={busy}>
          🎲 ออกล่า
        </button>
      </form>

      {hunt && (
        <div className="arena">
          {hunt.zone && (
            <div className="arena-head">
              <h3>
                ⚔️ ล่าใน {hunt.zone.emoji} {hunt.zone.name}
              </h3>
              <span className={`tier ${hunt.zone.tier}`}>
                {TIER_NAME[hunt.zone.tier]} · Lv {hunt.zone.tierInfo.rec}+
              </span>
            </div>
          )}
          <div className="foes">
            {hunt.monsters.map((m, i) => {
              const was = prev?.monsters[i];
              const hit = was && was.hp > m.hp;
              return (
                <div key={`${i}-${m.hp}`} className={`foe ${m.hp <= 0 ? "dead" : ""} ${hit ? "hit" : ""}`}>
                  <div className="emoji">{m.emoji}</div>
                  <div>
                    {i + 1}. {m.name}
                  </div>
                  <div className="bar">
                    <i style={{ width: `${(100 * m.hp) / m.maxHp}%` }} />
                  </div>
                  <small className="sub">
                    {m.hp}/{m.maxHp}
                  </small>
                </div>
              );
            })}
          </div>
          <div className="hero-bar">
            <b>{hunt.hero.name}</b>{" "}
            <span className="sub">
              Lv {hunt.hero.level} · 🧠 {hunt.hero.sanity}
            </span>
            <div className="bar">
              <i style={{ width: `${(100 * hunt.hero.hp) / hunt.hero.maxHp}%` }} />
            </div>
            <small className="sub">
              🩸 {hunt.hero.hp}/{hunt.hero.maxHp}
            </small>
          </div>
          <div className="actions">
            {hunt.ended ? (
              <>
                <div className={`result ${hunt.ended}`} style={{ width: "100%" }}>
                  {hunt.ended === "won" && (
                    <>
                      🏆 ชนะ! ได้ {hunt.xp} XP
                      {hunt.loot.length > 0 && <> · {hunt.loot.map((l) => `${l.emoji} ${l.name} ×${l.n}`).join(", ")}</>}
                      {hunt.door && (
                        <>
                          <br />
                          {hunt.door.emoji} <b>{hunt.door.name}</b> ปรากฏขึ้น... (เข้าได้ในบอท Discord)
                        </>
                      )}
                    </>
                  )}
                  {hunt.ended === "died" && "💀 คุณล้มลงใน Old Realm..."}
                  {hunt.ended === "fled" && "🏃 คุณหนีรอดมาได้"}
                </div>
                <button onClick={start} disabled={busy}>
                  🎲 ล่าต่อ
                </button>
              </>
            ) : (
              <>
                {hunt.monsters.map((m, i) =>
                  m.hp > 0 ? (
                    <button key={i} disabled={busy} onClick={() => run("demo/act", { id: hunt.id, action: "atk", target: i }, false)}>
                      ⚔️ {i + 1}. {m.name}
                    </button>
                  ) : null,
                )}
                <button className="ghost" disabled={busy} onClick={() => run("demo/act", { id: hunt.id, action: "flee" }, false)}>
                  🏃 หนี
                </button>
              </>
            )}
          </div>
          <ol className="log" ref={logRef}>
            {log.map((l) => (
              <li key={l.key} className={l.sep ? "sep" : undefined} dangerouslySetInnerHTML={{ __html: l.html }} />
            ))}
          </ol>
        </div>
      )}
    </>
  );
}
