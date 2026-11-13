"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GAME } from "@/lib/game";
import { roleAvatar } from "@/lib/avatar";
import { doorVar } from "@/lib/md";
import type { PlayerHit } from "@/lib/types";

const roleName = (id: string) => GAME.roles.find((r) => r.id === id);
const iconOf = (id: string) => GAME.icons.find((i) => i.id === id);

/** Character name search → cards linking to /players/<slug>. Empty query lists the newest characters. */
export function PlayerSearch() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PlayerHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/players?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal });
        const data = (await res.json()) as PlayerHit[] | { error: string };
        if (!res.ok || !Array.isArray(data)) throw new Error("error" in data ? data.error : "ค้นหาไม่สำเร็จ");
        setHits(data);
        setError(null);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      }
    }, 250);
    return () => (clearTimeout(t), ctrl.abort());
  }, [q]);

  return (
    <div className="players">
      <label className="players-search">
        <span>ค้นหาชื่อตัวละคร</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} maxLength={40} placeholder="พิมพ์ชื่อ…" autoComplete="off" />
      </label>
      {error && <p className="forge-error">{error}</p>}
      {hits === null && !error && <p className="sub">กำลังเปิดแฟ้มประวัติ…</p>}
      {hits?.length === 0 && <p className="sub">ไม่พบตัวละครชื่อนี้</p>}
      <ul className="players-grid">
        {hits?.map((h) => {
          const role = roleName(h.role);
          const icon = iconOf(h.icon);
          return (
            <li key={h.slug}>
              <Link href={`/players/${h.slug}`} className={`player-card ${h.fiend ? "fiend" : ""}`} style={{ "--door": doorVar(icon?.door ?? "red") } as React.CSSProperties}>
                <span className="player-thumb">
                  {(h.portraitUrl ?? roleAvatar(h.role)) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={(h.portraitUrl ?? roleAvatar(h.role))!} alt="" loading="lazy" />
                  ) : (
                    <i>{h.name.slice(0, 1)}</i>
                  )}
                </span>
                <span className="player-meta">
                  <b>{h.name}</b>
                  <small>
                    Lv.{h.level} · {role ? `${role.emoji} ${role.name}` : h.role}
                  </small>
                  <small>{icon ? `${icon.emoji} ${icon.name}` : h.icon}{h.fiend ? " · Fiend" : ""}</small>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
