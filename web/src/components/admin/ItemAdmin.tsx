"use client";

/**
 * /admin item editor: every item (code + custom), search/filter, edit numbers/text/rarity/placement, upload art,
 * create new items. Only admins get data — the bot checks the Discord username (ADMIN_USERS) on every call.
 */
import { useEffect, useMemo, useState } from "react";
import { api, jsonInit, shrink } from "@/lib/client";
import type { AdminCatalog, AdminItem, ItemPlacement, ItemType, Rarity } from "@/lib/types";
import { Spinner, ToastProvider, useToast } from "../profile/ui";

const TYPE_LABEL: Record<ItemType, string> = {
  consumable: "ของกิน/ใช้",
  weapon: "อาวุธ",
  armor: "เกราะ",
  material: "วัตถุดิบ",
  vintage: "ของเก่า",
  furniture: "เฟอร์นิเจอร์",
};
const RARITY_LABEL: Record<Rarity, string> = { common: "ธรรมดา", uncommon: "ไม่ธรรมดา", rare: "หายาก", legendary: "ตำนาน" };
const NUMBERS = [
  ["heal", "🩸 เนื้อกาย", "consumable"],
  ["stamina", "⚡ แรง", "consumable"],
  ["sanity", "🧠 สติ", "consumable"],
  ["humanity", "🫀 ความเป็นมนุษย์", "consumable"],
  ["atk", "⚔️ ดาเมจ (atk)", "weapon"],
  ["def", "🛡️ ลดดาเมจ (def)", "armor"],
] as const;
/** longest edge of uploaded art (cards draw it ≤ 64px, rooms up to ~300px tall) */
const ART_DIM = 1024;

type Draft = Omit<AdminItem, "value" | "heal" | "stamina" | "sanity" | "humanity" | "atk" | "def" | "sizeCm"> &
  Record<"value" | "heal" | "stamina" | "sanity" | "humanity" | "atk" | "def" | "sizeCm", string>;

const str = (n: number | undefined) => (n ? String(n) : "");
const toDraft = (it: AdminItem): Draft => ({
  ...it,
  value: String(it.value ?? 0),
  heal: str(it.heal),
  stamina: str(it.stamina),
  sanity: str(it.sanity),
  humanity: str(it.humanity),
  atk: str(it.atk),
  def: str(it.def),
  sizeCm: str(it.sizeCm),
});
const blank = (): Draft =>
  toDraft({
    id: "",
    name: "",
    emoji: "📦",
    type: "material",
    description: "",
    value: 10,
    rarity: "common",
    image: null,
    imageKey: null,
    custom: true,
    effects: "",
    special: [],
    where: { shop: [], local: [], tiers: [], decor: [] },
  });

export function ItemAdmin() {
  return (
    <ToastProvider>
      <AdminBody />
    </ToastProvider>
  );
}

