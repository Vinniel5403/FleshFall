"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { bodyMatrix, grab, hitPart, newPuppet, onTopParts, puppetPose, release, squinting, step } from "@/lib/puppet";
import { buildSkeleton, drawRig, HEIGHT_DEFAULT, mul, type M, type Rig } from "@/lib/rig";
import { furniture, furnitureSrc, FURNITURE, roomBg, template, type PlacedItem, type RoomLayout } from "@/lib/room";

export interface RoomEditHooks {
  selected: number | null;
  onSelect: (i: number | null) => void;
  /** item i dragged to (x, y) — fractions of the room */
  onMove: (i: number, x: number, y: number) => void;
}

interface Props {
  layout: RoomLayout;
  rig: Rig;
  src: (id: string, ext: string) => string;
  label?: string;
  /** editor mode: furniture can be picked + dragged */
  edit?: RoomEditHooks;
}

const loadImg = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(url));
    img.src = url;
  });

/** Where the character first stands (fraction of the room width) — just right of the door. */
const START_X = 0.2;
/** Drag near the left/right edge of a zoomed-in room → the camera pans (fraction of the view width). */
const EDGE = 0.1;

/**
 * A private room: side-view background, furniture stickers, and the player's paper doll standing on the floor.
 * Grab the doll (head / torso / hips / hands, same physics as the sprite preview) and drop or throw it anywhere —
 * it stays where it lands. Narrow screens show part of the room; the camera follows the doll.
 */
