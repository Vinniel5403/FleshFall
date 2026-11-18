import Link from "next/link";
import { roleAvatar } from "@/lib/avatar";
import { GAME } from "@/lib/game";
import { doorVar } from "@/lib/md";
import { nameHandle, profilePath, type PlayerHit } from "@/lib/types";

/**
 * One character card (players.css .player-card). Links to the pretty /profile/<handle> URL, or the permanent
 * /players/<slug> when `permalink` (used where several characters share a handle).
 */
export function PlayerCard({ h, permalink = false }: { h: PlayerHit; permalink?: boolean }) {
  const role = GAME.roles.find((r) => r.id === h.role);
  const icon = GAME.icons.find((i) => i.id === h.icon);
  const thumb = h.portraitUrl ?? roleAvatar(h.role);
  return (
    <Link
      href={permalink ? `/players/${h.slug}` : profilePath(h.handle || nameHandle(h.name))}
      className={`player-card ${h.fiend ? "fiend" : ""}`}
      style={{ "--door": doorVar(icon?.door ?? "red") } as React.CSSProperties}
    >
      <span className="player-thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {thumb ? <img src={thumb} alt="" loading="lazy" /> : <i>{h.name.slice(0, 1)}</i>}
      </span>
      <span className="player-meta">
        <b>{h.name}</b>
        <small>
          Lv.{h.level} · {role ? `${role.emoji} ${role.name}` : h.role}
        </small>
        <small>
          {icon ? `${icon.emoji} ${icon.name}` : h.icon}
          {h.fiend ? " · Fiend" : ""}
        </small>
      </span>
    </Link>
  );
}
