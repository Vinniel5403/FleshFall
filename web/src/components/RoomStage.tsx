"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apply, bodyMatrix, grab, hitPart, invert, mood, newPuppet, onTopParts, puppetPose, release, squinting, step } from "@/lib/puppet";
import { buildSkeleton, drawRig, HEIGHT_DEFAULT, mul, type M, type Rig } from "@/lib/rig";
import { furniture, furnitureSrc, FURNITURE, roomBg, template, type PlacedItem, type RoomLayout } from "@/lib/room";
import { guardGestures, Mips, watchVisible } from "@/lib/stage";
import { flipMatrix, newWander, stepWander, walkBob, walkPose } from "@/lib/wander";

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
/** Camera follow rate (1/s): locked on the doll with a little lag. While held, holding it off-centre scrolls the room. */
const CAM_FOLLOW = 3;
/** Where the ceiling is (fraction of the room height from the top) — a thrown doll bounces off it. */
const CEILING = 0.02;
/** Mips id of the room background (furniture ids never start with #). */
const BG = "#bg";

/**
 * A private room: side-view background, furniture stickers, and the player's paper doll standing on the floor.
 * Grab the doll (head / torso / hips / hands, same physics as the sprite preview) and drop or throw it anywhere —
 * it stays where it lands. Narrow screens show part of the room; the camera follows the doll.
 * ⛶ preview = fullscreen overlay: room height = viewport height, side-scrolling.
 */
