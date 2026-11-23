"use client";

import { useMemo } from "react";
import { FACE_CHANCE, LEG_IN_SKIRT, physDefaults } from "@/lib/puppet";
import { buildSkeleton, kindOf, moodsOf, type PartTune, type Rig, type RigTune } from "@/lib/rig";
import { Card } from "./ui";

const DEG = 180 / Math.PI;
/** Snap to the step without float noise (as many decimals as the step has). */
const round = (v: number, step: number) => Number((Math.round(v / step) * step).toFixed((String(step).split(".")[1] ?? "").length));

type NumKey = Exclude<keyof PartTune, "px" | "py">;
interface Field { k: NumKey; label: string; hint: string; lo: number; hi: number; step: number; unit?: string }

/** Per-part numbers (pivot has its own row). Angles in degrees, + = clockwise on screen. */
const FIELDS: Field[] = [
  { k: "min", label: "มุมต่ำสุด", unit: "°", lo: -180, hi: 180, step: 1, hint: "หมุนทวนเข็มได้สุดเท่านี้ เทียบกับชิ้นแม่ (ตอนปล่อย/โยน) · กรอบเหลืองบนตัวละคร" },
  { k: "max", label: "มุมสูงสุด", unit: "°", lo: -180, hi: 180, step: 1, hint: "หมุนตามเข็มได้สุดเท่านี้" },
  { k: "swing", label: "แกว่งตอนถูกถือ ±", unit: "°", lo: 0, hi: 180, step: 1, hint: "ระยะแกว่งรอบมุมห้อยตอนโดนหิ้ว" },
  { k: "dangle", label: "แรงแกว่ง", lo: -3, hi: 3, step: 0.05, hint: "0 = ไม่แกว่งเลย · ติดลบ = ชิ้นที่ตั้งขึ้น เช่นหัว" },
  { k: "gravity", label: "แรงโน้มถ่วง", lo: 0, hi: 1, step: 0.05, hint: "1 = ห้อยลงตรงตอนถูกหิ้ว · 0 = แข็งติดตัว" },
  { k: "idle", label: "ท่ายืน (idle) ×", lo: 0, hi: 3, step: 0.05, hint: "ความแรงของท่าหายใจ/โยกตอนยืนเฉย · 0 = นิ่ง" },
];

/** Drop empty part entries / an empty tuning. */
function tidy(t: RigTune): RigTune {
  const parts = Object.fromEntries(Object.entries(t.parts ?? {}).filter(([, p]) => Object.keys(p).length));
  const out: RigTune = { ...t, parts };
  if (!Object.keys(parts).length) delete out.parts;
  return out;
}

function Row({ label, hint, value, def, lo, hi, step, unit, onChange }: {
  label: string; hint: string; value: number | undefined; def: number; lo: number; hi: number; step: number; unit?: string; onChange: (v: number | undefined) => void;
}) {
  const v = value ?? def;
  const set = (n: number) => onChange(Number.isFinite(n) ? round(Math.min(hi, Math.max(lo, n)), step) : undefined);
  return (
    <div className={`st-tune-row${value !== undefined ? " on" : ""}`}>
      <label>
        <span title={hint}>{label}</span>
        <input
          className="st-range"
          type="range"
          min={lo}
          max={hi}
          step={step}
          value={v}
          onChange={(e) => set(Number(e.target.value))}
          style={{ "--fill": `${((v - lo) / (hi - lo)) * 100}%` } as React.CSSProperties}
        />
      </label>
      <input className="st-tune-num" type="number" min={lo} max={hi} step={step} value={round(v, step)} placeholder={String(round(def, step))} aria-label={label} onChange={(e) => set(e.target.valueAsNumber)} />
      <span className="st-tune-unit">{unit}</span>
      <button type="button" className="st-tune-reset" onClick={() => onChange(undefined)} disabled={value === undefined} title={`ค่าเริ่มต้น ${round(def, step)}${unit ?? ""}`} aria-label={`รีเซ็ต${label}`}>
        ↺
      </button>
    </div>
  );
}

/**
 * Sprite tuner: the player's own pivots / joint ranges / sway per part, plus rig-wide numbers. Edits the tuning
 * only — the panel previews it live on the stage and saves it with the sprite.
 */
