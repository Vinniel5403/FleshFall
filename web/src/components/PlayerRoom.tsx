"use client";

import { useMemo } from "react";
import templateRig from "@/data/sprite-template.json";
import { defaultRoom, type RoomLayout } from "@/lib/room";
import type { Rig } from "@/lib/rig";
import { RoomStage } from "./RoomStage";

const TEMPLATE_RIG = templateRig as Rig;

/** Public room view for a profile (plain props: server components can't pass functions). No sprite → template doll. */
export function PlayerRoom({ room, rig, url, name }: { room: RoomLayout | null; rig: Rig | null; url: string | null; name: string }) {
  const src = useMemo(
    () => (rig && url ? (id: string, ext: string) => `${url}/${id}.${ext}` : (id: string, ext: string) => `/sprites/template/${id}.${ext}`),
    [rig, url],
  );
  return <RoomStage layout={room ?? defaultRoom()} rig={rig && url ? rig : TEMPLATE_RIG} src={src} label={`ห้องของ ${name}`} />;
}
