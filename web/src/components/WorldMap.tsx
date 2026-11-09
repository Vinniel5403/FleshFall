"use client";

import { useState } from "react";
import { useApi } from "@/lib/api";
import { doorVar, TIER_NAME } from "@/lib/md";
import type { Item, World } from "@/lib/types";

export function WorldMap() {
  const { data: world, error } = useApi<World>("world");
  const { data: items } = useApi<Item[]>("items");
  const [pick, setPick] = useState<string | null>(null);
  if (error) return <p className="notice">{error}</p>;
  if (!world) return <p className="notice">กำลังโหลด…</p>;
  const c = world.continents.find((x) => x.id === pick) ?? world.continents[0]!;
  const shop = c.shop.map((id) => items?.find((i) => i.id === id)).filter((i): i is Item => !!i);
  return (
    <>
      <div className="tabs">
        {world.continents.map((x) => (
          <button key={x.id} className={`tab ${x.id === c.id ? "on" : ""}`} onClick={() => setPick(x.id)}>
            {x.emoji} {x.name}
          </button>
        ))}
      </div>
      <div className="continent-head">
        <h3>
          {c.emoji} {c.name}
        </h3>
        <span className="chip">
          <span className="door" style={{ background: doorVar(c.door) }} />
          ประตูหลัก 40% · {c.icon}
        </span>
        <span className="chip">{c.cities.length} เมือง</span>
      </div>
      <div className="grid cities">
        {c.cities.map((z) => (
          <div key={z.id} className="card city" data-tier={z.tier}>
            <h3>
              {z.emoji} {z.name}
            </h3>
            <span className={`tier ${z.tier}`}>
              {TIER_NAME[z.tier]} · Lv {world.tiers[z.tier].rec}+
            </span>
            <p>{z.desc}</p>
          </div>
        ))}
      </div>
      <div className="shop">
        <span className="sub">🛒 ร้านประจำทวีป:</span>{" "}
        {shop.map((i) => (
          <span key={i.id} className="chip">
            {i.emoji} {i.name} · {i.value}🥩
          </span>
        ))}
      </div>
    </>
  );
}