function AdminBody() {
  const toast = useToast();
  const [cat, setCat] = useState<AdminCatalog | null>(null);
  const [err, setErr] = useState<{ status: number; text: string } | null>(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState<ItemType | "">("");
  const [rarity, setRarity] = useState<Rarity | "">("");
  const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/items")
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) setErr({ status: r.status, text: d.error ?? "โหลดไม่สำเร็จ" });
        else setCat(d as AdminCatalog);
      })
      .catch(() => setErr({ status: 0, text: "เชื่อมต่อไม่ได้" }));
  }, []);

  const list = useMemo(() => {
    if (!cat) return [];
    const k = q.trim().toLowerCase();
    return cat.items.filter(
      (it) => (!type || it.type === type) && (!rarity || it.rarity === rarity) && (!k || it.name.toLowerCase().includes(k) || it.id.includes(k) || it.emoji === k),
    );
  }, [cat, q, type, rarity]);

  const open = (it: AdminItem) => {
    setSel(it.id);
    setDraft(toDraft(it));
    setIsNew(false);
  };
  const create = () => {
    setSel(null);
    setDraft(blank());
    setIsNew(true);
  };
  const upsert = (it: AdminItem) => {
    setCat((c) => (c ? { ...c, items: c.items.some((x) => x.id === it.id) ? c.items.map((x) => (x.id === it.id ? it : x)) : [...c.items, it] } : c));
    setSel(it.id);
    setDraft(toDraft(it));
    setIsNew(false);
  };

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      const r = await api<{ item: AdminItem }>("/api/admin/item", jsonInit("PUT", { item: draft, isNew }));
      upsert({ ...r.item, edited: !r.item.custom });
      toast.ok(isNew ? `สร้าง ${r.item.name} แล้ว` : `บันทึก ${r.item.name} แล้ว`);
    } catch (e) {
      toast.err((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    if (!draft || !confirm(`รีเซ็ต ${draft.name} กลับเป็นค่าในโค้ด? (รูปที่อัปยังอยู่)`)) return;
    setBusy(true);
    try {
      const r = await api<{ item: AdminItem }>("/api/admin/item/reset", jsonInit("POST", { id: draft.id }));
      upsert({ ...r.item, edited: false });
      toast.ok("รีเซ็ตแล้ว");
    } catch (e) {
      toast.err((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file: File) => {
    if (!draft) return;
    setBusy(true);
    try {
      const blob = await shrink(file, ART_DIM);
      const bmp = await createImageBitmap(blob);
      const fd = new FormData();
      fd.set("id", draft.id);
      fd.set("file", blob, "art.webp");
      fd.set("w", String(bmp.width));
      fd.set("h", String(bmp.height));
      const r = await api<{ item: AdminItem }>("/api/admin/item/image", { method: "POST", body: fd });
      upsert({ ...r.item, edited: cat?.items.find((x) => x.id === r.item.id)?.edited });
      toast.ok("อัปรูปแล้ว");
    } catch (e) {
      toast.err((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const removeArt = async () => {
    if (!draft || !confirm("ลบรูป กลับไปใช้อีโมจิ?")) return;
    setBusy(true);
    try {
      const r = await api<{ item: AdminItem }>("/api/admin/item/image", jsonInit("DELETE", { id: draft.id }));
      upsert({ ...r.item, edited: cat?.items.find((x) => x.id === r.item.id)?.edited });
      toast.ok("ลบรูปแล้ว");
    } catch (e) {
      toast.err((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (err)
    return (
      <div className="adm-gate">
        <p>{err.status === 403 ? "🔒 หน้านี้สำหรับทีมแอดมินเท่านั้น" : err.text}</p>
        {err.status === 401 && (
          <a className="st-btn primary" href="/create">
            เข้าสู่ระบบด้วย Discord
          </a>
        )}
      </div>
    );
  if (!cat)
    return (
      <div className="adm-gate">
        <Spinner label="กำลังโหลดไอเทม…" />
      </div>
    );

  const counts = Object.fromEntries(cat.rarities.map((r) => [r, cat.items.filter((it) => it.rarity === r).length]));

  return (
    <div className="adm">
      <div className="adm-bar">
        <input className="adm-search" placeholder="ค้นหาชื่อ / id / อีโมจิ" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={type} onChange={(e) => setType(e.target.value as ItemType | "")}>
          <option value="">ทุกประเภท</option>
          {cat.types.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <select value={rarity} onChange={(e) => setRarity(e.target.value as Rarity | "")}>
          <option value="">ทุกระดับ</option>
          {cat.rarities.map((r) => (
            <option key={r} value={r}>
              {RARITY_LABEL[r]} ({counts[r]})
            </option>
          ))}
        </select>
        <button type="button" className="st-btn primary sm" onClick={create}>
          ＋ เพิ่มไอเทม
        </button>
      </div>

      <div className="adm-body">
        <ul className="adm-list" aria-label="ไอเทมทั้งหมด">
          {list.map((it) => (
            <li key={it.id}>
              <button type="button" className={`adm-row${sel === it.id ? " on" : ""}`} onClick={() => open(it)}>
                <Icon it={it} />
                <span className="adm-row-name">
                  {it.name}
                  <small>{it.id}</small>
                </span>
                <span className="adm-row-meta">
                  <span className={`adm-rar r-${it.rarity}`}>{RARITY_LABEL[it.rarity]}</span>
                  <small>
                    {TYPE_LABEL[it.type]}
                    {it.decor ? " · แต่งห้อง" : ""} · 🥩{it.value}
                  </small>
                </span>
                {(it.custom || it.edited) && <i className="adm-dot" title={it.custom ? "สร้างเอง" : "แก้จากค่าในโค้ด"} />}
              </button>
            </li>
          ))}
          {!list.length && <li className="adm-empty">ไม่พบไอเทม</li>}
        </ul>

        <div className="adm-editor">
          {draft ? (
            <Editor
              cat={cat}
              draft={draft}
              isNew={isNew}
              busy={busy}
              set={(p) => setDraft((d) => (d ? { ...d, ...p } : d))}
              save={save}
              reset={reset}
              upload={upload}
              removeArt={removeArt}
            />
          ) : (
            <p className="adm-hint">เลือกไอเทมทางซ้ายเพื่อแก้ไข หรือกด ＋ เพิ่มไอเทม · {cat.items.length} ชิ้น</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Icon({ it, big }: { it: { emoji: string; image: string | null }; big?: boolean }) {
  return (
    <span className={`adm-icon${big ? " big" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {it.image ? <img src={it.image} alt="" loading="lazy" /> : it.emoji}
    </span>
  );
}

function Editor(props: {
  cat: AdminCatalog;
  draft: Draft;
  isNew: boolean;
  busy: boolean;
  set: (p: Partial<Draft>) => void;
  save: () => void;
  reset: () => void;
  upload: (f: File) => void;
  removeArt: () => void;
}) {
  const { cat, draft: d, isNew, busy, set } = props;
  const locked = !d.custom; // code items keep their id + type
  const furniture = d.type === "furniture" || !!d.decor;
  const toggle = (k: keyof ItemPlacement, v: string) =>
    set({ where: { ...d.where, [k]: d.where[k].includes(v) ? d.where[k].filter((x) => x !== v) : [...d.where[k], v] } });
  const checks = (k: keyof ItemPlacement, opts: { id: string; name: string }[]) => (
    <div className="adm-checks">
      {opts.map((o) => (
        <label key={o.id} className={d.where[k].includes(o.id) ? "on" : ""}>
          <input type="checkbox" checked={d.where[k].includes(o.id)} onChange={() => toggle(k, o.id)} />
          {o.name}
        </label>
      ))}
    </div>
  );
  const continents = cat.continents.map((c) => ({ id: c.id, name: `${c.emoji} ${c.name}` }));

  return (
    <form
      className="adm-form"
      onSubmit={(e) => {
        e.preventDefault();
        props.save();
      }}
    >
      <header className="adm-head">
        <Icon it={d} big />
        <div>
          <h2>{isNew ? "ไอเทมใหม่" : d.name}</h2>
          <small>
            {isNew ? "ตั้ง id ได้ครั้งเดียว" : d.id}
            {d.custom ? " · สร้างเอง" : d.edited ? " · แก้จากค่าในโค้ด" : ""}
            {d.effects ? ` · ${d.effects}` : ""}
          </small>
        </div>
      </header>

      <section className="adm-sec">
        <h3>รูป</h3>
        {isNew ? (
          <p className="adm-note">บันทึกไอเทมก่อน แล้วค่อยอัปรูป</p>
        ) : (
          <div className="adm-art">
            <label className="st-btn ghost sm">
              {d.image ? "เปลี่ยนรูป" : "อัปรูป"}
              <input
                type="file"
                accept="image/png,image/webp,image/jpeg"
                hidden
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) props.upload(f);
                }}
              />
            </label>
            {d.image && (
              <button type="button" className="st-btn danger sm" onClick={props.removeArt} disabled={busy}>
                ลบรูป
              </button>
            )}
            <p className="adm-note">PNG/WebP พื้นใส ใช้แทนอีโมจิในการ์ด Discord และบนเว็บ{furniture ? " · ใช้เป็นรูปวางในห้องด้วย" : ""}</p>
          </div>
        )}
      </section>

      <section className="adm-sec adm-grid">
        <label>
          id
          <input value={d.id} disabled={!isNew} onChange={(e) => set({ id: e.target.value.toLowerCase() })} placeholder="เช่น rusty_spoon" required />
        </label>
        <label>
          ชื่อ
          <input value={d.name} maxLength={40} onChange={(e) => set({ name: e.target.value })} required />
        </label>
        <label>
          อีโมจิ
          <input value={d.emoji} maxLength={16} onChange={(e) => set({ emoji: e.target.value })} required />
        </label>
        <label>
          ประเภท
          <select value={d.type} disabled={locked} onChange={(e) => set({ type: e.target.value as ItemType })}>
            {cat.types.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label>
          ความหายาก
          <select value={d.rarity} onChange={(e) => set({ rarity: e.target.value as Rarity })}>
            {cat.rarities.map((r) => (
              <option key={r} value={r}>
                {RARITY_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
        <label>
          ราคาร้าน 🥩
          <input type="number" min={0} value={d.value} onChange={(e) => set({ value: e.target.value })} />
        </label>
        {NUMBERS.filter(([, , t]) => t === d.type).map(([k, label]) => (
          <label key={k}>
            {label}
            <input type="number" value={d[k]} onChange={(e) => set({ [k]: e.target.value })} placeholder="0" />
          </label>
        ))}
        {d.type === "consumable" && (
          <label className="adm-inline">
            <input type="checkbox" checked={!!d.isFlesh} onChange={(e) => set({ isFlesh: e.target.checked })} />
            นับเป็นการกินเนื้อ
          </label>
        )}
        {d.type === "vintage" && d.custom && (
          <label className="adm-inline">
            <input type="checkbox" checked={!!d.decor} onChange={(e) => set({ decor: e.target.checked })} />
            ของแต่งห้อง (วางในห้องได้)
          </label>
        )}
        {furniture && (
          <label>
            สูงในห้อง (ซม.)
            <input type="number" min={5} max={300} value={d.sizeCm} onChange={(e) => set({ sizeCm: e.target.value })} placeholder="60" />
          </label>
        )}
        <label className="adm-wide">
          คำอธิบาย
          <textarea rows={3} maxLength={400} value={d.description} onChange={(e) => set({ description: e.target.value })} />
        </label>
        {d.special.length > 0 && <p className="adm-note adm-wide">มีความสามารถพิเศษในโค้ด ({d.special.join(", ")}) — แก้จากหน้านี้ไม่ได้ แต่ยังทำงานเหมือนเดิม</p>}
      </section>

      <section className="adm-sec">
        <h3>ขายที่ร้าน</h3>
        {checks("shop", [{ id: "home", name: "🔪 ร้านเนื้อ Rouge Land" }, ...continents])}
        <h3>ดรอปจากมอน · ของประจำทวีป (10% ต่อตัว)</h3>
        {checks("local", continents)}
        <h3>ดรอปจากมอน · อุปกรณ์ตามระดับเมือง</h3>
        {checks("tiers", cat.tiers)}
        {d.decor && (
          <>
            <h3>ค้นซากหลังล่า · ของแต่งห้อง</h3>
            {checks("decor", [{ id: "any", name: "🌍 ทุกเมือง" }, ...continents])}
          </>
        )}
        <p className="adm-note">ในแต่ละกอง โอกาสได้ชิ้นนี้ขึ้นกับความหายาก: ธรรมดา ×4 · ไม่ธรรมดา ×2 · หายาก ×1 · ตำนาน ×0.4</p>
      </section>

      <footer className="adm-foot">
        {!isNew && !d.custom && d.edited && (
          <button type="button" className="st-btn ghost sm" onClick={props.reset} disabled={busy}>
            รีเซ็ตเป็นค่าในโค้ด
          </button>
        )}
        <button type="submit" className="st-btn primary" disabled={busy}>
          {busy ? <Spinner /> : isNew ? "สร้างไอเทม" : "บันทึก"}
        </button>
      </footer>
    </form>
  );
}
