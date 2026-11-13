"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { doorVar } from "@/lib/md";
import type { ParsedSprite } from "@/lib/psd";
import templateRig from "@/data/sprite-template.json";
import { HEIGHT_DEFAULT, HEIGHT_MAX, HEIGHT_MIN, TEMPLATE_GROUPS, type Rig } from "@/lib/rig";

/** Default sprite (split from the template PSD by `npm run web:template`) shown until a player uploads their own. */
const TEMPLATE_RIG = templateRig as Rig;
const TEMPLATE_PSD = "/templates/fleshfall-sprite-template.psd";
const templateSrc = (id: string, ext: string) => `/sprites/template/${id}.${ext}`;
import { SpriteStage } from "./SpriteStage";
import type { AccountView, ImageSlot, ImageSlotDef, MeResponse } from "@/lib/types";

export interface ForgeRole { id: string; name: string; emoji: string; short: string }
export interface ForgeIcon { id: string; name: string; emoji: string; concept: string; door: string; doorName: string }

interface Props {
  roles: ForgeRole[];
  icons: ForgeIcon[];
  slots: ImageSlotDef[];
}

const MAX_BYTES = 4 * 1024 * 1024;
/** Roles with a default avatar in web/public/avatar (shown until the player uploads a portrait). */
const DEFAULT_AVATAR_ROLES = new Set(["maid", "hound", "bar", "patron", "outsider"]);

/** Longest edge per slot after browser-side resize. */
const MAX_DIM: Record<ImageSlot, number> = { portrait: 1024, art: 2560, sheet: 2560, gallery: 2048 };

/** Resize + re-encode in the browser (webp, jpeg fallback) so uploads stay small and clean. */
async function shrink(file: File, maxDim: number): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  let dim = maxDim;
  for (let attempt = 0; attempt < 4; attempt++) {
    const scale = Math.min(1, dim / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bmp.width * scale));
    canvas.height = Math.max(1, Math.round(bmp.height * scale));
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const enc = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
    let blob = await enc("image/webp", 0.88);
    if (!blob || blob.type !== "image/webp") blob = await enc("image/jpeg", 0.88); // Safari without webp encode
    if (blob && blob.size <= MAX_BYTES) return blob;
    dim = Math.round(dim * 0.75);
  }
  throw new Error("ภาพใหญ่เกินไป");
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "เกิดข้อผิดพลาด");
  return data;
}

export function CharacterForge({ roles, icons, slots }: Props) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<MeResponse>("/api/me").then(setMe, (e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("login") === "failed") {
      setError("เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้ง");
    }
    load();
  }, [load]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe({ user: null, character: null, inGuild: false, guildUrl: null });
  };

  return (
    <section id="forge" className="forge" aria-live="polite">
      {error && <p className="forge-error" role="alert">{error}</p>}
      {!me ? (
        !error && <p className="forge-loading">กำลังโหลด…</p>
      ) : !me.user ? (
        <Login />
      ) : (
        <>
          <div className="forge-account">
            {me.user.avatar && <img src={me.user.avatar} alt="" width={28} height={28} />}
            <span>
              เข้าสู่ระบบเป็น <b>{me.user.username}</b>
            </span>
            <button type="button" className="forge-link" onClick={logout}>
              ออกจากระบบ
            </button>
          </div>
          {me.character && !me.character.fiend ? (
            <Dossier me={me} roles={roles} icons={icons} slots={slots} onChange={setMe} onError={setError} />
          ) : (
            <CreateForm fiend={!!me.character?.fiend} roles={roles} icons={icons} onDone={setMe} onError={setError} />
          )}
        </>
      )}
    </section>
  );
}

function Login() {
  return (
    <section className="step">
      <header>
        <span className="step-no">01</span>
        <div>
          <h3>เข้าสู่ระบบด้วย Discord</h3>
          <p className="sub">ต้องมีตัวละครก่อนจึงเข้าเซิร์ฟ FleshFall ได้ — สร้างเสร็จระบบจะพาเข้าเซิร์ฟให้ทันที</p>
        </div>
      </header>
      <ol className="flow">
        <li>หนึ่งบัญชี Discord = หนึ่งตัวละคร ผูกกันถาวร</li>
        <li>ตัวละครที่กลายเป็น Fiend จึงจะสร้างใหม่ได้</li>
      </ol>
      <a className="cta forge-cta" href="/api/auth/login">
        ✦ เข้าสู่ระบบด้วย Discord
      </a>
    </section>
  );
}