export function RoomStage({ layout, rig, src, label, edit }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const tpl = template(layout.template);
  const [bg, setBg] = useState<HTMLImageElement | null>(null);
  const [sprite, setSprite] = useState<Map<string, HTMLImageElement> | null>(null);
  const stickers = useRef(new Map<string, HTMLImageElement>());
  const [failed, setFailed] = useState(false);
  const bones = useMemo(() => buildSkeleton(rig), [rig]);
  const extent = useMemo(() => {
    const top = Math.min(...rig.parts.map((p) => p.y));
    const bottom = Math.max(...rig.parts.map((p) => p.y + p.h));
    const left = Math.min(...rig.parts.map((p) => p.x));
    const right = Math.max(...rig.parts.map((p) => p.x + p.w));
    return { bottom, cx: (left + right) / 2, h: Math.max(1, bottom - top) };
  }, [rig]);

  // latest props for the animation loop (no restart on every drag)
  const live = useRef({ layout, edit });
  live.current = { layout, edit };

  useEffect(() => {
    if (!tpl) return;
    let on = true;
    setBg(null);
    loadImg(roomBg(tpl)).then((i) => on && setBg(i), () => on && setFailed(true));
    return () => void (on = false);
  }, [tpl]);

  useEffect(() => {
    let on = true;
    setSprite(null);
    Promise.all(rig.parts.map((p) => loadImg(src(p.id, p.ext)).then((i) => [p.id, i] as const))).then(
      (pairs) => on && setSprite(new Map(pairs)),
      () => on && setFailed(true),
    );
    return () => void (on = false);
  }, [rig, src]);

  // furniture images: load whatever the layout (or the editor palette) needs, once each
  const wanted = edit ? FURNITURE.map((f) => f.id).join() : layout.items.map((i) => i.id).join();
  useEffect(() => {
    for (const id of new Set(wanted.split(",").filter(Boolean))) {
      const f = furniture(id);
      if (!f || stickers.current.has(id)) continue;
      loadImg(furnitureSrc(f)).then((img) => stickers.current.set(id, img), () => {});
    }
  }, [wanted]);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv || !bg || !sprite || !tpl) return;
    const ctx = cv.getContext("2d")!;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const floorY = (tpl.floorTop + tpl.floorBottom) / 2;
    const p = newPuppet();
    const pose = puppetPose(p);
    let item: { i: number; dx: number; dy: number } | null = null;
    let raf = 0;
    const start = performance.now();
    let last = start;
    let cam: number | null = null; // camera left edge in canvas px (room scrolled by −cam)
    /** per-frame geometry: room → canvas, rig → canvas */
    let geo = { offX: 0, roomW: 1, H: 1, W: 1, k: 1, ox: 0, oy: 0 };
    let pointerX = 0, pointerY = 0; // last pointer position in canvas px

    /** room width in rig px — character scale is fixed against the room, so this doesn't depend on canvas size */
    const roomRig = (tpl.w / tpl.h) * extent.h * (tpl.heightCm / (rig.heightCm ?? HEIGHT_DEFAULT));
    const anchorRig = START_X * roomRig;
    /** p.x walls: keep the body centre inside the room */
    const bounds: [number, number] = [0.03 * roomRig - anchorRig, 0.97 * roomRig - anchorRig];

    const canvasXY = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      const dpr = cv.width / r.width;
      return [(e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr] as const;
    };
    const toRoom = (cx: number, cy: number) => [(cx - geo.offX) / geo.roomW, cy / geo.H] as const;
    const toRig = (cx: number, cy: number) => [(cx - geo.ox) / geo.k, (cy - geo.oy) / geo.k] as const;
    /** pointer target clamped to the visible room (rig coords) */
    const clampRig = (cx: number, cy: number) => {
      const l = Math.max(0, geo.offX), r = Math.min(geo.W, geo.offX + geo.roomW);
      return toRig(Math.max(l, Math.min(r, cx)), Math.max(0, Math.min(geo.H, cy)));
    };

    /** topmost furniture under room point (x, y); front layer first, last drawn wins */
    const hitItem = (x: number, y: number, front: boolean) => {
      const items = live.current.layout.items;
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i], f = furniture(it.id);
        if (!!it.front === front && f && x >= it.x && x <= it.x + f.w && y >= it.y && y <= it.y + f.h) return i;
      }
      return null;
    };

    const down = (e: PointerEvent) => {
      const [cx, cy] = canvasXY(e);
      (pointerX = cx), (pointerY = cy);
      const ed = live.current.edit;
      const [rx, ry] = toRoom(cx, cy);
      const pickItem = (i: number | null) => {
        if (i === null || !ed) return false;
        ed.onSelect(i);
        const it = live.current.layout.items[i];
        item = { i, dx: rx - it.x, dy: ry - it.y };
        return true;
      };
      // draw order, top first: front furniture → doll → back furniture
      let handled = ed ? pickItem(hitItem(rx, ry, true)) : false;
      if (!handled && !still) {
        const [x, y] = toRig(cx, cy);
        const part = hitPart(p, bones, x, y);
        if (part) {
          grab(p, x, y, part, bones);
          handled = true;
        }
      }
      if (!handled && ed) handled = pickItem(hitItem(rx, ry, false));
      if (!handled) return ed?.onSelect(null);
      e.preventDefault();
      cv.setPointerCapture(e.pointerId);
      cv.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      const [cx, cy] = canvasXY(e);
      (pointerX = cx), (pointerY = cy);
      const ed = live.current.edit;
      if (p.grabbed) {
        [p.tx, p.ty] = clampRig(cx, cy);
        return;
      }
      const [rx, ry] = toRoom(cx, cy);
      if (item && ed) {
        ed.onMove(item.i, Math.max(-0.2, Math.min(1.1, rx - item.dx)), Math.max(-0.2, Math.min(1.05, ry - item.dy)));
        return;
      }
      const [x, y] = toRig(cx, cy);
      const over = (!still && hitPart(p, bones, x, y)) || (ed && (hitItem(rx, ry, true) ?? hitItem(rx, ry, false)) !== null);
      cv.style.cursor = over ? "grab" : "";
    };
    const up = (e: PointerEvent) => {
      if (!p.grabbed && !item) return;
      if (p.grabbed) release(p);
      item = null;
      if (cv.hasPointerCapture(e.pointerId)) cv.releasePointerCapture(e.pointerId);
      cv.style.cursor = "grab";
    };
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);

    const drawItem = (it: PlacedItem, sel: boolean) => {
      const f = furniture(it.id);
      const img = f && stickers.current.get(it.id);
      if (!f) return;
      const x = geo.offX + it.x * geo.roomW, y = it.y * geo.H, w = f.w * geo.roomW, h = f.h * geo.H;
      if (img) {
        ctx.save();
        if (it.flip) ctx.setTransform(-1, 0, 0, 1, 2 * x + w, 0);
        ctx.drawImage(img, x, y, w, h);
        ctx.restore();
      }
      if (sel) {
        ctx.save();
        ctx.strokeStyle = "#e01e37";
        ctx.lineWidth = 2 * Math.min(window.devicePixelRatio || 1, 2);
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
        ctx.restore();
      }
    };

    const frame = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
      if (cv.width !== W || cv.height !== H) (cv.width = W), (cv.height = H);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - start) / 1000;

      if (!still) step(p, bones, dt, { w: rig.width, h: rig.height }, { home: false, bounds });

      // --- camera: follows the doll; frozen while it's held (else the room slides under the pointer), edge-pans instead ---
      const roomW = tpl.w * (H / tpl.h);
      const k = roomW / roomRig;
      const dollX = (anchorRig + p.x) * k; // doll centre in room px
      let offX: number;
      if (roomW <= W) {
        offX = (W - roomW) / 2;
        cam = null;
      } else {
        const want = Math.max(0, Math.min(roomW - W, dollX - W / 2));
        if (cam === null) cam = want;
        else if (p.grabbed) {
          const edge = W * EDGE;
          const pan = pointerX < edge ? -(edge - pointerX) / edge : pointerX > W - edge ? (pointerX - (W - edge)) / edge : 0;
          cam = Math.max(0, Math.min(roomW - W, cam + pan * W * 0.9 * dt));
        } else cam += (want - cam) * Math.min(1, dt * 4);
        offX = -cam;
      }
      const oy = floorY * H - extent.bottom * k;
      geo = { offX, roomW, H, W, k, ox: offX + (anchorRig - extent.cx) * k, oy }; // rig x = extent.cx sits on the anchor
      if (p.grabbed) [p.tx, p.ty] = clampRig(pointerX, pointerY); // camera may have moved: keep the target under the pointer

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#0b0507";
      ctx.fillRect(0, 0, W, H);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bg, offX, 0, roomW, H);

      const { layout: lay, edit: ed } = live.current;
      lay.items.forEach((it, i) => !it.front && drawItem(it, ed?.selected === i));

      // --- doll: real height against the room, feet on the floor line at rest ---
      const lift = Math.max(0, -p.y) * k; // shadow shrinks as it's lifted
      const sx = geo.ox + (extent.cx + p.x) * k;
      const shadowW = extent.h * k * 0.16 * Math.max(0.35, 1 - lift / (extent.h * k));
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,.22)";
      ctx.beginPath();
      ctx.ellipse(sx, floorY * H, shadowW, shadowW * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const view: M = [k, 0, 0, k, geo.ox, oy];
      drawRig(ctx, rig, bones, sprite, t, mul(view, bodyMatrix(p)), !still, { pose, eyesShut: squinting(p), onTop: onTopParts(p, bones) });

      lay.items.forEach((it, i) => it.front && drawItem(it, ed?.selected === i));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      cv.removeEventListener("pointerdown", down);
      cv.removeEventListener("pointermove", move);
      cv.removeEventListener("pointerup", up);
      cv.removeEventListener("pointercancel", up);
    };
  }, [bg, sprite, tpl, rig, bones, extent]);

  if (!tpl) return <p className="sub">ยังไม่มีเทมเพลตห้อง</p>;
  return (
    <div className="room-stage" style={{ aspectRatio: `${tpl.w} / ${tpl.h}` }}>
      <canvas ref={canvas} role="img" aria-label={label ?? `ห้อง ${tpl.name}`} />
      {(!bg || !sprite) && <span className="sprite-note">{failed ? "โหลดห้องไม่สำเร็จ" : "กำลังโหลด…"}</span>}
      <span className="room-hint">จับตัวละครลากหรือโยนได้</span>
    </div>
  );
}
