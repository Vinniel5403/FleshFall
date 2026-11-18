"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { announceAuth, api, jsonInit } from "@/lib/client";
import { doorVar } from "@/lib/md";
import type { MeResponse } from "@/lib/types";

export interface ForgeRole { id: string; name: string; emoji: string; short: string }
export interface ForgeIcon { id: string; name: string; emoji: string; concept: string; door: string; doorName: string }

interface Props {
  roles: ForgeRole[];
  icons: ForgeIcon[];
}

/**
 * /create: Discord login → pick role / Icon / name. Players who already have a (living) character
 * are sent to /profile, where all the settings live.
 */
export function CharacterForge({ roles, icons }: Props) {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<MeResponse>("/api/me").then(
      (m) => {
        announceAuth(m.user);
        if (m.user && m.character && !m.character.fiend) return router.replace("/profile");
        setMe(m);
      },
      (e: Error) => setError(e.message),
    );
  }, [router]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("login") === "failed") {
      setError("เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้ง");
    }
    load();
  }, [load]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    announceAuth(null);
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {me.user.avatar && <img src={me.user.avatar} alt="" width={28} height={28} />}
            <span>
              เข้าสู่ระบบเป็น <b>{me.user.username}</b>
            </span>
            <button type="button" className="forge-link" onClick={logout}>
              ออกจากระบบ
            </button>
          </div>
          <CreateForm
            fiend={!!me.character?.fiend}
            roles={roles}
            icons={icons}
            onDone={() => router.push("/profile?welcome=1")}
            onError={setError}
          />
        </>
      )}
    </section>
  );
}

function Login() {
  return (
    <section className="step forge-login">
      <header>
        <span className="step-no">01</span>
        <div>
          <h3>เข้าสู่ระบบด้วย Discord</h3>
          <p className="sub">ต้องมีตัวละครก่อนจึงเข้าเซิร์ฟ FleshFall ได้ — สร้างเสร็จระบบจะพาเข้าเซิร์ฟให้ทันที</p>
        </div>
      </header>
      <ol className="flow">
        <li>หนึ่งบัญชี Discord = หนึ่งตัวละคร ผูกกันถาวร</li>
        <li>มีตัวละครอยู่แล้ว? เข้าสู่ระบบแล้วระบบจะพาไปหน้าโปรไฟล์</li>
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
  onDone: () => void;
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
      await api<MeResponse>("/api/me/character", jsonInit("POST", { name: name.trim(), role, icon }));
      props.onDone();
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
            <p className="sub">2–32 ตัวอักษร · ตัวอักษร ตัวเลข เว้นวรรค และ . _ &apos; - เท่านั้น · เปลี่ยนได้ภายหลังในหน้าโปรไฟล์</p>
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
