"use client";

import { useEffect, useState } from "react";
import type { PlayerHit } from "@/lib/types";
import { PlayerCard } from "./PlayerCard";

/** Character name search → cards linking to /profile/<handle>. Empty query lists the newest characters. */
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
          return (
            <li key={h.slug}>
              <PlayerCard h={h} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
