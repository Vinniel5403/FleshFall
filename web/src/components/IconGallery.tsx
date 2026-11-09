"use client";

import Image from "next/image";
import { useState } from "react";
import { useApi } from "@/lib/api";
import { doorVar } from "@/lib/md";
import type { Icon } from "@/lib/types";

const icon = (f: string) => encodeURI(`/icons/${f}`);

/** Art per Icon (from the Canva deck's Icon pages). No art → plain strip in the door color. */
const ICON_ART: Record<string, { src: string; pos: string } | undefined> = {
  beelzebub: { src: icon("IMG_5925.PNG"), pos: "50% 28%" },
  hastur: { src: icon("IMG_5924.PNG"), pos: "50% 4%" },
  loki: undefined,
  belphegor: { src: icon("IMG_5942.PNG"), pos: "50% 22%" },
  sophia: { src: icon("IMG_5960.PNG"), pos: "32% 30%" },
  thanatos: { src: icon("IMG_5866.png"), pos: "58% 30%" },
  wendigo: { src: icon("IMG_4606.PNG"), pos: "50% 62%" },
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
 * Seven vertical strips. Hover (or tap) one to expand it and show its details;
 * with nothing hovered they're just equal strips.
 */
export function IconGallery() {
  const { data: icons } = useApi<Icon[]>("icons");
  const [active, setActive] = useState<number | null>(null);

  if (!icons) return <div className="ig ig-loading" />;

  return (
    <div className={`ig-wrap ${active !== null ? "has-active" : ""}`} onMouseLeave={() => setActive(null)}>
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
              {art && <Image src={art.src} alt="" fill sizes="(max-width: 900px) 70vw, 50vw" style={{ objectPosition: art.pos }} className="ig-img" />}
              <span className="ig-tint" />
              <span className="ig-vname">{ic.name}</span>
              {on && (
                <span className="ig-info">
                  <span className="ig-epithet">
                    <i /> {EPITHET[ic.id] ?? ""} · {ic.doorName}
                  </span>
                  <span className="ig-concept">{ic.concept}</span>
                  <span className="ig-trade">
                    <span>
                      <b>✦ พร</b> {ic.blessing}
                    </span>
                    <span>
                      <b>✖ ผลกรรม</b> {ic.repercussion}
                    </span>
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
}
