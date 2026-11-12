"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { bodyMatrix, grab, hitPart, newPuppet, onTopParts, puppetPose, release, settled, squinting, step } from "@/lib/puppet";
import { buildSkeleton, drawDebug, drawRig, mul, type M, type Rig } from "@/lib/rig";

interface Props {
  rig: Rig;
  /** part id → image URL (R2 public URL or blob: URL for an unsaved preview) */
  src: (id: string, ext: string) => string;
  className?: string;
  label?: string;
  /** overlay boxes / pivots / ids */
  debug?: boolean;
}

/** Animated paper-doll (Canvas2D). Idle loop from lib/rig; static when reduced motion is on. */
export function SpriteStage({ rig, src, className, label, debug }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<Map<string, HTMLImageElement> | null>(null);
  const [failed, setFailed] = useState(false);
  const bones = useMemo(() => buildSkeleton(rig), [rig]);
  const puppet = useRef(newPuppet());
  /** canvas px → rig coords (set every frame) */
  const toRig = useRef<(cx: number, cy: number) => [number, number]>(() => [0, 0]);

  useEffect(() => {
    let live = true;
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
      (pairs) => live && setImages(new Map(pairs)),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
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

    // grab the torso and shake
    const local = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      const dpr = cv.width / r.width;
      return toRig.current((e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr);
    };
    const down = (e: PointerEvent) => {
      if (still) return;
      const [x, y] = local(e);
      const part = hitPart(p, bones, x, y);
      if (!part) return;
      e.preventDefault();
      cv.setPointerCapture(e.pointerId);
      grab(p, x, y, part, bones);
      cv.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      const [x, y] = local(e);
      if (p.grabbed) [p.tx, p.ty] = [x, y];
      else cv.style.cursor = !still && hitPart(p, bones, x, y) ? "grab" : "";
    };
    const up = (e: PointerEvent) => {
      if (!p.grabbed) return;
      release(p);
      if (cv.hasPointerCapture(e.pointerId)) cv.releasePointerCapture(e.pointerId);
      cv.style.cursor = "grab";
    };
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    const pose = puppetPose(p);

    const frame = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr);
      if (cv.width !== w || cv.height !== h) (cv.width = w), (cv.height = h);
      ctx.clearRect(0, 0, w, h);
      // fit rig into the canvas, a little padding so swaying parts don't clip
      // headroom for swaying + being picked up; zoom out a little while carried sideways
      const s = Math.min(w / rig.width, h / rig.height) * 0.84 * (1 - 0.22 * puppet.current.carry);
      const ox = (w - rig.width * s) / 2, oy = h - rig.height * s - h * 0.02; // stand near the bottom: room above to lift
      ctx.imageSmoothingQuality = "high";
      const t = (now - start) / 1000;
      const view: M = [s, 0, 0, s, ox, oy];
      toRig.current = (cx, cy) => [(cx - ox) / s, (cy - oy) / s];
      if (!still && !settled(p)) step(p, bones, (now - last) / 1000, { w: rig.width, h: rig.height });
      last = now;
      const v = mul(view, bodyMatrix(p));
      drawRig(ctx, rig, bones, images, t, v, !still, { pose, eyesShut: squinting(p), onTop: onTopParts(p, bones) });
      if (debug) drawDebug(ctx, rig, bones, t, v, !still, pose);
      if (!still) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      cv.removeEventListener("pointerdown", down);
      cv.removeEventListener("pointermove", move);
      cv.removeEventListener("pointerup", up);
      cv.removeEventListener("pointercancel", up);
    };
  }, [images, rig, bones, debug]);

  return (
    <div className={`sprite-stage ${className ?? ""}`} style={{ aspectRatio: `${rig.width} / ${rig.height}` }}>
      <canvas ref={canvas} role="img" aria-label={label ?? "ตัวละคร"} />
      {!images && <span className="sprite-note">{failed ? "โหลดสไปรต์ไม่สำเร็จ" : "กำลังโหลด…"}</span>}
    </div>
  );
}