export function SpriteTuner({ rig, tune, onTune, selected, onSelect, freeze, onFreeze, note }: {
  rig: Rig; tune: RigTune; onTune: (t: RigTune) => void;
  selected: string | null; onSelect: (id: string | null) => void;
  freeze: boolean; onFreeze: (v: boolean) => void;
  note?: string;
}) {
  const defaults = useMemo(() => buildSkeleton({ ...rig, tune: undefined }), [rig]);
  const bones = useMemo(() => buildSkeleton(rig), [rig]);
  const ids = useMemo(() => [...rig.parts].sort((a, b) => b.z - a.z).map((p) => p.id), [rig.parts]);
  const id = selected && defaults.has(selected) ? selected : null;
  const bone = id ? defaults.get(id)! : null;
  const own = (id && tune.parts?.[id]) || {};
  const def = bone ? physDefaults(bone.kind) : null;
  const hasSkirt = defaults.has("skirt") && [...defaults.values()].some((b) => b.kind === "leg");
  const hasFaces = moodsOf(bones).size > 0;

  const setPart = (k: keyof PartTune, v: number | undefined) => {
    if (!id) return;
    const next = { ...own };
    if (v === undefined) delete next[k];
    else next[k] = v;
    onTune(tidy({ ...tune, parts: { ...tune.parts, [id]: next } }));
  };
  const setRig = (k: "legInSkirt" | "faceChance", v: number | undefined) => {
    const next = { ...tune };
    if (v === undefined) delete next[k];
    else next[k] = v;
    onTune(tidy(next));
  };
  const defOf = (k: NumKey): number => {
    if (!def) return 0;
    if (k === "idle") return 1;
    return k === "min" || k === "max" || k === "swing" ? def[k] * DEG : def[k];
  };
  const copy = () => void navigator.clipboard?.writeText(JSON.stringify(tune, null, 2));
  const paste = () => {
    const raw = prompt("วาง JSON การปรับแต่ง (จากปุ่มคัดลอก)");
    if (!raw) return;
    try {
      const t = JSON.parse(raw) as RigTune;
      if (t && typeof t === "object") onTune(tidy({ ...t, parts: Object.fromEntries(Object.entries(t.parts ?? {}).filter(([k]) => defaults.has(k))) }));
    } catch {
      alert("JSON ไม่ถูกต้อง");
    }
  };

  return (
    <Card title="ปรับแต่งโครง" aside={<span className="st-count">{Object.keys(tune.parts ?? {}).length} ชิ้นที่แก้</span>} className="st-tune">
      <label className="st-switch">
        <input type="checkbox" checked={freeze} onChange={(e) => onFreeze(e.target.checked)} />
        <i aria-hidden="true" />
        หยุดท่า · คลิกเลือกชิ้น ลากจุดหมุนได้
      </label>
      {note && <p className="st-note">{note}</p>}

      <div className="st-tune-pick">
        <select value={id ?? ""} onChange={(e) => onSelect(e.target.value || null)} aria-label="เลือกชิ้นส่วน">
          <option value="">— เลือกชิ้นส่วน —</option>
          {ids.map((p) => (
            <option key={p} value={p}>
              {tune.parts?.[p] ? "● " : ""}
              {p}
            </option>
          ))}
        </select>
        {id && (
          <button type="button" className="st-btn sm ghost" onClick={() => onTune(tidy({ ...tune, parts: { ...tune.parts, [id]: {} } }))} disabled={!tune.parts?.[id]}>
            รีเซ็ตชิ้นนี้
          </button>
        )}
      </div>

      {bone && def && (
        <div className="st-tune-grid">
          <div className={`st-tune-row pivot${own.px !== undefined || own.py !== undefined ? " on" : ""}`}>
            <span title="จุดที่ชิ้นนี้หมุนรอบ (พิกเซลของสไปรต์) — ลากจุดเหลืองบนตัวละครตอนหยุดท่า">จุดหมุน</span>
            <input className="st-tune-num" type="number" step={1} value={Math.round(own.px ?? bone.px)} aria-label="จุดหมุน X" onChange={(e) => setPart("px", Number.isFinite(e.target.valueAsNumber) ? Math.round(e.target.valueAsNumber) : undefined)} />
            <input className="st-tune-num" type="number" step={1} value={Math.round(own.py ?? bone.py)} aria-label="จุดหมุน Y" onChange={(e) => setPart("py", Number.isFinite(e.target.valueAsNumber) ? Math.round(e.target.valueAsNumber) : undefined)} />
            <button
              type="button"
              className="st-tune-reset"
              onClick={() => {
                const next = { ...own };
                delete next.px;
                delete next.py;
                onTune(tidy({ ...tune, parts: { ...tune.parts, [id!]: next } }));
              }}
              disabled={own.px === undefined && own.py === undefined}
              title={`ค่าเริ่มต้น ${Math.round(bone.px)}, ${Math.round(bone.py)}`}
              aria-label="รีเซ็ตจุดหมุน"
            >
              ↺
            </button>
          </div>
          {FIELDS.map((f) => (
            <Row key={f.k} {...f} value={own[f.k]} def={defOf(f.k)} onChange={(v) => setPart(f.k, v)} />
          ))}
          <p className="st-note">
            {kindOf(id!).kind ? `ชนิด ${kindOf(id!).kind}` : "ชิ้นนอกเทมเพลต — ใส่แรงแกว่ง/แรงโน้มถ่วงเพื่อให้ขยับได้"} · ค่าที่ไม่ได้แก้ใช้ค่าเริ่มต้นของระบบ
          </p>
        </div>
      )}

      {(hasSkirt || hasFaces) && (
        <div className="st-tune-grid">
          {hasSkirt && (
            <Row label="ขาในกระโปรง" hint="ขาแกว่งออกจากกระโปรงได้กี่ส่วนของที่ว่างใต้ชาย · 0 = ล็อกติดกระโปรง · เกิน 1 = เลยชายได้" value={tune.legInSkirt} def={LEG_IN_SKIRT} lo={0} hi={2} step={0.05} onChange={(v) => setRig("legInSkirt", v)} />
          )}
          {hasFaces && (
            <Row label="โอกาสหน้า emoji" hint="ต่อการจับ / การโยน / ช่วงยืนเฉย" value={tune.faceChance === undefined ? undefined : tune.faceChance * 100} def={FACE_CHANCE * 100} lo={0} hi={100} step={1} unit="%" onChange={(v) => setRig("faceChance", v === undefined ? undefined : v / 100)} />
          )}
        </div>
      )}

      <div className="st-row">
        <button type="button" className="st-btn sm ghost" onClick={copy}>คัดลอก JSON</button>
        <button type="button" className="st-btn sm ghost" onClick={paste}>วาง JSON</button>
        <button type="button" className="st-btn sm danger" onClick={() => onTune({})} disabled={!Object.keys(tune).length}>
          รีเซ็ตทั้งหมด
        </button>
      </div>
    </Card>
  );
}
