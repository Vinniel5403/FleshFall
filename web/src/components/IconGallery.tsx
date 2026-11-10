"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useGame } from "@/lib/game";
import { doorVar } from "@/lib/md";

const icon = (name: string) => `/icons/${name}.webp`;

interface IconArt {
  src: string;
  w: number;
  h: number;
  /** pin to the strip's left/right edge instead of centring */
  align?: "left" | "right";
  /** shift up/down, e.g. "-30%" */
  y?: string;
  /** horizontal nudge while the strip is narrow (centres the face), % of image width; reset when expanded */
  shift?: string;
  /** hover animation frames (played forward on hover and held; reversed on leave) */
  frames?: string[];
  /** fixed ms per frame (e.g. a GIF's own timing); omit for the ease-in timing */
  frameMs?: number;
}

const seq = (name: string, count: number, pad = 0) => Array.from({ length: count }, (_, n) => icon(`${name}-${String(n).padStart(pad, "0")}`));

/** Art per Icon (from the Canva deck's Icon pages). No art → plain strip. */
const ICON_ART: Record<string, IconArt | undefined> = {
  beelzebub: { src: icon("beelzebub-0"), w: 1450, h: 1800, frames: seq("beelzebub", 5) },
  hastur: { src: icon("hastur"), w: 1228, h: 1800 },
  loki: { src: icon("loki-00"), w: 875, h: 1500, frames: seq("loki", 49, 2), frameMs: 30 }, // shapeshift GIF, 49 frames
  belphegor: { src: icon("belphegor"), w: 1058, h: 1800 },
  sophia: { src: icon("sophia"), w: 1692, h: 1800, align: "left", shift: "-15%" },
  thanatos: { src: icon("thanatos"), w: 1777, h: 1800, align: "right", shift: "13%" },
  wendigo: { src: icon("wendigo"), w: 1241, h: 1800, y: "-30%" },
};

const EPITHET: Record<string, string> = {
  beelzebub: "GLUTTONY",
  hastur: "FEAR",
  loki: "DISTORTION",
  belphegor: "DESPAIR",
  sophia: "THE PROGENITOR",
  thanatos: "DECAY",
  wendigo: "DESTITUTE",
};

/**
 * Steps a frame index toward the last frame while `on`, back toward 0 when off.
 * Default ease-in timing (first step lingers, then snaps through); `fixedMs` = constant speed.
 */
const SLOW = 260; // ms for the first step
const FAST = 40; // ms floor for the last steps
function useFrame(count: number, on: boolean, fixedMs?: number) {
  const [frame, setFrame] = useState(0);
  const [step, setStep] = useState(0); // steps taken since the direction last changed
  const target = on ? count - 1 : 0;
  const [lastOn, setLastOn] = useState(on);
  if (on !== lastOn) {
    setLastOn(on);
    setStep(0);
  }
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (count < 2 || frame === target) return;
    const t = Math.min(1, step / (count - 1));
    const delay = fixedMs ?? Math.max(FAST, SLOW * (1 - t) * (1 - t));
    timer.current = setTimeout(() => {
      setFrame((f) => f + (target > f ? 1 : -1));
      setStep((n) => n + 1);
    }, delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [frame, target, count, step, fixedMs]);
  return frame;
}

function Art({ art, on, armed }: { art: IconArt; on: boolean; armed: boolean }) {
  const frames = art.frames ?? [art.src];
  const frame = useFrame(frames.length, on, art.frameMs);
  // frames load lazily (only once the gallery is hovered); until a frame has loaded, keep showing the last loaded one
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set([0]));
  let shown = frame;
  while (shown > 0 && !loaded.has(shown)) shown--;
  const cls = `ig-img ${art.align ?? ""}`;
  const style = { ...(art.y ? { top: art.y } : {}), ...(art.shift ? { "--shift": art.shift } : {}) } as React.CSSProperties;
  const mounted = armed ? frames : frames.slice(0, 1);
  return (
    <span className="ig-anim">
      {mounted.map((src, n) => (
        <Image
          key={src}
          src={src}
          alt=""
          width={art.w}
          height={art.h}
          loading="eager"
          unoptimized={frames.length > 1} // frame sequences are pre-sized webp; skip the optimizer
          sizes="(max-width: 900px) 60vw, 45vw"
          className={cls}
          style={{ ...style, opacity: n === shown ? undefined : 0 }}
          onLoad={n === 0 ? undefined : () => setLoaded((l) => new Set(l).add(n))}
        />
      ))}
    </span>
  );
}

/**
 * Seven vertical strips. Hover (or tap) one to expand it and show its details;
 * with nothing hovered they're just equal strips.
 */
export function IconGallery() {
  const { data: icons } = useGame("icons");
  const [active, setActive] = useState<number | null>(null);
  const [armed, setArmed] = useState(false); // start loading hover frames once the gallery is approached

  if (!icons) return <div className="ig ig-loading" />;

  return (
    <div
      className={`ig-wrap ${active !== null ? "has-active" : ""}`}
      onMouseEnter={() => setArmed(true)}
      onFocus={() => setArmed(true)}
      onTouchStart={() => setArmed(true)}
      onMouseLeave={() => setActive(null)}
    >
      <div className="ig" role="tablist" aria-label="The Icons">
        {icons.map((ic, n) => {
          const art = ICON_ART[ic.id];
          const on = n === active;
          return (
            <button
              key={ic.id}
              role="tab"
              aria-selected={on}
              aria-label={ic.name}
              className={`ig-panel ${on ? "on" : ""} ${art ? "" : "no-art"}`}
              style={{ "--door": doorVar(ic.door) } as React.CSSProperties}
              onMouseEnter={() => setActive(n)}
              onFocus={() => setActive(n)}
              onClick={() => setActive(n)}
            >
              {/* fixed scale: always full strip height — narrow strips just crop the sides */}
              {art && <Art art={art} on={on} armed={armed} />}
              <span className="ig-tint" />
              <span className="ig-vname">{ic.name}</span>
              {on && (
                <span className="ig-info">
                  <span className="ig-epithet">
                    <i /> {EPITHET[ic.id] ?? ""}
                  </span>
                  <span className="ig-name">{ic.name}</span>
                  <span className="ig-concept">{ic.concept}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
