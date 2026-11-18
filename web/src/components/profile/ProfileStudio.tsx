"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { roleAvatar } from "@/lib/avatar";
import { announceAuth, api } from "@/lib/client";
import { doorVar } from "@/lib/md";
import { ownProfilePath, type AccountView, type ImageSlotDef, type MeResponse } from "@/lib/types";
import type { ForgeIcon, ForgeRole } from "../CharacterForge";
import { Backdrop, Brackets } from "../Dossier";
import { RoomEditor } from "../RoomEditor";
import { AccountPanel } from "./AccountPanel";
import { IdentityPanel } from "./IdentityPanel";
import { ImagesPanel } from "./ImagesPanel";
import { OverviewPanel, profileTasks, type TabId } from "./OverviewPanel";
import { SpritePanel } from "./SpritePanel";
import { DirtyProvider, ToastProvider, useDirtyKeys } from "./ui";

interface Props {
  roles: ForgeRole[];
  icons: ForgeIcon[];
  slots: ImageSlotDef[];
}

type Ready = MeResponse & { user: NonNullable<MeResponse["user"]>; character: AccountView };

/** Which unsaved-change keys (useDirty) belong to which tab. */
const DIRTY_TAB: Record<string, TabId> = { name: "identity", bio: "identity", sprite: "sprite", room: "room" };

