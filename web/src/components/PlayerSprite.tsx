"use client";

import { useMemo } from "react";
import type { Rig } from "@/lib/rig";
import { SpriteStage } from "./SpriteStage";

/** SpriteStage for a saved sprite, from plain props (server components can't pass the `src` function). */
export function PlayerSprite({ rig, url, name }: { rig: Rig; url: string; name: string }) {
  const src = useMemo(() => (id: string, ext: string) => `${url}/${id}.${ext}`, [url]);
  return <SpriteStage rig={rig} src={src} label={`สไปรต์ ${name}`} heightCm={rig.heightCm} />;
}
