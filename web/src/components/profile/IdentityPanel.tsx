"use client";

import { useState } from "react";
import { api, jsonInit } from "@/lib/client";
import { doorVar } from "@/lib/md";
import { BIO_MAX, ownProfilePath, type AccountView } from "@/lib/types";
import type { ForgeIcon, ForgeRole } from "../CharacterForge";
import { Card, PanelHead, SaveBar, Spinner, useCountdown, useDirty, useToast } from "./ui";

const NAME_RE = /^[\p{L}\p{M}\p{N} ._'-]{2,32}$/u;

export function IdentityPanel({
  character,
  role,
  icon,
  onChange,
}: {
  character: AccountView;
  role?: ForgeRole;
  icon?: ForgeIcon;
  onChange: (c: AccountView) => void;
}) {
  return (
    <div className="st-stack">
      <PanelHead en="IDENTITY" title="ข้อมูลตัวละคร" desc="ชื่อและบันทึกตัวละครที่ทุกคนเห็นในหน้าโปรไฟล์ และในคำสั่ง /profile บน Discord" />
      <NameCard character={character} onChange={onChange} />
      <div className="st-bond">
        <BondCard label="บทบาท" emoji={role?.emoji ?? "◆"} name={role?.name ?? character.role} sub={role?.short} />
        <BondCard
          label="เทพที่ศรัทธา"
          emoji={icon?.emoji ?? "◆"}
          name={icon?.name ?? character.icon}
          sub={icon ? `${icon.doorName} · ${icon.concept}` : undefined}
          door={icon?.door}
        />
      </div>
      <BioCard character={character} onChange={onChange} />
    </div>
  );
}

function NameCard({ character, onChange }: { character: AccountView; onChange: (c: AccountView) => void }) {
  const toast = useToast();
  const [name, setName] = useState(character.name);
  const [busy, setBusy] = useState(false);
  const wait = useCountdown(character.renameAt);
  const trimmed = name.trim();
  const dirty = trimmed !== character.name;
  const valid = NAME_RE.test(trimmed);
  useDirty("name", dirty);

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!dirty || !valid || wait) return;
    setBusy(true);
    try {
      const r = await api<{ character: AccountView }>("/api/me/character", jsonInit("PATCH", { name: trimmed }));
      onChange(r.character);
      setName(r.character.name);
      toast.ok(`เปลี่ยนชื่อเป็น “${r.character.name}” แล้ว`);
    } catch (err) {
      toast.err((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="ชื่อตัวละคร" aside={wait ? <span className="st-count">เปลี่ยนได้อีกครั้งใน {wait}</span> : <span className="st-count">เปลี่ยนได้ชั่วโมงละครั้ง</span>}>
      <form className="st-field" onSubmit={save}>
        <div className={`st-input${dirty && !valid ? " bad" : ""}`}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            aria-label="ชื่อตัวละคร"
            aria-invalid={dirty && !valid}
            autoComplete="off"
            spellCheck={false}
            disabled={!!wait}
          />
          <span className="st-input-count">{trimmed.length}/32</span>
        </div>
        <button type="submit" className="st-btn primary" disabled={busy || !dirty || !valid || !!wait}>
          {busy ? <Spinner label="กำลังบันทึก" /> : "เปลี่ยนชื่อ"}
        </button>
      </form>
      <p className={`st-note${dirty && !valid ? " bad" : ""}`}>
        2–32 ตัวอักษร · ตัวอักษร ตัวเลข เว้นวรรค และ . _ &apos; - · ห้อง RP ใน Discord จะโพสต์ด้วยชื่อนี้ (ชื่อเล่นใน Discord ไม่เปลี่ยน)
      </p>
    </Card>
  );
}

function BondCard({ label, emoji, name, sub, door }: { label: string; emoji: string; name: string; sub?: string; door?: string }) {
  return (
    <div className="st-bond-card" style={door ? ({ "--door": doorVar(door) } as React.CSSProperties) : undefined}>
      <span className="st-bond-emoji" aria-hidden="true">{emoji}</span>
      <div>
        <p className="st-bond-label">
          {label} <span title="ผูกกับตัวละครถาวร">🔒</span>
        </p>
        <p className="st-bond-name">{name}</p>
        {sub && <p className="st-bond-sub">{sub}</p>}
      </div>
    </div>
  );
}

function BioCard({ character, onChange }: { character: AccountView; onChange: (c: AccountView) => void }) {
  const toast = useToast();
  const saved = character.bio ?? "";
  const [text, setText] = useState(saved);
  const [busy, setBusy] = useState(false);
  const dirty = text.trim() !== saved;
  useDirty("bio", dirty);
  const left = BIO_MAX - text.length;

  const save = async () => {
    setBusy(true);
    try {
      const r = await api<{ character: AccountView }>("/api/me/bio", jsonInit("PUT", { bio: text }));
      onChange(r.character);
      setText(r.character.bio ?? "");
      toast.ok("บันทึกตัวละครแล้ว");
    } catch (err) {
      toast.err((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="บันทึกตัวละคร"
      aside={
        ownProfilePath(character) ? (
          <a className="st-link" href={ownProfilePath(character)!} target="_blank" rel="noreferrer">
            ดูในโปรไฟล์สาธารณะ ↗
          </a>
        ) : undefined
      }
    >
      <div className="st-textarea">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
              e.preventDefault();
              if (dirty && !busy) void save();
            }
          }}
          maxLength={BIO_MAX}
          rows={10}
          placeholder="ประวัติ นิสัย ความลับ หรือโน้ตอะไรก็ได้ — เช่น อดีตพ่อครัวจากปารีส ตกลงรอยแยกมิติระหว่างกะดึก…"
          aria-label="บันทึกตัวละคร"
        />
        <div className="st-textarea-bar">
          <span className={left < 100 ? "warn" : undefined}>
            {text.length.toLocaleString()}/{BIO_MAX.toLocaleString()}
          </span>
          <span className="st-kbd">Ctrl + S บันทึก</span>
        </div>
      </div>
      <SaveBar show={dirty} busy={busy} label="บันทึกตัวละครยังไม่ได้บันทึก" onSave={save} onReset={() => setText(saved)} />
    </Card>
  );
}
