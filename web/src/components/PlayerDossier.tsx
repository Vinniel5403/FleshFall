import { Backdrop, Brackets } from "@/components/Dossier";
import { ZoomLink } from "@/components/ZoomLink";
import { PlayerRoom } from "@/components/PlayerRoom";
import { PlayerSprite } from "@/components/PlayerSprite";
import { roleAvatar } from "@/lib/avatar";
import { GAME } from "@/lib/game";
import { doorVar } from "@/lib/md";
import { publicUrl } from "@/lib/server/r2";
import type { PlayerProfile } from "@/lib/types";

/** Full public character file (server component) — shared by /profile/<handle> and /players/<slug>. Styles: players.css + forge.css. */
const gear = (g: PlayerProfile["equipped"]["weapon"]) =>
  g ? `${g.name}${g.level ? ` +${g.level}` : ""}` : null;
const pct = (v: number, max: number) =>
  `${Math.max(0, Math.min(100, max > 0 ? (v / max) * 100 : 0))}%`;

function Bar({
  label,
  value,
  max,
  unit,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  unit?: string;
  tone: string;
}) {
  return (
    <div className={`pf-meter ${tone}`}>
      <div className="pf-meter-top">
        <span>{label}</span>
        <b>
          {value}
          <small>
            /{max}
            {unit}
          </small>
        </b>
      </div>
      <i>
        <em style={{ width: pct(value, max) }} />
      </i>
    </div>
  );
}

