"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { ownProfilePath, type MeResponse } from "@/lib/types";
import { Card, PanelHead, Spinner, useToast } from "./ui";

export function AccountPanel({
  me,
  onGuild,
  onLogout,
}: {
  me: MeResponse & { user: NonNullable<MeResponse["user"]>; character: NonNullable<MeResponse["character"]> };
  onGuild: (inGuild: boolean) => void;
  onLogout: () => Promise<void>;
}) {
  const toast = useToast();
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const c = me.character;
  const publicUrl = ownProfilePath(c);

  const join = async () => {
    setJoining(true);
    try {
      const r = await api<{ inGuild: boolean }>("/api/me/join", { method: "POST" });
      onGuild(r.inGuild);
      if (r.inGuild) toast.ok("เข้าเซิร์ฟ FleshFall แล้ว — เริ่มที่ห้อง #butchery");
      else toast.err("ยังเข้าเซิร์ฟไม่ได้ — ลองออกจากระบบแล้วเข้าใหม่");
    } catch (err) {
      toast.err((err as Error).message);
    } finally {
      setJoining(false);
    }
  };

  const copy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(new URL(publicUrl, window.location.origin).href);
      toast.ok("คัดลอกลิงก์โปรไฟล์แล้ว");
    } catch {
      toast.err("คัดลอกไม่สำเร็จ");
    }
  };

  const logout = async () => {
    setLeaving(true);
    await onLogout();
  };

  const since = new Date(c.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="st-stack">
      <PanelHead en="ACCOUNT" title="บัญชี" desc="บัญชี Discord ที่ผูกกับตัวละคร การเข้าเซิร์ฟ และลิงก์โปรไฟล์สาธารณะ" />

      <Card title="Discord">
        <div className="st-discord">
          <span className="st-discord-avatar" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {me.user.avatar ? <img src={me.user.avatar} alt="" /> : <i>{me.user.username.slice(0, 1).toUpperCase()}</i>}
          </span>
          <div className="st-discord-id">
            <b>{me.user.username}</b>
            <span>ผูกกับ {c.name} ตั้งแต่ {since}</span>
          </div>
          <span className={`st-status ${me.inGuild ? "ok" : "warn"}`}>{me.inGuild ? "อยู่ในเซิร์ฟแล้ว" : "ยังไม่ได้เข้าเซิร์ฟ"}</span>
        </div>
        <div className="st-row">
          {me.inGuild && me.guildUrl ? (
            <a className="st-btn primary" href={me.guildUrl} target="_blank" rel="noreferrer">
              ✦ เปิด Discord
            </a>
          ) : (
            <button type="button" className="st-btn primary" onClick={join} disabled={joining}>
              {joining ? <Spinner label="กำลังพาเข้าเซิร์ฟ" /> : "✦ เข้าร่วมเซิร์ฟ Discord"}
            </button>
          )}
          <span className="st-note">{me.inGuild ? "เล่นได้ที่ห้อง #butchery — กด 📜 โปรไฟล์ เพื่อดูตัวละคร" : "ตัวละครพร้อมแล้ว กดเพื่อให้ระบบพาเข้าเซิร์ฟ"}</span>
        </div>
      </Card>

      {publicUrl && (
        <Card title="โปรไฟล์สาธารณะ">
          <p className="st-note">ทุกคนเปิดดูได้ — ภาพ สไปรต์ ห้อง บันทึก ค่าพลัง และกระเป๋า (ไม่มีข้อมูล Discord ของคุณ)</p>
          <div className="st-share">
            <code>{publicUrl}</code>
            <button type="button" className="st-btn ghost" onClick={copy}>
              คัดลอกลิงก์
            </button>
            <a className="st-btn ghost" href={publicUrl} target="_blank" rel="noreferrer">
              เปิดดู ↗
            </a>
          </div>
        </Card>
      )}

      <Card title="กฎของบัญชี">
        <ul className="st-rules">
          <li>หนึ่งบัญชี Discord = หนึ่งตัวละคร ผูกกันถาวร</li>
          <li>บทบาทและเทพที่ศรัทธาเปลี่ยนไม่ได้ ชื่อเปลี่ยนได้ชั่วโมงละครั้ง</li>
          <li>ตัวละครที่กลายเป็น Fiend เท่านั้นจึงสร้างใหม่ได้ (ภาพเดิมจะถูกลบ)</li>
        </ul>
      </Card>

      <Card title="ออกจากระบบ" className="st-danger-zone">
        <div className="st-row">
          <span className="st-note">ออกจากระบบบนเบราว์เซอร์นี้ ตัวละครและข้อมูลยังอยู่ครบ</span>
          <button type="button" className="st-btn danger" onClick={logout} disabled={leaving}>
            {leaving ? <Spinner label="กำลังออก" /> : "ออกจากระบบ"}
          </button>
        </div>
      </Card>
    </div>
  );
}
