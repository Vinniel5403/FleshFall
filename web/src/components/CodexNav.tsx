"use client";

import { useEffect, useState } from "react";

/** Sticky chapter index for /codex; highlights the chapter currently in view. `children` = tools above the list (search). */
export function CodexNav({ chapters, children }: { chapters: readonly { id: string; no: string; en: string; th: string }[]; children?: React.ReactNode }) {
  const [active, setActive] = useState(chapters[0]?.id ?? "");

  useEffect(() => {
    const els = chapters.map((c) => document.getElementById(c.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [chapters]);

  // keep the active chip visible in the horizontal mobile strip
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`.cx-nav a[data-id="${active}"]`);
    const strip = el?.closest<HTMLElement>(".cx-nav-list");
    if (el && strip && strip.scrollWidth > strip.clientWidth) strip.scrollTo({ left: el.offsetLeft - 16, behavior: "smooth" });
  }, [active]);

  return (
    <nav className="cx-nav" aria-label="สารบัญ Codex">
      <p className="cx-nav-head">
        <span>CONTENTS</span>
        <b>สารบัญ</b>
      </p>
      {children}
      <ol className="cx-nav-list">
        {chapters.map((c) => (
          <li key={c.id}>
            <a href={`#${c.id}`} data-id={c.id} className={c.id === active ? "on" : ""} aria-current={c.id === active ? "location" : undefined}>
              <span className="cx-nav-no">{c.no}</span>
              <span className="cx-nav-txt">
                <span className="cx-nav-en">{c.en}</span>
                <span className="cx-nav-th">{c.th}</span>
              </span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