const I = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);
const TABS: { id: TabId; en: string; th: string; icon: ReactNode }[] = [
  { id: "overview", en: "OVERVIEW", th: "ภาพรวม", icon: I(<><path d="M12 3l9 9-9 9-9-9z" /><path d="M12 8l4 4-4 4-4-4z" /></>) },
  { id: "identity", en: "IDENTITY", th: "ข้อมูลตัวละคร", icon: I(<><rect x="3" y="5" width="18" height="14" /><circle cx="9" cy="11" r="2.2" /><path d="M5.8 16.2c.6-1.6 1.8-2.4 3.2-2.4s2.6.8 3.2 2.4M14.5 10h4M14.5 13.5h3" /></>) },
  { id: "images", en: "GALLERY", th: "ภาพตัวละคร", icon: I(<><rect x="3" y="4" width="18" height="16" /><circle cx="9" cy="9.5" r="1.8" /><path d="M3 17l5.5-5 4 3.5 3-2.5L21 17" /></>) },
  { id: "sprite", en: "SPRITE", th: "สไปรต์", icon: I(<><circle cx="12" cy="5.5" r="2.5" /><path d="M12 8v7M8 11l4-1.5 4 1.5M9.5 21l2.5-6 2.5 6" /></>) },
  { id: "room", en: "ROOM", th: "ห้องส่วนตัว", icon: I(<><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-5h4v5" /></>) },
  { id: "account", en: "ACCOUNT", th: "บัญชี", icon: I(<><circle cx="8" cy="12" r="3.5" /><path d="M11.5 12H21M17.5 12v3M20 12v2" /></>) },
];
const isTab = (s: string): s is TabId => TABS.some((t) => t.id === s);

export function ProfileStudio(props: Props) {
  return (
    <ToastProvider>
      <DirtyProvider>
        <Studio {...props} />
      </DirtyProvider>
    </ToastProvider>
  );
}

function Studio({ roles, icons, slots }: Props) {
  const router = useRouter();
  const [me, setMe] = useState<Ready | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("overview");
  const [visited, setVisited] = useState<ReadonlySet<TabId>>(new Set(["overview"]));
  const [welcome, setWelcome] = useState(false);
  const panelTop = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    setError(null);
    api<MeResponse>("/api/me").then(
      (m) => {
        announceAuth(m.user);
        if (!m.user) return router.replace("/create");
        if (!m.character || m.character.fiend) return router.replace("/create#forge");
        setMe(m as Ready);
      },
      (e: Error) => setError(e.message),
    );
  }, [router]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.has("welcome")) {
      setWelcome(true);
      history.replaceState(null, "", window.location.pathname + window.location.hash);
    }
    const fromHash = () => {
      const h = window.location.hash.slice(1);
      if (isTab(h)) {
        setTab(h);
        setVisited((v) => (v.has(h) ? v : new Set(v).add(h)));
      }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    load();
    return () => window.removeEventListener("hashchange", fromHash);
  }, [load]);

  const go = useCallback((t: TabId) => {
    setTab(t);
    setVisited((v) => (v.has(t) ? v : new Set(v).add(t)));
    history.replaceState(null, "", t === "overview" ? window.location.pathname : `#${t}`);
    // on narrow screens the panel sits under the tab strip — bring its top into view
    const el = panelTop.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const setChar = useCallback((character: AccountView) => setMe((m) => (m ? { ...m, character } : m)), []);
  const setGuild = useCallback((inGuild: boolean) => setMe((m) => (m ? { ...m, inGuild } : m)), []);
  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    announceAuth(null);
    router.push("/");
  }, [router]);

  if (error)
    return (
      <div className="st-fail" role="alert">
        <p className="st-kicker">CONNECTION LOST</p>
        <h2>เปิดแฟ้มไม่สำเร็จ</h2>
        <p className="st-note">{error}</p>
        <button type="button" className="st-btn primary" onClick={load}>
          ลองอีกครั้ง
        </button>
      </div>
    );
  if (!me) return <StudioSkeleton />;

  const c = me.character;
  const role = roles.find((r) => r.id === c.role);
  const icon = icons.find((i) => i.id === c.icon);
  const tasks = profileTasks(c, me.inGuild);

  return (
    <div className="studio" style={{ "--door": doorVar(icon?.door ?? "red") } as React.CSSProperties}>
      <Hero me={me} role={role} icon={icon} done={tasks.filter((t) => t.done).length} total={tasks.length} go={go} />

      <div className="st-body">
        <StudioNav tab={tab} go={go} character={c} inGuild={me.inGuild} todo={tasks.filter((t) => !t.done).length} />

        <div className="st-panels" ref={panelTop}>
          <Panel id="overview" tab={tab} visited={visited}>
            <OverviewPanel character={c} inGuild={me.inGuild} welcome={welcome} go={go} />
          </Panel>
          <Panel id="identity" tab={tab} visited={visited}>
            <IdentityPanel character={c} role={role} icon={icon} onChange={setChar} />
          </Panel>
          <Panel id="images" tab={tab} visited={visited}>
            <ImagesPanel character={c} slots={slots} onChange={setChar} />
          </Panel>
          <Panel id="sprite" tab={tab} visited={visited}>
            <SpritePanel character={c} onChange={setChar} />
          </Panel>
          <Panel id="room" tab={tab} visited={visited}>
            <RoomEditor character={c} onChange={setChar} />
          </Panel>
          <Panel id="account" tab={tab} visited={visited}>
            <AccountPanel me={me} onGuild={setGuild} onLogout={logout} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

/** Mounted on first visit, then kept (hidden) so unsaved drafts survive tab switches. */
function Panel({ id, tab, visited, children }: { id: TabId; tab: TabId; visited: ReadonlySet<TabId>; children: ReactNode }) {
  if (!visited.has(id) && tab !== id) return null;
  return (
    <section id={`panel-${id}`} role="tabpanel" aria-labelledby={`tab-${id}`} className="st-panel" hidden={tab !== id}>
      {children}
    </section>
  );
}

function Hero({ me, role, icon, done, total, go }: { me: Ready; role?: ForgeRole; icon?: ForgeIcon; done: number; total: number; go: (t: TabId) => void }) {
  const c = me.character;
  const img = (slot: string) => c.images.filter((i) => i.slot === slot).sort((a, b) => b.at - a.at)[0];
  const portrait = img("portrait") ?? img("art") ?? img("gallery");
  const src = portrait?.url ?? roleAvatar(c.role);
  const st = c.status;

  return (
    <section className="st-hero ff-host">
      <Backdrop word="PROFILE" band />
      <button type="button" className="st-portrait" onClick={() => go("images")} aria-label="เปลี่ยนภาพโปรไฟล์">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} alt="" /> : <span className="st-portrait-empty">No Record</span>}
        <span className="st-portrait-edit" aria-hidden="true">
          เปลี่ยนภาพ
        </span>
        <Brackets />
      </button>

      <div className="st-id">
        <p className="forge-file">M.A.I.D.S · PERSONNEL FILE · SETTINGS</p>
        <h1 className="st-name">{c.name}</h1>
        <p className="pf-tags">
          <span>{role ? `${role.emoji} ${role.name}` : c.role}</span>
          <span className="pf-icon">{icon ? `${icon.emoji} ${icon.name}` : c.icon}</span>
          <span>LV {c.level}</span>
          {st && <span>📍 {st.where}</span>}
        </p>
        <div className="st-hero-actions">
          {ownProfilePath(c) && (
            <a className="st-btn ghost" href={ownProfilePath(c)!} target="_blank" rel="noreferrer">
              ดูโปรไฟล์สาธารณะ ↗
            </a>
          )}
          {me.inGuild && me.guildUrl ? (
            <a className="st-btn primary" href={me.guildUrl} target="_blank" rel="noreferrer">
              ✦ เปิด Discord
            </a>
          ) : (
            <button type="button" className="st-btn primary" onClick={() => go("account")}>
              ✦ เข้าร่วมเซิร์ฟ Discord
            </button>
          )}
        </div>
      </div>

      <button type="button" className="st-hero-meter" onClick={() => go("overview")} aria-label={`แฟ้มสมบูรณ์ ${done} จาก ${total}`}>
        <span className="st-kicker">FILE</span>
        <b>
          {done}
          <small>/{total}</small>
        </b>
        <i aria-hidden="true">
          {Array.from({ length: total }, (_, n) => (
            <em key={n} className={n < done ? "on" : undefined} />
          ))}
        </i>
      </button>
    </section>
  );
}

