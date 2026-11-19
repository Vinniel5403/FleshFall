"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import templateRig from "@/data/sprite-template.json";
import { defaultRoom, furniture, furnitureSrc, FURNITURE, placedCounts, placeNew, ROOM_MAX_ITEMS, ROOM_TEMPLATES, type RoomLayout } from "@/lib/room";
import type { Rig } from "@/lib/rig";
import { ownProfilePath, type AccountView } from "@/lib/types";
import { RoomStage } from "./RoomStage";
import { api, jsonInit } from "@/lib/client";
import { PanelHead, SaveBar, useDirty, useToast } from "./profile/ui";

const TEMPLATE_RIG = templateRig as Rig;
const templateSrc = (id: string, ext: string) => `/sprites/template/${id}.${ext}`;

const same = (a: RoomLayout, b: RoomLayout) => JSON.stringify([a.template, a.items]) === JSON.stringify([b.template, b.items]);

/** /profile panel: decorate the private room (pick a template, add / drag / flip / layer furniture) and walk around in it. */
export function RoomEditor(props: { character: AccountView; onChange: (c: AccountView) => void }) {
  const toast = useToast();
  const saved = useMemo<RoomLayout>(() => props.character.room ?? defaultRoom(), [props.character.room]);
  const [room, setRoom] = useState<RoomLayout>(saved);
  const [sel, setSel] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const dirty = !same(room, saved);
  useDirty("room", dirty);

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

  const placed = useMemo(() => placedCounts(room.items), [room.items]);
  // furniture is a game item: owned = spare in the inventory + pieces already in the saved room (those left the inventory)
  const spare = props.character.furniture;
  const savedPlaced = useMemo(() => placedCounts(saved.items), [saved]);
  const owned = (id: string) => (spare ? (spare[id] ?? 0) + (savedPlaced.get(id) ?? 0) : Infinity);
  const patch = (fn: (items: RoomLayout["items"]) => RoomLayout["items"]) => setRoom((r) => ({ ...r, items: fn(r.items) }));
  const add = (id: string) => {
    const f = furniture(id);
    if (!f || room.items.length >= ROOM_MAX_ITEMS || (placed.get(id) ?? 0) >= owned(id)) return;
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
    try {
      const data = await api<{ character: AccountView }>("/api/me/room", jsonInit("PUT", { room: { template: room.template, items: room.items } }));
      props.onChange(data.character);
      setSel(null);
      toast.ok("บันทึกห้องแล้ว");
    } catch (err) {
      toast.err((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const picked = sel !== null ? room.items[sel] : null;

  // Delete / Backspace removes the selected piece (ignored while typing in a field)
  useEffect(() => {
    if (sel === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (!box.current?.offsetParent) return; // panel hidden (another studio tab is open)
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        setRoom((r) => ({ ...r, items: r.items.filter((_, n) => n !== sel) }));
        setSel(null);
      } else if (e.key === "Escape") setSel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel]);

  return (
    <div className="st-stack">
      <PanelHead
        en="ROOM"
        title="ห้องส่วนตัว"
        desc="แต่งห้องด้วยของตกแต่ง ลากวางได้ตามใจ แล้วจับตัวละครลากหรือโยนเล่นได้ · ทุกคนเห็นห้องนี้ในหน้าโปรไฟล์"
      >
        {ownProfilePath(props.character) && (
          <a className="st-btn ghost" href={`${ownProfilePath(props.character)}#room`} target="_blank" rel="noreferrer">
            ดูในโปรไฟล์ ↗
          </a>
        )}
      </PanelHead>

      <div className="room-edit" ref={box}>
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

          <div className="room-palette" role="list" aria-label="ของตกแต่ง — กดเพื่อเพิ่มลงห้อง">
            {FURNITURE.map((f) => {
              const used = placed.get(f.id) ?? 0;
              const have = owned(f.id);
              const out = used >= have;
              return (
                <button key={f.id} type="button" role="listitem" onClick={() => add(f.id)} disabled={out || room.items.length >= ROOM_MAX_ITEMS} title={have === 0 ? `ยังไม่มี ${f.name} — ซื้อได้ที่ร้านใน Rouge Land หรือตลาดผู้เล่น` : out ? `${f.name} — วางครบทุกชิ้นที่มีแล้ว` : `เพิ่ม ${f.name}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={furnitureSrc(f)} alt="" loading="lazy" />
                  <span>{f.name}</span>
                  {Number.isFinite(have) && (
                    <span className={`room-stock${used > have ? " over" : ""}`}>{have === 0 ? "ยังไม่มี" : `วางแล้ว ${used}/${have}`}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="room-actions">
            {picked ? (
              <>
                <span className="sub room-picked">◆ {furniture(picked.id)?.name ?? picked.id}</span>
                <button type="button" className="st-btn ghost sm" onClick={() => toggle("flip")}>↔ กลับด้าน</button>
                <button type="button" className="st-btn ghost sm" onClick={() => toggle("front")}>{picked.front ? "ไว้หลังตัวละคร" : "ไว้หน้าตัวละคร"}</button>
                <button type="button" className="st-btn ghost sm" onClick={() => reorder(1)} disabled={sel === room.items.length - 1}>ขึ้นบน</button>
                <button type="button" className="st-btn ghost sm" onClick={() => reorder(-1)} disabled={sel === 0}>ลงล่าง</button>
                <button type="button" className="st-btn danger sm" onClick={remove}>ลบ</button>
              </>
            ) : (
              <span className="sub">คลิกของในห้องเพื่อเลือก ลากเพื่อย้าย · Delete ลบ · {room.items.length}/{ROOM_MAX_ITEMS} ชิ้น</span>
            )}
          </div>

        </div>
      </div>

      <SaveBar show={dirty} busy={busy} label="ห้องมีการแก้ไขที่ยังไม่บันทึก" saveText="บันทึกห้อง" onSave={save} onReset={() => (setRoom(saved), setSel(null))} />
    </div>
  );
}