function CreateForm(props: {
  fiend: boolean;
  roles: ForgeRole[];
  icons: ForgeIcon[];
  onDone: (m: MeResponse) => void;
  onError: (e: string | null) => void;
}) {
  const { roles, icons } = props;
  const [role, setRole] = useState<string | null>(null);
  const [icon, setIcon] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const nameOk = /^[\p{L}\p{M}\p{N} ._'-]{2,32}$/u.test(name.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || !icon || !nameOk) return;
    setBusy(true);
    props.onError(null);
    try {
      props.onDone(
        await api<MeResponse>("/api/me/character", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: name.trim(), role, icon }),
        }),
      );
      window.scrollTo({ top: document.getElementById("forge")?.offsetTop ?? 0, behavior: "smooth" });
    } catch (err) {
      props.onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="create" onSubmit={submit}>
      {props.fiend && (
        <p className="forge-note">ตัวละครเดิมของคุณกลายเป็น Fiend ไปแล้ว — สร้างตัวละครใหม่ได้ (ภาพเดิมจะถูกลบ)</p>
      )}
      <section className="step">
        <header>
          <span className="step-no">02</span>
          <div>
            <h3>เลือกบทบาท</h3>
            <p className="sub">แต่ละบทบาทมีที่มาและวิธีเอาชีวิตรอดต่างกัน</p>
          </div>
        </header>
        <div className="guide-grid" role="radiogroup" aria-label="บทบาท">
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={role === r.id}
              className={`guide-card pick${role === r.id ? " on" : ""}`}
              onClick={() => setRole(r.id)}
            >
              <h4>
                {r.emoji} {r.name}
              </h4>
              <p className="sub">{r.short}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="step">
        <header>
          <span className="step-no">03</span>
          <div>
            <h3>เลือกเทพที่ศรัทธา</h3>
            <p className="sub">เทพที่คุณศรัทธาจะติดตัวไปตลอด — เลือกให้ดี</p>
          </div>
        </header>
        <div className="guide-grid" role="radiogroup" aria-label="เทพที่ศรัทธา">
          {icons.map((ic) => (
            <button
              key={ic.id}
              type="button"
              role="radio"
              aria-checked={icon === ic.id}
              className={`guide-card icon pick${icon === ic.id ? " on" : ""}`}
              style={{ "--door": doorVar(ic.door) } as React.CSSProperties}
              onClick={() => setIcon(ic.id)}
            >
              <h4>
                {ic.emoji} {ic.name}
              </h4>
              <p className="sub">{ic.doorName}</p>
              <p className="icons-concept">{ic.concept}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="step">
        <header>
          <span className="step-no">04</span>
          <div>
            <h3>ตั้งชื่อตัวละคร</h3>
            <p className="sub">2–32 ตัวอักษร · ตัวอักษร ตัวเลข เว้นวรรค และ . _ &apos; - เท่านั้น · เปลี่ยนภายหลังไม่ได้</p>
          </div>
        </header>
        <div className="forge-name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            placeholder="ชื่อตัวละคร"
            aria-label="ชื่อตัวละคร"
            autoComplete="off"
          />
          <button type="submit" className="cta" disabled={busy || !role || !icon || !nameOk}>
            {busy ? "กำลังสร้าง…" : "✦ สร้างตัวละคร"}
          </button>
        </div>
        {!role || !icon ? <p className="sub">เลือกบทบาทและเทพให้ครบก่อน</p> : null}
      </section>
    </form>
  );
}

function Dossier(props: {
  me: MeResponse;
  roles: ForgeRole[];
  icons: ForgeIcon[];
  slots: ImageSlotDef[];
  onChange: (m: MeResponse) => void;
  onError: (e: string | null) => void;
}) {
  const { me } = props;
  const c = me.character!;
  const role = props.roles.find((r) => r.id === c.role);
  const icon = props.icons.find((i) => i.id === c.icon);
  const portrait = c.images.find((i) => i.slot === "portrait");
  const [joining, setJoining] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(c.name);
  const [renaming, setRenaming] = useState(false);

  const setChar = (character: AccountView) => props.onChange({ ...me, character });

  const rename = async (e: React.FormEvent) => {
    e.preventDefault();
    setRenaming(true);
    props.onError(null);
    try {
      const r = await api<{ character: AccountView }>("/api/me/character", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      setChar(r.character);
      setEditing(false);
    } catch (err) {
      props.onError((err as Error).message);
    } finally {
      setRenaming(false);
    }
  };
  const st = c.status;

  const join = async () => {
    setJoining(true);
    props.onError(null);
    try {
      const r = await api<{ inGuild: boolean }>("/api/me/join", { method: "POST" });
      props.onChange({ ...me, inGuild: r.inGuild });
      if (!r.inGuild) props.onError("ยังเข้าเซิร์ฟไม่ได้ — ลองออกจากระบบแล้วเข้าใหม่");
    } catch (err) {
      props.onError((err as Error).message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="create">
      <section className="step forge-dossier" style={{ "--door": doorVar(icon?.door ?? "red") } as React.CSSProperties}>
        <div className="forge-portrait">
          {portrait?.url ? (
            <img src={portrait.url} alt={`ภาพโปรไฟล์ ${c.name}`} />
          ) : DEFAULT_AVATAR_ROLES.has(c.role) ? (
            // no upload yet → the role's default avatar (same files the bot uses, src/render/kit.ts ROLE_AVATAR)
            <img src={`/avatar/role-${c.role}.webp`} alt={`ภาพเริ่มต้นของ ${role?.name ?? c.role}`} />
          ) : (
            <span>No Record</span>
          )}
        </div>
        <div className="forge-id">
          <p className="forge-file">M.A.I.D.S · PERSONNEL FILE</p>
          {editing ? (
            <form className="forge-rename" onSubmit={rename}>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                minLength={2}
                maxLength={32}
                required
                autoFocus
                aria-label="ชื่อตัวละครใหม่"
              />
              <button type="submit" className="cta" disabled={renaming || newName.trim() === c.name}>
                {renaming ? "กำลังบันทึก…" : "บันทึก"}
              </button>
              <button type="button" className="ghost" onClick={() => (setEditing(false), setNewName(c.name))}>
                ยกเลิก
              </button>
              <span className="sub">เปลี่ยนได้ชั่วโมงละครั้ง · ห้อง RP ใน Discord จะโพสต์ด้วยชื่อนี้</span>
            </form>
          ) : (
            <h3 className="forge-name">
              {c.name}
              <button type="button" className="forge-edit" onClick={() => setEditing(true)} aria-label="เปลี่ยนชื่อ" title="เปลี่ยนชื่อ">
                ✎
              </button>
            </h3>
          )}
          <p className="sub">
            {role ? `${role.emoji} ${role.name}` : c.role} · {icon ? `${icon.emoji} ${icon.name}` : c.icon}
          </p>
          {st && (
            <dl className="forge-status">
              <div><dt>เลเวล</dt><dd>{c.level} <small>({st.xp}/{st.xpNext} XP)</small></dd></div>
              <div><dt>เนื้อกาย</dt><dd>{st.hp}/{st.maxHp}</dd></div>
              <div><dt>แรง</dt><dd>{st.stamina}/{st.maxStamina}</dd></div>
              <div><dt>ความเป็นมนุษย์</dt><dd>{st.humanity}</dd></div>
              <div><dt>สติ</dt><dd>{st.sanity}</dd></div>
              <div><dt>เนื้อสด</dt><dd>🥩 {st.flesh}</dd></div>
              <div><dt>พละ / ว่องไว / สัมผัส</dt><dd>{st.stats.str} / {st.stats.agi} / {st.stats.int}</dd></div>
              <div><dt>อยู่ที่</dt><dd>{st.where}</dd></div>
            </dl>
          )}
          <div className="forge-discord">
            {me.inGuild && me.guildUrl ? (
              <a className="cta" href={me.guildUrl} target="_blank" rel="noreferrer">
                ✦ เข้า Discord
              </a>
            ) : (
              <button type="button" className="cta" onClick={join} disabled={joining}>
                {joining ? "กำลังพาเข้าเซิร์ฟ…" : "✦ เข้าร่วมเซิร์ฟ Discord"}
              </button>
            )}
            <span className="sub">{me.inGuild ? "คุณอยู่ในเซิร์ฟแล้ว เริ่มที่ห้อง #butchery" : "ตัวละครพร้อมแล้ว กดเพื่อเข้าเซิร์ฟ"}</span>
          </div>
        </div>
      </section>

      <section className="step">
        <header>
          <span className="step-no">05</span>
          <div>
            <h3>ภาพตัวละคร</h3>
            <p className="sub">อัปโหลดได้ทั้ง webp / png / jpg — ระบบย่อขนาดให้อัตโนมัติ · CW: เนื้อหารุนแรงได้ แต่ห้ามภาพผิดกฎหมาย</p>
          </div>
        </header>
        <div className="forge-slots">
          {props.slots.map((s) => (
            <Slot key={s.id} slot={s} images={c.images.filter((i) => i.slot === s.id)} onChange={setChar} onError={props.onError} />
          ))}
        </div>
      </section>

      <SpriteSection character={c} onChange={setChar} onError={props.onError} />
    </div>
  );
}

/** PSD → animated paper doll. Parsed in the browser; only the trimmed parts are uploaded. */
function SpriteSection(props: { character: AccountView; onChange: (c: AccountView) => void; onError: (e: string | null) => void }) {
  const saved = props.character.sprite;
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"parse" | "save" | "delete" | null>(null);
  const [draft, setDraft] = useState<(ParsedSprite & { urls: Map<string, string> }) | null>(null);
  const [debug, setDebug] = useState(false);
  /** slider value; null = use whatever the shown sprite has saved */
  const [heightEdit, setHeightEdit] = useState<number | null>(null);
  const shownHeight = draft?.rig.heightCm ?? saved?.heightCm ?? HEIGHT_DEFAULT;
  const heightCm = heightEdit ?? shownHeight;
  const heightDirty = !draft && !!saved && heightEdit !== null && heightEdit !== (saved.heightCm ?? HEIGHT_DEFAULT);

  const saveHeight = async () => {
    setBusy("save");
    props.onError(null);
    try {
      const r = await api<{ character: AccountView }>("/api/me/sprite", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ heightCm }),
      });
      props.onChange(r.character);
      setHeightEdit(null);
    } catch (err) {
      props.onError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const dropDraft = useCallback(() => {
    setDraft((d) => {
      d?.urls.forEach((u) => URL.revokeObjectURL(u));
      return null;
    });
  }, []);
  useEffect(() => dropDraft, [dropDraft]);

  const savedUrl = saved?.url;
  const savedSrc = useMemo(() => (savedUrl ? (id: string, ext: string) => `${savedUrl}/${id}.${ext}` : null), [savedUrl]);
  const draftSrc = useMemo(() => (draft ? (id: string) => draft.urls.get(id) ?? "" : null), [draft]);

  const pick = async (file: File) => {
    setBusy("parse");
    props.onError(null);
    dropDraft();
    try {
      const { parsePsdFile } = await import("@/lib/psd");
      const parsed = await parsePsdFile(file);
      const urls = new Map([...parsed.files].map(([id, b]) => [id, URL.createObjectURL(b as Blob)]));
      setDraft({ ...parsed, rig: { ...parsed.rig, heightCm: heightEdit ?? saved?.heightCm ?? HEIGHT_DEFAULT }, urls });
      setHeightEdit(null);
    } catch (err) {
      props.onError((err as Error).message);
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  };

  const save = async () => {
    if (!draft) return;
    setBusy("save");
    props.onError(null);
    try {
      const fd = new FormData();
      fd.set("rig", JSON.stringify({ ...draft.rig, heightCm }));
      for (const p of draft.rig.parts) fd.set(`p_${p.id}`, draft.files.get(p.id) as Blob, `${p.id}.${p.ext}`);
      const r = await api<{ character: AccountView }>("/api/me/sprite", { method: "POST", body: fd });
      props.onChange(r.character);
      dropDraft();
    } catch (err) {
      props.onError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!confirm("ลบสไปรต์ตัวละคร?")) return;
    setBusy("delete");
    props.onError(null);
    try {
      props.onChange((await api<{ character: AccountView }>("/api/me/sprite", { method: "DELETE" })).character);
    } catch (err) {
      props.onError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="step">
      <header>
        <span className="step-no">06</span>
        <div>
          <h3>สไปรต์ตัวละคร (PSD)</h3>
          <p className="sub">
            อัปโหลดไฟล์ .psd ที่แยกส่วนเป็น group ตามเทมเพลต — ระบบประกอบร่างและขยับให้อัตโนมัติ · ไฟล์ถูกแยกในเครื่องคุณ อัปโหลดแค่ชิ้นส่วน
          </p>
        </div>
      </header>
      <div className="sprite-wrap">
        <div className="sprite-view">
          {draft && draftSrc ? (
            <SpriteStage rig={draft.rig} src={draftSrc} label="ตัวอย่างสไปรต์" debug={debug} heightCm={heightCm} />
          ) : saved && savedSrc ? (
            <SpriteStage rig={saved} src={savedSrc} label={`สไปรต์ ${props.character.name}`} debug={debug} heightCm={heightCm} />
          ) : (
            <div className="sprite-template">
              <SpriteStage rig={TEMPLATE_RIG} src={templateSrc} label="สไปรต์ตัวอย่างจากเทมเพลต" debug={debug} heightCm={heightCm} />
              <span className="sprite-tag">TEMPLATE</span>
            </div>
          )}
        </div>
        <div className="sprite-side">
          <div className="sprite-height">
            <label htmlFor="sprite-height">
              ส่วนสูง <b>{heightCm} cm</b>
            </label>
            <input
              id="sprite-height"
              type="range"
              min={HEIGHT_MIN}
              max={HEIGHT_MAX}
              step={1}
              value={heightCm}
              onChange={(e) => setHeightEdit(Number(e.target.value))}
            />
            {heightDirty && (
              <button type="button" className="cta" onClick={saveHeight} disabled={!!busy}>
                {busy === "save" ? "กำลังบันทึก…" : "บันทึกส่วนสูง"}
              </button>
            )}
          </div>
          {(
            <label className="sprite-debug">
              <input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} /> แสดงจุดหมุน (debug)
            </label>
          )}
          {draft ? (
            <>
              <p className="forge-file">PREVIEW · ยังไม่บันทึก</p>
              <ul className="sprite-map">
                {draft.mapping.map((m) => (
                  <li key={m.id}>
                    <span>{m.name}</span>
                    <code>{m.id}</code>
                  </li>
                ))}
              </ul>
              {draft.warnings.length > 0 && (
                <ul className="sprite-warn">
                  {draft.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
              <div className="sprite-actions">
                <button type="button" className="cta" onClick={save} disabled={!!busy}>
                  {busy === "save" ? "กำลังบันทึก…" : "✦ บันทึกสไปรต์"}
                </button>
                <button type="button" className="forge-link" onClick={dropDraft} disabled={!!busy}>
                  ยกเลิก
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="sub">ชื่อ group ที่ระบบรู้จัก (สะกดคล้าย ๆ ได้ · ซ้าย/ขวาเดาจากตำแหน่งได้):</p>
              <p className="sprite-groups">{TEMPLATE_GROUPS.join(" · ")}</p>
              <p className="sub">
                เริ่มจากเทมเพลตได้เลย — วาดทับในแต่ละ group แล้วอัปโหลดกลับมา (ลองจับหัว ตัว สะโพก หรือมือของตัวอย่างดูได้)
              </p>
              <div className="sprite-actions">
                <button type="button" className="cta" onClick={() => input.current?.click()} disabled={!!busy}>
                  {busy === "parse" ? "กำลังแยกชิ้นส่วน…" : saved ? "อัปโหลด PSD ใหม่" : "✦ อัปโหลด PSD"}
                </button>
                <a className="cta ghost sprite-dl" href={TEMPLATE_PSD} download="fleshfall-sprite-template.psd">
                  ⬇ โหลดเทมเพลต PSD
                </a>
                {saved && (
                  <button type="button" className="forge-link" onClick={remove} disabled={!!busy}>
                    ลบสไปรต์
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept=".psd,image/vnd.adobe.photoshop"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void pick(f);
        }}
      />
    </section>
  );
}

function Slot(props: {
  slot: ImageSlotDef;
  images: AccountView["images"];
  onChange: (c: AccountView) => void;
  onError: (e: string | null) => void;
}) {
  const { slot, images } = props;
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const full = images.length >= slot.max;
  const canAdd = slot.max === 1 || !full;

  const upload = async (file: File) => {
    setBusy(true);
    props.onError(null);
    try {
      const blob = await shrink(file, MAX_DIM[slot.id]);
      const fd = new FormData();
      fd.set("slot", slot.id);
      fd.set("file", blob, `upload.${blob.type === "image/webp" ? "webp" : "jpg"}`);
      const r = await api<{ character: AccountView }>("/api/me/images", { method: "POST", body: fd });
      props.onChange(r.character);
    } catch (err) {
      props.onError((err as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const remove = async (key: string) => {
    if (!confirm("ลบภาพนี้?")) return;
    setBusy(true);
    props.onError(null);
    try {
      const r = await api<{ character: AccountView }>("/api/me/images", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key }),
      });
      props.onChange(r.character);
    } catch (err) {
      props.onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`forge-slot slot-${slot.id}`}>
      <header>
        <h4>{slot.name}</h4>
        <span className="sub">
          {slot.desc}
          {slot.max > 1 && ` · ${images.length}/${slot.max}`}
        </span>
      </header>
      <div className="forge-thumbs">
        {images.map((img) => (
          <figure key={img.key}>
            <a href={img.url} target="_blank" rel="noreferrer">
              <img src={img.url} alt={slot.name} loading="lazy" />
            </a>
            <button type="button" className="forge-x" aria-label="ลบภาพ" disabled={busy} onClick={() => remove(img.key)}>
              ✕
            </button>
          </figure>
        ))}
        {canAdd && (
          <button type="button" className="forge-add" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? "กำลังอัปโหลด…" : images.length && slot.max === 1 ? "เปลี่ยนภาพ" : "+ เพิ่มภาพ"}
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />
    </article>
  );
}