export function PlayerDossier({ p }: { p: PlayerProfile }) {
  const role = GAME.roles.find((r) => r.id === p.role);
  const icon = GAME.icons.find((i) => i.id === p.icon);
  const img = (slot: string) =>
    p.images.filter((i) => i.slot === slot).sort((a, b) => b.at - a.at);
  const portrait = img("portrait")[0] ?? img("art")[0] ?? img("gallery")[0];
  const art = img("art")[0];
  const sheet = img("sheet")[0];
  const gallery = img("gallery");
  const avatar = portrait ? publicUrl(portrait.key) : roleAvatar(p.role);
  const st = p.status;
  const weapon = gear(p.equipped.weapon);
  const armor = gear(p.equipped.armor);
  const r = p.record;
  const hasMain = !!(p.bio || art || sheet || p.sprite || gallery.length);

  return (
    <article
      className={`player-profile${p.fiend ? " is-fiend" : ""}`}
      style={{ "--door": doorVar(icon?.door ?? "red") } as React.CSSProperties}
    >
      {/* ---------- file header: portrait | identity + vitals ---------- */}
      <section className="pf-hero ff-host">
        <Backdrop band />
        <div className="pf-portrait">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {avatar ? (
            <img src={avatar} alt={`ภาพโปรไฟล์ ${p.name}`} />
          ) : (
            <span>No Record</span>
          )}
          <Brackets />
        </div>
        <div className="pf-id">
          <p className="forge-file">M.A.I.D.S · PERSONNEL FILE</p>
          <h1 className="pf-name">
            {p.name}
            {p.fiend && <span className="player-fiend">FIEND</span>}
          </h1>
          <p className="pf-tags">
            <span>{role ? `${role.emoji} ${role.name}` : p.role}</span>
            <span className="pf-icon">
              {icon ? `${icon.emoji} ${icon.name}` : p.icon}
            </span>
            <span>{st.where}</span>
          </p>

          <div className="pf-level">
            <span className="pf-lv">
              <small>LV</small>
              {p.level}
            </span>
            <Bar
              label="ประสบการณ์"
              value={st.xp}
              max={st.xpNext}
              unit=" XP"
              tone="xp"
            />
          </div>

          <div className="pf-meters">
            <Bar label="เนื้อกาย" value={st.hp} max={st.maxHp} tone="hp" />
            <Bar label="แรง" value={st.stamina} max={st.maxStamina} tone="st" />
            <Bar label="ความเป็นมนุษย์" value={st.humanity} max={100} tone="hu" />
            <Bar label="สติ" value={st.sanity} max={100} tone="sa" />
          </div>

          <dl className="pf-stats">
            <div>
              <dt>พละ</dt>
              <dd>{st.stats.str}</dd>
            </div>
            <div>
              <dt>ว่องไว</dt>
              <dd>{st.stats.agi}</dd>
            </div>
            <div>
              <dt>สัมผัส</dt>
              <dd>{st.stats.int}</dd>
            </div>
            <div>
              <dt>เนื้อสด</dt>
              <dd>🥩 {st.flesh}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="step" id="room">
        <h2 className="pf-h">ห้องส่วนตัว</h2>
        <div className="room-view">
          <PlayerRoom
            room={p.room}
            rig={p.sprite}
            url={p.sprite ? publicUrl(p.sprite.base) : null}
            name={p.name}
          />
        </div>
      </section>

      {/* ---------- body: main column (story + art) | side column (gear + numbers); no story/art → side cards fill the row ---------- */}
      <div className={`pf-body${hasMain ? "" : " solo"}`}>
        <div className="pf-main" hidden={!hasMain}>
          {p.bio && (
            <section className="step">
              <h2 className="pf-h">บันทึกตัวละคร</h2>
              <p className="player-bio">{p.bio}</p>
            </section>
          )}

          {(art || sheet || p.sprite) && (
            <section className="step">
              <h2 className="pf-h">ภาพตัวละคร</h2>
              <div className="pf-art">
                {p.sprite && (
                  <figure>
                    <div className="sprite-view">
                      <PlayerSprite
                        rig={p.sprite}
                        url={publicUrl(p.sprite.base)}
                        name={p.name}
                      />
                    </div>
                    <figcaption>สไปรต์ · จับลากได้</figcaption>
                  </figure>
                )}
                {art && (
                  <figure>
                    <ZoomLink src={publicUrl(art.key)} alt={`ภาพตัวละคร ${p.name}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={publicUrl(art.key)}
                        alt={`ภาพตัวละคร ${p.name}`}
                        loading="lazy"
                      />
                    </ZoomLink>
                    <figcaption>ภาพตัวละคร</figcaption>
                  </figure>
                )}
                {sheet && (
                  <figure className="wide">
                    <ZoomLink src={publicUrl(sheet.key)} alt={`ชีทตัวละคร ${p.name}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={publicUrl(sheet.key)}
                        alt={`ชีทตัวละคร ${p.name}`}
                        loading="lazy"
                      />
                    </ZoomLink>
                    <figcaption>ชีทตัวละคร</figcaption>
                  </figure>
                )}
              </div>
            </section>
          )}

          {gallery.length > 0 && (
            <section className="step">
              <h2 className="pf-h">แกลเลอรี</h2>
              <div className="player-gallery">
                {gallery.map((g) => (
                  <ZoomLink key={g.key} src={publicUrl(g.key)} alt={`ภาพในแกลเลอรีของ ${p.name}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={publicUrl(g.key)}
                      alt={`ภาพในแกลเลอรีของ ${p.name}`}
                      loading="lazy"
                    />
                  </ZoomLink>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="pf-side">
          <section className="step">
            <h2 className="pf-h">อุปกรณ์</h2>
            <dl className="pf-gear">
              <div>
                <dt>อาวุธ</dt>
                <dd>
                  <span className="pf-emo">
                    {p.equipped.weapon?.emoji ?? "✊"}
                  </span>
                  {weapon ?? <span className="pf-muted">มือเปล่า</span>}
                </dd>
              </div>
              <div>
                <dt>เกราะ</dt>
                <dd>
                  <span className="pf-emo">
                    {p.equipped.armor?.emoji ?? "·"}
                  </span>
                  {armor ?? <span className="pf-muted">ไม่มีเกราะ</span>}
                </dd>
              </div>
            </dl>
          </section>

          {(p.blessings.length > 0 || p.mutations.length > 0) && (
            <section className="step">
              {p.blessings.length > 0 && (
                <>
                  <h2 className="pf-h">พรแห่งรูปเคารพ</h2>
                  <ul className="pf-list">
                    {p.blessings.map((b) => (
                      <li key={b.icon}>
                        <span>
                          {GAME.icons.find((i) => i.id === b.icon)?.emoji}{" "}
                          {b.name}
                        </span>
                        <span
                          className="pf-pips"
                          aria-label={`ระดับ ${b.tier} จาก 5`}
                        >
                          {"◆".repeat(b.tier)}
                          <span>{"◇".repeat(Math.max(0, 5 - b.tier))}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {p.mutations.length > 0 && (
                <>
                  <h2 className="pf-h">การกลายพันธุ์</h2>
                  <ul className="pf-list">
                    {p.mutations.map((m, n) => (
                      <li key={n}>🧬 {m}</li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          <section className="step">
            <h2 className="pf-h">บันทึกการเอาตัวรอด</h2>
            <dl className="pf-record">
              <div>
                <dt>ดันเจียนที่ผ่าน</dt>
                <dd>{r.dungeonsCleared}</dd>
              </div>
              <div>
                <dt>เหตุการณ์</dt>
                <dd>{r.eventsCompleted}</dd>
              </div>
              <div>
                <dt>ตาย</dt>
                <dd>{r.deaths}</dd>
              </div>
              <div>
                <dt>สติแตก</dt>
                <dd>{r.breakdowns}</dd>
              </div>
            </dl>
          </section>

          <section className="step">
            <h2 className="pf-h">
              กระเป๋า <small>{p.inventory.length} ชนิด</small>
            </h2>
            {p.inventory.length ? (
              <ul className="pf-inv">
                {p.inventory.map((it) => (
                  <li key={it.id}>
                    <span className="pf-emo">{it.emoji}</span>
                    <span className="pf-inv-name">{it.name}</span>
                    <b>×{it.qty}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="pf-muted">กระเป๋าว่างเปล่า</p>
            )}
          </section>
        </aside>
      </div>
    </article>
  );
}
