"use client";

import { useRef, useState } from "react";
import { api, jsonInit, MAX_DIM, shrink } from "@/lib/client";
import type { AccountView, ImageSlotDef } from "@/lib/types";
import { Card, PanelHead, Spinner, useToast } from "./ui";

const ACCEPT = ["image/png", "image/jpeg", "image/webp"];
const HINT: Record<string, string> = {
  portrait: "สี่เหลี่ยมจัตุรัส · ใช้เป็นรูปในโปรไฟล์ การ์ด Discord และห้อง RP",
  art: "ภาพเต็มตัวแนวตั้ง · โชว์บนการ์ด /profile ใน Discord",
  sheet: "Reference sheet แนวนอน · ด้านหน้า/หลัง ชุด อาวุธ",
  gallery: "ภาพเพิ่มเติม แฟนอาร์ต ฉากต่าง ๆ",
};

export function ImagesPanel({ character, slots, onChange }: { character: AccountView; slots: ImageSlotDef[]; onChange: (c: AccountView) => void }) {
  const total = character.images.length;
  const cap = slots.reduce((n, s) => n + s.max, 0);
  return (
    <div className="st-stack">
      <PanelHead
        en="GALLERY"
        title="ภาพตัวละคร"
        desc={<>ลากไฟล์มาวาง หรือกดเพื่อเลือก · webp / png / jpg ระบบย่อให้อัตโนมัติ · CW: เนื้อหารุนแรงได้ แต่ห้ามภาพผิดกฎหมาย</>}
      >
        <span className="st-pill">
          {total}/{cap} ภาพ
        </span>
      </PanelHead>
      <div className="st-slots">
        {slots.map((s) => (
          <Slot key={s.id} slot={s} images={character.images.filter((i) => i.slot === s.id).sort((a, b) => a.at - b.at)} onChange={onChange} />
        ))}
      </div>
    </div>
  );
}

function Slot({ slot, images, onChange }: { slot: ImageSlotDef; images: AccountView["images"]; onChange: (c: AccountView) => void }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null); // "upload" | image key being deleted
  const [over, setOver] = useState(false);
  const single = slot.max === 1;
  const canAdd = single || images.length < slot.max;

  const upload = async (files: File[]) => {
    const list = files.filter((f) => ACCEPT.includes(f.type));
    if (!list.length) return toast.err("รองรับเฉพาะไฟล์ png / jpg / webp");
    const room = single ? 1 : slot.max - images.length;
    if (room <= 0) return toast.err(`${slot.name} เต็มแล้ว (${slot.max} ภาพ)`);
    setBusy("upload");
    try {
      let last: AccountView | null = null;
      for (const file of list.slice(0, room)) {
        const blob = await shrink(file, MAX_DIM[slot.id]);
        const fd = new FormData();
        fd.set("slot", slot.id);
        fd.set("file", blob, `upload.${blob.type === "image/webp" ? "webp" : "jpg"}`);
        last = (await api<{ character: AccountView }>("/api/me/images", { method: "POST", body: fd })).character;
        onChange(last);
      }
      if (list.length > room) toast.info(`อัปโหลด ${room} ภาพ — ช่องนี้เก็บได้สูงสุด ${slot.max}`);
      else toast.ok(single && images.length ? `เปลี่ยน${slot.name}แล้ว` : `เพิ่ม${slot.name}แล้ว`);
    } catch (err) {
      toast.err((err as Error).message);
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  };

  const remove = async (key: string) => {
    if (!confirm(`ลบภาพนี้ออกจาก${slot.name}?`)) return;
    setBusy(key);
    try {
      onChange((await api<{ character: AccountView }>("/api/me/images", jsonInit("DELETE", { key }))).character);
      toast.ok("ลบภาพแล้ว");
    } catch (err) {
      toast.err((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const drop = {
    onDragOver: (e: React.DragEvent) => {
      if (!canAdd || busy) return;
      e.preventDefault();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(false);
      if (!canAdd || busy) return;
      void upload([...e.dataTransfer.files]);
    },
  };

  return (
    <Card
      className={`st-slot slot-${slot.id}${over ? " over" : ""}`}
      title={slot.name}
      aside={slot.max > 1 ? <span className="st-count">{images.length}/{slot.max}</span> : images.length ? <span className="st-ok">✓ มีภาพแล้ว</span> : <span className="st-count">ว่าง</span>}
    >
      <p className="st-slot-hint">{HINT[slot.id] ?? slot.desc}</p>
      <div className="st-thumbs" {...drop}>
        {images.map((img) => (
          <figure key={img.key} className={busy === img.key ? "busy" : undefined}>
            <a href={img.url} target="_blank" rel="noreferrer" aria-label={`เปิด${slot.name}ขนาดเต็ม`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={slot.name} loading="lazy" />
            </a>
            <div className="st-thumb-tools">
              {single && (
                <button type="button" className="st-icon-btn" title="เปลี่ยนภาพ" aria-label="เปลี่ยนภาพ" disabled={!!busy} onClick={() => input.current?.click()}>
                  ⟳
                </button>
              )}
              <button type="button" className="st-icon-btn danger" title="ลบภาพ" aria-label="ลบภาพ" disabled={!!busy} onClick={() => remove(img.key)}>
                ✕
              </button>
            </div>
            {busy === img.key && (
              <span className="st-thumb-busy">
                <Spinner />
              </span>
            )}
          </figure>
        ))}
        {canAdd && !(single && images.length) && (
          <button type="button" className="st-drop" disabled={!!busy} onClick={() => input.current?.click()}>
            {busy === "upload" ? (
              <Spinner label="กำลังอัปโหลด" />
            ) : (
              <>
                <span className="st-drop-plus" aria-hidden="true">+</span>
                <span>{over ? "ปล่อยเพื่ออัปโหลด" : "ลากภาพมาวาง หรือกดเลือก"}</span>
              </>
            )}
          </button>
        )}
        {single && images.length > 0 && busy === "upload" && (
          <span className="st-thumb-busy whole">
            <Spinner label="กำลังอัปโหลด" />
          </span>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={ACCEPT.join(",")}
        multiple={!single}
        hidden
        onChange={(e) => {
          const f = [...(e.target.files ?? [])];
          if (f.length) void upload(f);
        }}
      />
    </Card>
  );
}