function StudioNav({ tab, go, character: c, inGuild, todo }: { tab: TabId; go: (t: TabId) => void; character: AccountView; inGuild: boolean; todo: number }) {
  const dirty = useDirtyKeys();
  const dirtyTabs = useMemo(() => new Set([...dirty].map((k) => DIRTY_TAB[k]).filter(Boolean)), [dirty]);
  const status: Record<TabId, string> = {
    overview: todo ? `เหลือ ${todo} อย่าง` : "ครบแล้ว",
    identity: c.bio?.trim() ? "มีบันทึกแล้ว" : "ยังไม่มีบันทึก",
    images: `${c.images.length} ภาพ`,
    sprite: c.sprite ? `${c.sprite.heightCm ?? 160} cm` : "ใช้เทมเพลต",
    room: `${c.room?.items.length ?? 0} ชิ้น`,
    account: inGuild ? "อยู่ในเซิร์ฟ" : "ยังไม่เข้าเซิร์ฟ",
  };
  const warn: Partial<Record<TabId, boolean>> = { account: !inGuild };
  const list = useRef<HTMLDivElement>(null);

  // arrow keys move between tabs (WAI-ARIA tabs pattern)
  const onKey = (e: React.KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!step && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const n = e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : (i + step + TABS.length) % TABS.length;
    go(TABS[n].id);
    list.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[n]?.focus();
  };

  // keep the active tab visible in the horizontal strip on phones
  useEffect(() => {
    const el = list.current?.querySelector<HTMLElement>(`#tab-${tab}`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [tab]);

  return (
    <nav className="st-nav" aria-label="ตั้งค่าโปรไฟล์">
      <div className="st-tabs" role="tablist" aria-orientation="vertical" ref={list} onKeyDown={onKey}>
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className={`st-tab${tab === t.id ? " on" : ""}`}
            onClick={() => go(t.id)}
          >
            <span className="st-tab-icon">{t.icon}</span>
            <span className="st-tab-copy">
              <span className="st-tab-en" aria-hidden="true">{t.en}</span>
              <span className="st-tab-th">{t.th}</span>
              <span className={`st-tab-status${warn[t.id] ? " warn" : ""}`}>{status[t.id]}</span>
            </span>
            {dirtyTabs.has(t.id) && <span className="st-tab-dirty" title="มีการแก้ไขที่ยังไม่บันทึก" aria-label="ยังไม่บันทึก" />}
          </button>
        ))}
      </div>
    </nav>
  );
}

function StudioSkeleton() {
  const line = (w: string, h = 12) => <i className="sk" style={{ width: w, height: h }} />;
  return (
    <div className="studio" role="status" aria-live="polite">
      <section className="st-hero ff-host">
        <Backdrop word="PROFILE" band />
        <div className="st-portrait">
          <i className="sk sk-fill" />
          <span className="sk-seal">M.A.I.D.S</span>
          <Brackets />
        </div>
        <div className="st-id">
          <p className="forge-file sk-label">
            กำลังเปิดแฟ้ม
            <span className="sk-dots" aria-hidden="true" />
          </p>
          {line("min(340px, 80%)", 40)}
          <div className="sk-row">
            {line("110px")}
            {line("90px")}
            {line("70px")}
          </div>
          <div className="sk-row">
            {line("160px", 40)}
            {line("140px", 40)}
          </div>
        </div>
      </section>
      <div className="st-body">
        <div className="st-nav">
          <div className="st-tabs">
            {TABS.map((t) => (
              <div key={t.id} className="st-tab sk-tab">
                {line("100%", 44)}
              </div>
            ))}
          </div>
        </div>
        <div className="st-panels">
          <div className="st-card">
            {line("40%", 22)}
            <div className="sk-lines">
              {line("100%")}
              {line("92%")}
              {line("70%")}
            </div>
          </div>
          <div className="st-card">
            {line("30%", 18)}
            <i className="sk sk-block" />
          </div>
        </div>
      </div>
      <span className="sr-only">กำลังโหลดโปรไฟล์</span>
    </div>
  );
}
