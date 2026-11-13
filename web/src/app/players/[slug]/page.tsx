import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Brackets } from "@/components/Dossier";
import { PlayerSprite } from "@/components/PlayerSprite";
import { roleAvatar } from "@/lib/avatar";
import { GAME } from "@/lib/game";
import { doorVar } from "@/lib/md";
import { botPublic } from "@/lib/server/bot";
import { publicUrl } from "@/lib/server/r2";
import type { PlayerProfile } from "@/lib/types";
import "../../forge.css";
import "../../players.css";

/** Blocking route: the shared Header reads usePathname() outside Suspense, which a runtime [slug] can't prerender. */
export const instant = false;

export const metadata: Metadata = {
  title: "แฟ้มประวัติตัวละคร",
  description: "โปรไฟล์ตัวละครผู้เล่น Fleshfall — ภาพ ชีท สไปรต์ ค่าพลัง และบันทึกตัวละคร",
};

/** Params are runtime data (no generateStaticParams): the profile streams in behind Suspense. */
export default function PlayerPage({ params }: PageProps<"/players/[slug]">) {
  return (
    <main className="player-page">
      <section className="block page-body">
        <p className="player-back">
          <Link href="/players">← แฟ้มประวัติผู้เล่นทั้งหมด</Link>
        </p>
        <Suspense fallback={<p className="sub">กำลังเปิดแฟ้ม…</p>}>
          {params.then(({ slug }) => (
            <Profile slug={slug} />
          ))}
        </Suspense>
      </section>
    </main>
  );
}

const gear = (g: PlayerProfile["equipped"]["weapon"], none: string) => (g ? `${g.emoji} ${g.name}${g.level ? ` +${g.level}` : ""}` : none);

