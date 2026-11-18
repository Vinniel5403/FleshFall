"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import templateRig from "@/data/sprite-template.json";
import { api, jsonInit } from "@/lib/client";
import type { ParsedSprite } from "@/lib/psd";
import { HEIGHT_DEFAULT, HEIGHT_MAX, HEIGHT_MIN, TEMPLATE_GROUPS, type Rig } from "@/lib/rig";
import type { AccountView } from "@/lib/types";
import { SpriteStage } from "../SpriteStage";
import { Card, PanelHead, SaveBar, Spinner, useDirty, useToast } from "./ui";

/** Default sprite (split from the template PSD by `npm run web:template`) shown until a player uploads their own. */
const TEMPLATE_RIG = templateRig as Rig;
const TEMPLATE_PSD = "/templates/fleshfall-sprite-template.psd";
const templateSrc = (id: string, ext: string) => `/sprites/template/${id}.${ext}`;

type Draft = ParsedSprite & { urls: Map<string, string> };

/** PSD → animated paper doll. Parsed in the browser; only the trimmed parts are uploaded. */
export function SpritePanel({ character, onChange }: { character: AccountView; onChange: (c: AccountView) => void }) {
  const toast = useToast();
  const saved = character.sprite;
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"parse" | "save" | "delete" | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [debug, setDebug] = useState(false);
  const [over, setOver] = useState(false);
  /** slider value; null = use whatever the shown sprite has saved */
  const [heightEdit, setHeightEdit] = useState<number | null>(null);
  const savedHeight = saved?.heightCm ?? HEIGHT_DEFAULT;
  const shownHeight = draft?.rig.heightCm ?? savedHeight;
  const heightCm = heightEdit ?? shownHeight;
  const heightDirty = !draft && !!saved && heightEdit !== null && heightEdit !== savedHeight;
  useDirty("sprite", !!draft || heightDirty);

  const dropDraft = useCallback(() => {
    setDraft((d) => {
      d?.urls.forEach((u) => URL.revokeObjectURL(u));
      return null;
    });
  }, []);
  useEffect(() => dropDraft, [dropDraft]);

  const savedUrl = saved?.url;
  const savedSrc = useMemo(() => (savedUrl ? (id: string, ext: string) => `${savedUrl}/${id}.${ext}` : null), [savedUrl]);
  const draftSrc = useMemo(() => (draft ? (id: string) => draft.urls.get(id) ?? "" : null), [draft]);

  const pick = async (file: File) => {
    if (!/\.psd$/i.test(file.name)) return toast.err("รองรับเฉพาะไฟล์ .psd");
    setBusy("parse");
    dropDraft();
    try {
      const { parsePsdFile } = await import("@/lib/psd");
      const parsed = await parsePsdFile(file);
      const urls = new Map([...parsed.files].map(([id, b]) => [id, URL.createObjectURL(b as Blob)]));
      setDraft({ ...parsed, rig: { ...parsed.rig, heightCm: heightEdit ?? savedHeight }, urls });
      setHeightEdit(null);
      toast.info(`แยกได้ ${parsed.rig.parts.length} ชิ้นส่วน — ตรวจดูแล้วกดบันทึก`);
    } catch (err) {
      toast.err((err as Error).message);
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  };

  const saveDraft = async () => {
    if (!draft) return;
    setBusy("save");
    try {
      const fd = new FormData();
      fd.set("rig", JSON.stringify({ ...draft.rig, heightCm }));
      for (const p of draft.rig.parts) fd.set(`p_${p.id}`, draft.files.get(p.id) as Blob, `${p.id}.${p.ext}`);
      onChange((await api<{ character: AccountView }>("/api/me/sprite", { method: "POST", body: fd })).character);
      dropDraft();
      setHeightEdit(null);
      toast.ok("บันทึกสไปรต์แล้ว");
    } catch (err) {
      toast.err((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const saveHeight = async () => {
    setBusy("save");
    try {
      onChange((await api<{ character: AccountView }>("/api/me/sprite", jsonInit("PATCH", { heightCm }))).character);
      setHeightEdit(null);
      toast.ok(`บันทึกส่วนสูง ${heightCm} cm แล้ว`);
    } catch (err) {
      toast.err((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!confirm("ลบสไปรต์ตัวละคร? ห้องส่วนตัวจะกลับไปใช้ตัวละครเทมเพลต")) return;
    setBusy("delete");
    try {
      onChange((await api<{ character: AccountView }>("/api/me/sprite", { method: "DELETE" })).character);
      setHeightEdit(null);
      toast.ok("ลบสไปรต์แล้ว");
    } catch (err) {
      toast.err((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const state = draft ? "draft" : saved ? "saved" : "template";

  return (
    <div className="st-stack">
      <PanelHead
        en="SPRITE"
        title="สไปรต์ตัวละคร"
        desc="อัปโหลด .psd ที่แยก group ตามเทมเพลต ระบบประกอบร่างและขยับให้อัตโนมัติ · ไฟล์ถูกแยกในเครื่องคุณ อัปโหลดแค่ชิ้นส่วน"
      />

      <div className={`st-sprite${draft ? " no-tile" : ""}`}>
        {!draft && <TemplateTile compact={!!saved} />}
        <div
          className={`st-sprite-stage ${state}${over ? " over" : ""}`}
          onDragOver={(e) => {
            if (busy) return;
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const f = e.dataTransfer.files[0];
            if (f && !busy) void pick(f);
          }}
        >
          <span className={`st-stage-tag ${state}`}>{state === "draft" ? "PREVIEW · ยังไม่บันทึก" : state === "saved" ? "SAVED" : "TEMPLATE"}</span>
          {draft && draftSrc ? (
            <SpriteStage rig={draft.rig} src={draftSrc} label="ตัวอย่างสไปรต์" debug={debug} heightCm={heightCm} />
          ) : saved && savedSrc ? (
            <SpriteStage rig={saved} src={savedSrc} label={`สไปรต์ ${character.name}`} debug={debug} heightCm={heightCm} />
          ) : (
            <SpriteStage rig={TEMPLATE_RIG} src={templateSrc} label="สไปรต์ตัวอย่างจากเทมเพลต" debug={debug} heightCm={heightCm} />
          )}
          <p className="st-stage-hint">จับหัว ตัว หรือมือแล้วลากเล่นได้</p>
          {over && <div className="st-stage-drop">ปล่อยไฟล์ .psd เพื่อแยกชิ้นส่วน</div>}
          {busy === "parse" && (
            <div className="st-stage-drop">
              <Spinner label="กำลังแยกชิ้นส่วน" />
            </div>
          )}
        </div>

        <div className="st-stack st-sprite-side">
          <Card title="ส่วนสูง" aside={<b className="st-big-num">{heightCm}<small> cm</small></b>}>
            <input
              className="st-range"
              type="range"
              min={HEIGHT_MIN}
              max={HEIGHT_MAX}
              step={1}
              value={heightCm}
              aria-label="ส่วนสูงตัวละคร (เซนติเมตร)"
              onChange={(e) => setHeightEdit(Number(e.target.value))}
              style={{ "--fill": `${((heightCm - HEIGHT_MIN) / (HEIGHT_MAX - HEIGHT_MIN)) * 100}%` } as React.CSSProperties}
            />
            <div className="st-range-scale" aria-hidden="true">
              <span>{HEIGHT_MIN}</span>
              <span>{HEIGHT_MAX} cm</span>
            </div>
            <p className="st-note">ใช้เทียบขนาดกับห้องและเฟอร์นิเจอร์{!saved && !draft ? " · บันทึกพร้อมสไปรต์" : ""}</p>
          </Card>

          {draft ? (
            <Card title="ชิ้นส่วนที่ระบบเจอ" aside={<span className="st-count">{draft.mapping.length} ชิ้น</span>}>
              <ul className="st-map">
                {draft.mapping.map((m) => (
                  <li key={m.id}>
                    <span>{m.name}</span>
                    <code>{m.id}</code>
                  </li>
                ))}
              </ul>
              {draft.warnings.length > 0 && (
                <ul className="st-warn">
                  {draft.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
            </Card>
          ) : (
            <Card title={saved ? "เปลี่ยนสไปรต์" : "อัปโหลดสไปรต์ของคุณ"}>
              <p className="st-note">วาดทับในแต่ละ group ของเทมเพลต แล้วอัปโหลดกลับมา (หรือลากไฟล์มาวางบนตัวละครซ้ายมือ) — ชื่อ group ที่ระบบรู้จัก สะกดคล้าย ๆ ได้ ซ้าย/ขวาเดาจากตำแหน่ง:</p>
              <p className="st-groups">{TEMPLATE_GROUPS.join(" · ")}</p>
              <div className="st-row">
                <button type="button" className="st-btn primary" onClick={() => input.current?.click()} disabled={!!busy}>
                  {busy === "parse" ? <Spinner label="กำลังแยก" /> : saved ? "อัปโหลด PSD ใหม่" : "✦ อัปโหลด PSD"}
                </button>
                {saved && (
                  <button type="button" className="st-btn danger" onClick={remove} disabled={!!busy}>
                    {busy === "delete" ? <Spinner label="กำลังลบ" /> : "ลบสไปรต์"}
                  </button>
                )}
              </div>
            </Card>
          )}

          <label className="st-switch">
            <input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} />
            <i aria-hidden="true" />
            แสดงจุดหมุน (debug)
          </label>
        </div>
      </div>

      <input
        ref={input}
        type="file"
        accept=".psd,image/vnd.adobe.photoshop"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void pick(f);
        }}
      />

      <SaveBar
        show={!!draft}
        busy={busy === "save"}
        label="สไปรต์ใหม่ยังไม่ได้บันทึก"
        saveText="✦ บันทึกสไปรต์"
        onSave={saveDraft}
        onReset={dropDraft}
      />
      <SaveBar show={heightDirty} busy={busy === "save"} label={`ส่วนสูงเปลี่ยนเป็น ${heightCm} cm`} onSave={saveHeight} onReset={() => setHeightEdit(null)} />
    </div>
  );
}

/** The template PSD download — the starting point for every sprite, so it gets its own tile. */
function TemplateTile({ compact }: { compact: boolean }) {
  return (
    <a className={`st-template${compact ? " compact" : ""}`} href={TEMPLATE_PSD} download="fleshfall-sprite-template.psd">
      <span className="st-template-file" aria-hidden="true">
        <b>PSD</b>
        <i />
      </span>
      <span className="st-template-copy">
        <span className="st-kicker">STEP 01 · TEMPLATE</span>
        <span className="st-template-title">โหลดเทมเพลตสไปรต์</span>
        <span className="st-template-meta">fleshfall-sprite-template.psd · ~5 MB · {TEMPLATE_GROUPS.length} group พร้อมวาดทับ</span>
      </span>
      <span className="st-template-cta" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />
        </svg>
        ดาวน์โหลด
      </span>
    </a>
  );
}
