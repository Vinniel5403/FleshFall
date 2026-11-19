"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { bodyMatrix, grab, hitPart, newPuppet, onTopParts, puppetPose, release, settled, squinting, step } from "@/lib/puppet";
import { buildSkeleton, drawDebug, drawRig, mul, type M, type Rig } from "@/lib/rig";
import { guardGestures, Mips, watchVisible } from "@/lib/stage";

interface Props {
  rig: Rig;
  /** part id → image URL (R2 public URL or blob: URL for an unsaved preview) */
  src: (id: string, ext: string) => string;
  className?: string;
  label?: string;
  /** overlay boxes / pivots / ids */
  debug?: boolean;
  /** character height in cm → uniform scale against a cm ruler (feet on the 0 line). Omit = fit to the frame. */
  heightCm?: number;
}

/** Ruler range (cm) — the frame always shows 0…RULER_CM so different heights compare honestly. */
export const RULER_CM = 220;

/** Ruler on the left: ticks every 5 cm, labels every 20, a floor line, and the head-height marker. */
function drawRuler(ctx: CanvasRenderingContext2D, w: number, floorY: number, pxPerCm: number, rulerW: number, heightCm: number, dpr: number) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const x = rulerW - 6 * dpr;
  ctx.strokeStyle = "rgba(230,184,162,.45)";
  ctx.fillStyle = "rgba(230,184,162,.7)";
  ctx.lineWidth = Math.max(1, dpr);
  ctx.font = `${10 * dpr}px sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.beginPath();
  ctx.moveTo(x, floorY);
  ctx.lineTo(x, floorY - RULER_CM * pxPerCm);
  for (let cm = 0; cm <= RULER_CM; cm += 5) {
    const y = floorY - cm * pxPerCm;
    const len = (cm % 50 === 0 ? 12 : cm % 10 === 0 ? 8 : 4) * dpr;
    ctx.moveTo(x, y);
    ctx.lineTo(x - len, y);
    if (cm % 20 === 0) ctx.fillText(String(cm), x - 14 * dpr, y);
  }
  ctx.stroke();
  // floor
  ctx.strokeStyle = "rgba(230,184,162,.18)";
  ctx.beginPath();
  ctx.moveTo(x, floorY);
  ctx.lineTo(w, floorY);
  ctx.stroke();
  // head height marker
  const hy = floorY - heightCm * pxPerCm;
  ctx.strokeStyle = "rgba(224,30,55,.75)";
  ctx.setLineDash([5 * dpr, 4 * dpr]);
  ctx.beginPath();
  ctx.moveTo(x, hy);
  ctx.lineTo(w - 6 * dpr, hy);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#e01e37";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.font = `600 ${12 * dpr}px sans-serif`;
  ctx.fillText(`${Math.round(heightCm)} cm`, x + 6 * dpr, hy - 3 * dpr);
  ctx.restore();
}

/** Animated paper-doll (Canvas2D). Idle loop from lib/rig; reduced motion = no idle loop, but it can still be grabbed. */
export function SpriteStage({ rig, src, className, label, debug, heightCm }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<Mips | null>(null);
  const [failed, setFailed] = useState(false);
  const bones = useMemo(() => buildSkeleton(rig), [rig]);
  const puppet = useRef(newPuppet());
  /** canvas px → rig coords (set every frame) */
  const toRig = useRef<(cx: number, cy: number) => [number, number]>(() => [0, 0]);
  /** visible frame in rig coords [left, top, right, bottom] — the only wall when dragging */
  const frameBox = useRef<[number, number, number, number]>([-Infinity, -Infinity, Infinity, Infinity]);
  /** read every frame so moving the slider doesn't restart the animation */
  const height = useRef(heightCm);
  height.current = heightCm;
  /** the character's real pixel extent (rig canvas has empty margins) — what heightCm measures */
  const extent = useMemo(() => {
    const top = Math.min(...rig.parts.map((p) => p.y));
    const bottom = Math.max(...rig.parts.map((p) => p.y + p.h));
    const left = Math.min(...rig.parts.map((p) => p.x));
    const right = Math.max(...rig.parts.map((p) => p.x + p.w));
    return { top, bottom, cx: (left + right) / 2, h: Math.max(1, bottom - top) };
  }, [rig]);

  useEffect(() => {
    let live = true;
    let mips: Mips | null = null;
    setImages(null);
    setFailed(false);
    Promise.all(
      rig.parts.map(
        (p) =>
          new Promise<[string, HTMLImageElement]>((resolve, reject) => {
            const img = new Image();
            img.decoding = "async";
            img.onload = () => resolve([p.id, img]);
            img.onerror = () => reject(new Error(p.id));
            img.src = src(p.id, p.ext);
          }),
      ),
    ).then(
      (pairs) => {
        if (!live) return;
        const byId = new Map(pairs);
        setImages((mips = new Mips(rig.parts.map((p) => ({ id: p.id, img: byId.get(p.id)!, w: p.w, h: p.h })))));
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
      mips?.clear();
    };
  }, [rig, src]);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv || !images) return;
    const ctx = cv.getContext("2d")!;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const p = (puppet.current = newPuppet());
    let raf = 0;
    const start = performance.now();
    let last = start;
    let visible = true;
    let cssW = cv.clientWidth, cssH = cv.clientHeight;
    /** the pointer holding the doll (one at a time: a second finger doesn't re-grab or drop it) */
    let active: number | null = null;

    // grab the torso and shake
    const local = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      const dpr = cv.width / r.width;
      return toRig.current((e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr);
    };
    const down = (e: PointerEvent) => {
      if (active !== null || e.button !== 0) return;
      const [x, y] = local(e);
      const part = hitPart(p, bones, x, y);
      if (!part) return;
      e.preventDefault();
      active = e.pointerId;
      try {
        cv.setPointerCapture(e.pointerId);
      } catch {} // pointer already gone
      grab(p, x, y, part, bones);
      cv.style.cursor = "grabbing";
      kick(); // reduced motion: the loop is asleep until grabbed
    };
    const move = (e: PointerEvent) => {
      if (active !== null && e.pointerId !== active) return;
      const [x, y] = local(e);
      if (p.grabbed) {
        const [l, t, r, b] = frameBox.current;
        p.tx = Math.max(l, Math.min(r, x));
        p.ty = Math.max(t, Math.min(b, y));
      }
      else cv.style.cursor = hitPart(p, bones, x, y) ? "grab" : "";
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== active) return;
      active = null;
      if (p.grabbed) release(p);
      if (cv.hasPointerCapture(e.pointerId)) cv.releasePointerCapture(e.pointerId);
      cv.style.cursor = "grab";
    };
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    cv.addEventListener("lostpointercapture", up);
    const unguard = guardGestures(cv, () => active !== null);
    const pose = puppetPose(p);

    const frame = (now: number) => {
      raf = 0;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
      if (!w || !h) return; // hidden (studio tab closed): the resize observer restarts the loop
      if (cv.width !== w || cv.height !== h) (cv.width = w), (cv.height = h);
      ctx.clearRect(0, 0, w, h);
      const carryZoom = 1 - 0.22 * puppet.current.carry; // zoom out a little while carried sideways
      let s: number, ox: number, oy: number;
      const cm = height.current;
      let ruler: (() => void) | null = null;
      if (cm) {
        // measured: 0…RULER_CM always spans the same height, the character is scaled uniformly to `cm`
        const rulerW = 46 * dpr;
        const floorY = h - h * 0.03;
        const pxPerCm = (floorY - h * 0.04) / RULER_CM;
        s = ((cm * pxPerCm) / extent.h) * carryZoom;
        ox = rulerW + (w - rulerW) / 2 - extent.cx * s;
        oy = floorY - extent.bottom * s;
        ruler = () => drawRuler(ctx, w, floorY, pxPerCm, rulerW, cm, dpr);
      } else {
        // fit rig into the frame, headroom for swaying + being picked up
        s = Math.min(w / rig.width, h / rig.height) * 0.84 * carryZoom;
        ox = (w - rig.width * s) / 2;
        oy = h - rig.height * s - h * 0.02; // stand near the bottom: room above to lift
      }
      ruler?.();
      images.fit(s / carryZoom); // not the carry zoom: no re-bake mid-grab
      ctx.imageSmoothingQuality = "medium";
      // reduced motion: idle loop frozen at t = 0 (no breathing/blinking); grab physics still runs — the user moves it
      const t = still ? 0 : (now - start) / 1000;
      const view: M = [s, 0, 0, s, ox, oy];
      toRig.current = (cx, cy) => [(cx - ox) / s, (cy - oy) / s];
      frameBox.current = [...toRig.current(0, 0), ...toRig.current(w, h)];
      if (!settled(p)) step(p, bones, (now - last) / 1000, { w: rig.width, h: rig.height });
      last = now;
      const v = mul(view, bodyMatrix(p));
      drawRig(ctx, rig, bones, images, t, v, true, { pose, eyesShut: squinting(p), onTop: onTopParts(p, bones) });
      if (debug) drawDebug(ctx, rig, bones, t, v, true, pose);
      if (visible && (!still || !settled(p))) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (raf) return;
      last = performance.now(); // don't simulate the time spent asleep
      raf = requestAnimationFrame(frame);
    };
    kick();
    // size from the observer (no layout read per frame); also redraws the single reduced-motion frame on resize
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
      cv.removeEventListener("lostpointercapture", up);
      cv.removeEventListener("pointerdown", down);
      cv.removeEventListener("pointermove", move);
      cv.removeEventListener("pointerup", up);
      cv.removeEventListener("pointercancel", up);
    };
  }, [images, rig, bones, debug, extent]);

  return (
    <div className={`sprite-stage ${className ?? ""}`} style={{ aspectRatio: `${rig.width} / ${rig.height}` }}>
      <canvas ref={canvas} role="img" aria-label={label ?? "ตัวละคร"} />
      {!images && <span className="sprite-note">{failed ? "โหลดสไปรต์ไม่สำเร็จ" : "กำลังโหลด…"}</span>}
    </div>
  );
}