async function Profile({ slug }: { slug: string }) {
  if (!/^[0-9a-f]{16}$/.test(slug)) notFound();
  let p: PlayerProfile | null;
  try {
    p = await botPublic<PlayerProfile>(`characters/${slug}`);
  } catch {
    return <p className="forge-error">เซิร์ฟเวอร์เกมไม่ตอบสนอง ลองใหม่อีกครั้ง</p>;
  }
  if (!p) notFound();

  const role = GAME.roles.find((r) => r.id === p.role);
  const icon = GAME.icons.find((i) => i.id === p.icon);
  const img = (slot: string) => p.images.filter((i) => i.slot === slot).sort((a, b) => b.at - a.at);
  const portrait = img("portrait")[0] ?? img("art")[0] ?? img("gallery")[0];
  const art = img("art")[0];
  const sheet = img("sheet")[0];
  const gallery = img("gallery");
  const avatar = portrait ? publicUrl(portrait.key) : roleAvatar(p.role);
  const st = p.status;

  return (
    <article className="player-profile" style={{ "--door": doorVar(icon?.door ?? "red") } as React.CSSProperties}>
      <section className="step forge-dossier">
        <div className="forge-portrait">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {avatar ? <img src={avatar} alt={`ภาพโปรไฟล์ ${p.name}`} /> : <span>No Record</span>}
          <Brackets />
        </div>
        <div className="forge-id">
          <p className="forge-file">M.A.I.D.S · PERSONNEL FILE</p>
          <h1 className="forge-name">
            {p.name}
            {p.fiend && <span className="player-fiend">FIEND</span>}
          </h1>
          <p className="sub">
            {role ? `${role.emoji} ${role.name}` : p.role} · {icon ? `${icon.emoji} ${icon.name}` : p.icon}
          </p>
          <dl className="forge-status">
            <div><dt>เลเวล</dt><dd>{p.level} <small>({st.xp}/{st.xpNext} XP)</small></dd></div>
            <div><dt>เนื้อกาย</dt><dd>{st.hp}/{st.maxHp}</dd></div>
            <div><dt>แรง</dt><dd>{st.stamina}/{st.maxStamina}</dd></div>
            <div><dt>ความเป็นมนุษย์</dt><dd>{st.humanity}</dd></div>
            <div><dt>สติ</dt><dd>{st.sanity}</dd></div>
            <div><dt>เนื้อสด</dt><dd>🥩 {st.flesh}</dd></div>
            <div><dt>พละ / ว่องไว / สัมผัส</dt><dd>{st.stats.str} / {st.stats.agi} / {st.stats.int}</dd></div>
            <div><dt>อยู่ที่</dt><dd>{st.where}</dd></div>
          </dl>
        </div>
      </section>

      {p.bio && (
        <section className="step">
          <h2 className="player-h">บันทึกตัวละคร</h2>
          <p className="player-bio">{p.bio}</p>
        </section>
      )}

      {(art || sheet || p.sprite) && (
        <section className="step player-art">
          {p.sprite && (
            <figure>
              <div className="sprite-view">
                <PlayerSprite rig={p.sprite} url={publicUrl(p.sprite.base)} name={p.name} />
              </div>
              <figcaption>สไปรต์</figcaption>
            </figure>
          )}
          {art && (
            <figure>
              <a href={publicUrl(art.key)} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={publicUrl(art.key)} alt={`ภาพตัวละคร ${p.name}`} loading="lazy" />
              </a>
              <figcaption>ภาพตัวละคร</figcaption>
            </figure>
          )}
          {sheet && (
            <figure>
              <a href={publicUrl(sheet.key)} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={publicUrl(sheet.key)} alt={`ชีทตัวละคร ${p.name}`} loading="lazy" />
              </a>
              <figcaption>ชีทตัวละคร</figcaption>
            </figure>
          )}
        </section>
      )}

      {gallery.length > 0 && (
        <section className="step">
          <h2 className="player-h">แกลเลอรี</h2>
          <div className="player-gallery">
            {gallery.map((g) => (
              <a key={g.key} href={publicUrl(g.key)} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={publicUrl(g.key)} alt={`ภาพในแกลเลอรีของ ${p.name}`} loading="lazy" />
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="step player-cols">
        <div>
          <h2 className="player-h">อุปกรณ์</h2>
          <ul className="player-list">
            <li>🗡️ {gear(p.equipped.weapon, "มือเปล่า")}</li>
            <li>🛡️ {gear(p.equipped.armor, "ไม่มีเกราะ")}</li>
          </ul>
          {p.blessings.length > 0 && (
            <>
              <h2 className="player-h">พรเทพ</h2>
              <ul className="player-list">
                {p.blessings.map((b) => (
                  <li key={b.icon}>
                    {GAME.icons.find((i) => i.id === b.icon)?.emoji} {b.name} {"◆".repeat(b.tier)}
                    {"◇".repeat(Math.max(0, 5 - b.tier))}
                  </li>
                ))}
              </ul>
            </>
          )}
          {p.mutations.length > 0 && (
            <>
              <h2 className="player-h">การกลายพันธุ์</h2>
              <ul className="player-list">
                {p.mutations.map((m, n) => (
                  <li key={n}>🧬 {m}</li>
                ))}
              </ul>
            </>
          )}
          <h2 className="player-h">บันทึกการเอาตัวรอด</h2>
          <ul className="player-list">
            <li>ดันเจียนที่ผ่าน {p.record.dungeonsCleared}</li>
            <li>เหตุการณ์ {p.record.eventsCompleted}</li>
            <li>ตาย {p.record.deaths} · สติแตก {p.record.breakdowns}</li>
          </ul>
        </div>
        <div>
          <h2 className="player-h">กระเป๋า</h2>
          {p.inventory.length ? (
            <ul className="player-inv">
              {p.inventory.map((it) => (
                <li key={it.id}>
                  <span>{it.emoji}</span> {it.name} <b>×{it.qty}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sub">กระเป๋าว่างเปล่า</p>
          )}
        </div>
      </section>
    </article>
  );
}
