"use client";

import Image from "next/image";
import { ComingSoon } from "./ComingSoon";
import { useEffect, useState } from "react";
import type { Slide } from "@/lib/backgrounds";

const LINES: { kicker: string; line: string }[] = [
  { kicker: "OLD REALM", line: "พรทุกอย่างมีผลกรรม" },
  { kicker: "DUNGEON", line: "หลังประตูสี มีบางอย่างรออยู่" },
  { kicker: "M.A.I.D.S", line: "ต้องการอะไรคะ" },
  { kicker: "ROUGE LAND", line: "ฉันมีเนื้อ ฉันจึงมีตัวตน" },
];

/** Each slide zooms + pans for HOLD ms, then crossfades (FADE ms) into the next. */
const HOLD = 8000;
const FADE = 1600;
/** Ken Burns paths, cycled per slide. Scale stays ≥ 1 so the image always covers (crop, never stretch). */
const MOTIONS = ["kb-a", "kb-b", "kb-c", "kb-d"];

export function HeroCarousel({ slides }: { slides: Slide[] }) {
  // cycle increments on every change so the incoming image always remounts and restarts its motion
  const [{ i, prevI, cycle }, setState] = useState({ i: 0, prevI: -1, cycle: 0 });
  const go = (n: number) => setState((st) => (n === st.i ? st : { i: n, prevI: st.i, cycle: st.cycle + 1 }));
  const count = slides.length;

  useEffect(() => {
    if (count < 2) return;
    const t = setTimeout(() => go((i + 1) % count), HOLD);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, count]);

  const copy = LINES[i % LINES.length]!;
  return (
    <section className="kv" style={{ "--kv-fade": `${FADE}ms`, "--kv-run": `${HOLD + FADE}ms` } as React.CSSProperties}>
      {slides.map((sl, n) => {
        const on = n === i;
        const prev = n === prevI && !on;
        return (
          <div key={sl.src} className={`kv-slide ${on ? "on" : ""} ${prev ? "prev" : ""}`} aria-hidden={!on}>
            <Image
              key={on ? `c${cycle}` : prev ? `c${cycle - 1}` : "idle"}
              src={sl.src}
              alt=""
              fill
              sizes="100vw"
              // originals are pre-sized webp (≤2560px); skip the optimizer so Ken Burns zoom doesn't upscale a q75 re-encode
              unoptimized
              preload={n === 0}
              style={{ objectPosition: sl.pos, transformOrigin: sl.pos }}
              className={`kv-img ${on || prev ? MOTIONS[n % MOTIONS.length] : ""}`}
            />
          </div>
        );
      })}
      <div className="kv-shade" aria-hidden="true" />
      <div className="kv-vertical" aria-hidden="true">
        FLESHFALL · เมดเนื้อ
      </div>

      <div className="kv-copy">
        <p className="kv-kicker" key={`k${i}`}>
          {copy.kicker}
        </p>
        <h1 className="kv-logo">
          Fleshfall
        </h1>
        <p className="kv-line" key={`l${i}`}>
          {copy.line}
        </p>
        <div className="kv-cta">
          <ComingSoon />
        </div>
      </div>

      {count > 1 && (
        <div className="kv-dots">
          {slides.map((sl, n) => (
            <button key={sl.src} className={n === i ? "on" : ""} onClick={() => go(n)} aria-label={`รูปที่ ${n + 1}`}>
              <span>{String(n + 1).padStart(2, "0")}</span>
              <i key={n === i ? `p${cycle}` : "x"} style={n === i ? { animationDuration: `${HOLD}ms` } : undefined} />
            </button>
          ))}
        </div>
      )}
      <div className="kv-scroll" aria-hidden="true">
        SCROLL
      </div>
    </section>
  );
}
