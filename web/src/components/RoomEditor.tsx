"use client";

import { useMemo, useState } from "react";
import templateRig from "@/data/sprite-template.json";
import { defaultRoom, furniture, furnitureSrc, FURNITURE, placeNew, ROOM_MAX_ITEMS, ROOM_TEMPLATES, type RoomLayout } from "@/lib/room";
import type { Rig } from "@/lib/rig";
import type { AccountView } from "@/lib/types";
import { RoomStage } from "./RoomStage";

const TEMPLATE_RIG = templateRig as Rig;
const templateSrc = (id: string, ext: string) => `/sprites/template/${id}.${ext}`;

const same = (a: RoomLayout, b: RoomLayout) => JSON.stringify([a.template, a.items]) === JSON.stringify([b.template, b.items]);

/** /create step: decorate the private room (pick a template, add / drag / flip / layer furniture) and walk around in it. */
export function RoomEditor(props: { character: AccountView; onChange: (c: AccountView) => void; onError: (e: string | null) => void }) {
  const saved = useMemo<RoomLayout>(() => props.character.room ?? defaultRoom(), [props.character.room]);
  const [room, setRoom] = useState<RoomLayout>(saved);
  const [sel, setSel] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = !same(room, saved);

  const sprite = props.character.sprite;
  const spriteUrl = sprite?.url;
  const src = useMemo(() => (spriteUrl ? (id: string, ext: string) => `${spriteUrl}/${id}.${ext}` : templateSrc), [spriteUrl]);
  const rig = sprite && spriteUrl ? sprite : TEMPLATE_RIG;

  const edit = useMemo(
    () => ({
      selected: sel,
      onSelect: setSel,
      onMove: (i: number, x: number, y: number) =>
        setRoom((r) => ({ ...r, items: r.items.map((it, n) => (n === i ? { ...it, x, y } : it)) })),
    }),
    [sel],
  );

  const patch = (fn: (items: RoomLayout["items"]) => RoomLayout["items"]) => setRoom((r) => ({ ...r, items: fn(r.items) }));
  const add = (id: string) => {
    const f = furniture(id);
    if (!f || room.items.length >= ROOM_MAX_ITEMS) return;
    patch((items) => [...items, placeNew(f)]);
    setSel(room.items.length);
  };
  const remove = () => {
    if (sel === null) return;
    patch((items) => items.filter((_, n) => n !== sel));
    setSel(null);
  };
  const toggle = (key: "flip" | "front") => sel !== null && patch((items) => items.map((it, n) => (n === sel ? { ...it, [key]: !it[key] } : it)));
  const reorder = (dir: 1 | -1) => {
    if (sel === null) return;
    const to = sel + dir;
    if (to < 0 || to >= room.items.length) return;
    patch((items) => {
      const next = [...items];
      [next[sel], next[to]] = [next[to], next[sel]];
      return next;
    });
    setSel(to);
  };

  const save = async () => {
    setBusy(true);
    props.onError(null);
    try {
      const res = await fetch("/api/me/room", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ room: { template: room.template, items: room.items } }),
      });
      const data = (await res.json().catch(() => ({}))) as { character?: AccountView; error?: string };
      if (!res.ok || !data.character) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
      props.onChange(data.character);
    } catch (err) {
      props.onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const picked = sel !== null ? room.items[sel] : null;

  return (
    <section className="step">
      <header>
        <span className="step-no">08</span>
        <div>
          <h3>ห้องส่วนตัว</h3>
          <p className="sub">
            แต่งห้องด้วยของตกแต่ง ลากวางได้ตามใจ แล้วจับตัวละครลากไปวางหรือโยนเล่นได้ · ทุกคนเห็นห้องนี้ในหน้าโปรไฟล์
          </p>
        </div>
      </header>

      <div className="room-edit">
        <RoomStage layout={room} rig={rig} src={src} label={`ห้องของ ${props.character.name}`} edit={edit} />

        <div className="room-tools">
          {ROOM_TEMPLATES.length > 1 && (
            <label className="room-tpl">
              ห้อง
              <select value={room.template} onChange={(e) => setRoom((r) => ({ ...r, template: e.target.value }))}>
                {ROOM_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
          )}

          <div className="room-palette" role="list" aria-label="ของตกแต่ง">
            {FURNITURE.map((f) => (
              <button key={f.id} type="button" role="listitem" onClick={() => add(f.id)} disabled={room.items.length >= ROOM_MAX_ITEMS} title={`เพิ่ม ${f.name}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={furnitureSrc(f)} alt="" loading="lazy" />
                <span>{f.name}</span>
              </button>
            ))}
          </div>

          <div className="room-actions">
            {picked ? (
              <>
                <span className="sub">{furniture(picked.id)?.name ?? picked.id}</span>
                <button type="button" className="ghost" onClick={() => toggle("flip")}>↔ กลับด้าน</button>
                <button type="button" className="ghost" onClick={() => toggle("front")}>{picked.front ? "ไว้หลังตัวละคร" : "ไว้หน้าตัวละคร"}</button>
                <button type="button" className="ghost" onClick={() => reorder(1)} disabled={sel === room.items.length - 1}>ขึ้นบน</button>
                <button type="button" className="ghost" onClick={() => reorder(-1)} disabled={sel === 0}>ลงล่าง</button>
                <button type="button" className="ghost danger" onClick={remove}>ลบ</button>
              </>
            ) : (
              <span className="sub">คลิกของในห้องเพื่อเลือก ลากเพื่อย้าย · {room.items.length}/{ROOM_MAX_ITEMS} ชิ้น</span>
            )}
          </div>

          <div className="room-save">
            {props.character.slug && (
              <a className="ghost" href={`/players/${props.character.slug}#room`} target="_blank" rel="noreferrer">
                ดูห้องในโปรไฟล์ ↗
              </a>
            )}
            {dirty && (
              <button type="button" className="ghost" onClick={() => (setRoom(saved), setSel(null))} disabled={busy}>
                ยกเลิก
              </button>
            )}
            <button type="button" className="cta" onClick={save} disabled={busy || !dirty}>
              {busy ? "กำลังบันทึก…" : dirty ? "บันทึกห้อง" : "บันทึกแล้ว ✓"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