export function RoomStage({ layout, rig, src, label, edit }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const tpl = template(layout.template);
  const [bg, setBg] = useState<HTMLImageElement | null>(null);
  const [sprite, setSprite] = useState<Map<string, HTMLImageElement> | null>(null);
  const stickers = useRef(new Map<string, HTMLImageElement>());
  const [failed, setFailed] = useState(false);
  const [full, setFull] = useState(false);

  // fullscreen preview: Esc closes, page doesn't scroll underneath
  useEffect(() => {
    if (!full) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", key);
    };
  }, [full]);
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
  const wanted = (edit ? FURNITURE.map((f) => f.id) : layout.items.map((i) => i.id)).map((id) => `${id}=${furniture(id) ? furnitureSrc(furniture(id)!) : ""}`).join();
  useEffect(() => {
    for (const id of new Set(wanted.split(",").filter(Boolean).map((w) => w.split("=")[0]!))) {
      const f = furniture(id);
      // same id, new art (uploaded on the admin page) → load again
      if (!f || stickers.current.get(id)?.src === new URL(furnitureSrc(f), location.href).href) continue;
      loadImg(furnitureSrc(f)).then((img) => stickers.current.set(id, img), () => {});
    }
  }, [wanted]);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv || !bg || !sprite || !tpl) return;
    const ctx = cv.getContext("2d", { alpha: false })!; // every frame paints the whole canvas
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const floorY = (tpl.floorTop + tpl.floorBottom) / 2;
    const p = newPuppet();
    const w = newWander(); // view mode: the doll strolls around on its own
    const pose = walkPose(puppetPose(p), w);
    let item: { i: number; dx: number; dy: number } | null = null;
    let raf = 0;
    const start = performance.now();
    let last = start;
    let cam: number | null = null; // camera left edge in canvas px (room scrolled by −cam)
    /** per-frame geometry: room → canvas, rig → canvas */
    let geo = { offX: 0, roomW: 1, H: 1, W: 1, k: 1, ox: 0, oy: 0 };
    let pointerX = 0, pointerY = 0; // last pointer position in canvas px
    let visible = true;
    let cssW = cv.clientWidth, cssH = cv.clientHeight;
    /** the pointer doing the current drag (one at a time: a second finger doesn't re-grab or drop it) */
    let active: number | null = null;
    // shrunk copies at the drawn size: the room art (scale = canvas px per room px) and the doll's parts (per rig px)
    const roomMips = new Mips([{ id: BG, img: bg, w: tpl.w, h: tpl.h }]);
    const dollMips = new Mips(rig.parts.map((q) => ({ id: q.id, img: sprite.get(q.id)!, w: q.w, h: q.h })));

    /** room width in rig px — character scale is fixed against the room, so this doesn't depend on canvas size */
    const roomRig = (tpl.w / tpl.h) * extent.h * (tpl.heightCm / (rig.heightCm ?? HEIGHT_DEFAULT));
    const anchorRig = START_X * roomRig;
    /** p.x walls: keep the body centre inside the room */
    const bounds: [number, number] = [0.03 * roomRig - anchorRig, 0.97 * roomRig - anchorRig];
    /** ceiling in rig y (the floor line is extent.bottom) */
    const ceiling = extent.bottom - (floorY - CEILING) * roomRig * (tpl.h / tpl.w);

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

    /** pointer (rig coords) → the matching point on the unflipped doll, so a mirrored doll is grabbed by the part under the cursor */
    const unflip = (x: number, y: number): [number, number] => {
      if (w.face >= 0) return [x, y];
      const body = bodyMatrix(p);
      const [lx, ly] = apply(invert(body), x, y);
      return apply(body, 2 * extent.cx - lx, ly);
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
      if (active !== null || e.button !== 0) return;
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
      if (!handled) {
        const [x, y] = unflip(...toRig(cx, cy));
        const part = hitPart(p, bones, x, y);
        if (part) {
          grab(p, x, y, part, bones);
          handled = true;
        }
      }
      if (!handled && ed) handled = pickItem(hitItem(rx, ry, false));
      if (!handled) return ed?.onSelect(null);
      e.preventDefault();
      active = e.pointerId;
      try {
        cv.setPointerCapture(e.pointerId);
      } catch {} // pointer already gone
      cv.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      if (active !== null && e.pointerId !== active) return;
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
      const [x, y] = unflip(...toRig(cx, cy));
      const over = hitPart(p, bones, x, y) || (ed && (hitItem(rx, ry, true) ?? hitItem(rx, ry, false)) !== null);
      cv.style.cursor = over ? "grab" : "";
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== active) return;
      active = null;
      if (p.grabbed) release(p);
      item = null;
      if (cv.hasPointerCapture(e.pointerId)) cv.releasePointerCapture(e.pointerId);
      cv.style.cursor = "grab";
    };
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    cv.addEventListener("lostpointercapture", up);
    const unguard = guardGestures(cv, () => active !== null);

    const drawItem = (it: PlacedItem, sel: boolean) => {
      const f = furniture(it.id);
      if (!f) return;
      const raw = stickers.current.get(it.id);
      if (raw && !roomMips.has(it.id)) roomMips.add({ id: it.id, img: raw, w: f.w * tpl.w, h: f.h * tpl.h });
      const img = roomMips.get(it.id);
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
      raf = 0;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = Math.round(cssW * dpr), H = Math.round(cssH * dpr);
      if (!W || !H) return; // hidden (studio tab closed): the resize observer restarts the loop
      if (cv.width !== W || cv.height !== H) (cv.width = W), (cv.height = H);
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      // reduced motion: no idle loop (frozen at t = 0) and no wandering; grab physics still runs — the user moves it
      const t = still ? 0 : (now - start) / 1000;

      step(p, bones, dt, { w: rig.width, h: rig.height }, { home: false, bounds, ceiling });
      if (!still && !live.current.edit) stepWander(w, p, dt, { bounds, height: extent.h });

      // --- camera: side-scroll locked on the doll with a little lag (also while held: the doll stays under the pointer,
      // so holding it towards an edge keeps scrolling that way until the wall) ---
      const roomW = tpl.w * (H / tpl.h);
      const k = roomW / roomRig;
      const dollX = (anchorRig + p.x) * k; // doll centre in room px
      let offX: number;
      if (roomW <= W) {
        offX = (W - roomW) / 2;
        cam = null;
      } else {
        const want = Math.max(0, Math.min(roomW - W, dollX - W / 2));
        cam = cam === null ? want : Math.max(0, Math.min(roomW - W, cam + (want - cam) * Math.min(1, dt * CAM_FOLLOW)));
        offX = -cam;
      }
      const oy = floorY * H - extent.bottom * k;
      geo = { offX, roomW, H, W, k, ox: offX + (anchorRig - extent.cx) * k, oy }; // rig x = extent.cx sits on the anchor
      if (p.grabbed) [p.tx, p.ty] = clampRig(pointerX, pointerY); // camera may have moved: keep the target under the pointer

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#0b0507";
      ctx.fillRect(0, 0, W, H);
      roomMips.fit(H / tpl.h);
      dollMips.fit(k);
      ctx.imageSmoothingQuality = "medium";
      ctx.drawImage(roomMips.get(BG)!, offX, 0, roomW, H);

      const { layout: lay, edit: ed } = live.current;
      lay.items.forEach((it, i) => !it.front && drawItem(it, ed?.selected === i));

      // --- doll: real height against the room, feet on the floor line at rest ---
      const lift = Math.max(0, -p.y) * k; // shadow shrinks as it's lifted
      const sx = geo.ox + (extent.cx + p.x) * k;
      const shadowW = extent.h * k * 0.16 * Math.max(0.35, 1 - lift / (extent.h * k)) * (1 + 1.6 * Math.abs(Math.sin(p.ang))); // longer when lying down
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,.22)";
      ctx.beginPath();
      ctx.ellipse(sx, floorY * H, shadowW, shadowW * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const view: M = [k, 0, 0, k, geo.ox, oy + walkBob(w, extent.h) * k];
      drawRig(ctx, rig, bones, dollMips, t, mul(mul(view, bodyMatrix(p)), flipMatrix(w, extent.cx)), true, { pose, eyesShut: squinting(p), onTop: onTopParts(p, bones), mood: mood(p, t, bones), mirrored: w.face < 0 });

      lay.items.forEach((it, i) => it.front && drawItem(it, ed?.selected === i));
      if (visible) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (raf) return;
      last = performance.now(); // don't simulate the time spent hidden
      raf = requestAnimationFrame(frame);
    };
    kick();
    // size from the observer: no layout read per frame
    const ro = new ResizeObserver((entries) => {
      const r = entries[entries.length - 1].contentRect;
      if (r.width === cssW && r.height === cssH) return;
      (cssW = r.width), (cssH = r.height);
      kick();
    });
    ro.observe(cv);
    const unwatch = watchVisible(cv, (v) => {
      visible = v;
      if (v) kick();
    });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      unwatch();
      unguard();
      roomMips.clear();
      dollMips.clear();
      cv.removeEventListener("lostpointercapture", up);
      cv.removeEventListener("pointerdown", down);
      cv.removeEventListener("pointermove", move);
      cv.removeEventListener("pointerup", up);
      cv.removeEventListener("pointercancel", up);
    };
  }, [bg, sprite, tpl, rig, bones, extent]);

  if (!tpl) return <p className="sub">ยังไม่มีเทมเพลตห้อง</p>;
  return (
    <div className={`room-stage${full ? " full" : ""}`} style={full ? undefined : { aspectRatio: `${tpl.w} / ${tpl.h}` }}>
      <canvas ref={canvas} role="img" aria-label={label ?? `ห้อง ${tpl.name}`} />
      {(!bg || !sprite) && <span className="sprite-note">{failed ? "โหลดห้องไม่สำเร็จ" : "กำลังโหลด…"}</span>}
      <span className="room-hint">จับตัวละครลากหรือโยนได้</span>
      <button type="button" className="room-full" onClick={() => setFull((f) => !f)} aria-label={full ? "ปิดโหมดเต็มจอ" : "ดูห้องเต็มจอ"}>
        {full ? "✕ ปิด" : "⛶ เต็มจอ"}
      </button>
    </div>
  );
}
