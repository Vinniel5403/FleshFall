"use client";

/** Small building blocks for the /profile studio: toasts, unsaved-change tracking, panel heads, save bars, meters. */
import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/* ---------------- toasts ---------------- */

type ToastKind = "ok" | "err" | "info";
interface ToastItem { id: number; kind: ToastKind; text: string }
interface ToastApi { ok: (t: string) => void; err: (t: string) => void; info: (t: string) => void }

const ToastCtx = createContext<ToastApi>({ ok: () => {}, err: () => {}, info: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const drop = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (kind: ToastKind, text: string) => {
      const id = ++seq.current;
      setItems((l) => [...l.filter((t) => t.text !== text), { id, kind, text }].slice(-3));
      setTimeout(() => drop(id), kind === "err" ? 7000 : 3200);
    },
    [drop],
  );
  const api = useMemo<ToastApi>(() => ({ ok: (t) => push("ok", t), err: (t) => push("err", t), info: (t) => push("info", t) }), [push]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="st-toasts" aria-live="polite">
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, transition: { duration: 0.2 } }}
              transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
              className={`st-toast ${t.kind}`}
              role={t.kind === "err" ? "alert" : "status"}
            >
              <span className="st-toast-mark" aria-hidden="true">{t.kind === "ok" ? "✓" : t.kind === "err" ? "!" : "◆"}</span>
              <span className="st-toast-text">{t.text}</span>
              <button type="button" className="st-toast-x" aria-label="ปิด" onClick={() => drop(t.id)}>✕</button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------------- unsaved changes ---------------- */

interface DirtyApi { set: (key: string, dirty: boolean) => void; keys: ReadonlySet<string> }
const DirtyCtx = createContext<DirtyApi>({ set: () => {}, keys: new Set() });
export const useDirtyKeys = () => useContext(DirtyCtx).keys;

/** Report a panel's unsaved state; the studio marks its tab and guards page unload. */
export function useDirty(key: string, dirty: boolean) {
  const { set } = useContext(DirtyCtx);
  useEffect(() => {
    set(key, dirty);
    return () => set(key, false);
  }, [key, dirty, set]);
}

export function DirtyProvider({ children }: { children: ReactNode }) {
  const [keys, setKeys] = useState<ReadonlySet<string>>(new Set());
  const set = useCallback((key: string, dirty: boolean) => {
    setKeys((prev) => {
      if (prev.has(key) === dirty) return prev;
      const next = new Set(prev);
      if (dirty) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);
  useEffect(() => {
    if (!keys.size) return;
    const guard = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [keys]);
  const api = useMemo(() => ({ set, keys }), [set, keys]);
  return <DirtyCtx.Provider value={api}>{children}</DirtyCtx.Provider>;
}

/* ---------------- layout pieces ---------------- */

/** Panel heading: small Cinzel file label + Thai title + one-line help, optional actions on the right. */
export function PanelHead({ en, title, desc, children }: { en: string; title: string; desc?: ReactNode; children?: ReactNode }) {
  return (
    <header className="st-head">
      <div className="st-head-copy">
        <p className="st-kicker" aria-hidden="true">{en}</p>
        <h2>{title}</h2>
        {desc && <p className="st-desc">{desc}</p>}
      </div>
      {children && <div className="st-head-actions">{children}</div>}
    </header>
  );
}

/** A framed group inside a panel. */
export function Card({ title, aside, children, className = "" }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`st-card ${className}`}>
      {(title || aside) && (
        <header className="st-card-head">
          {title && <h3>{title}</h3>}
          {aside && <div className="st-card-aside">{aside}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

/** Sticky "unsaved changes" bar — slides in while `show`. */
export function SaveBar({
  show,
  busy,
  label = "มีการแก้ไขที่ยังไม่บันทึก",
  onSave,
  onReset,
  saveText = "บันทึก",
  disabled,
}: {
  show: boolean;
  busy?: boolean;
  label?: string;
  onSave: () => void;
  onReset?: () => void;
  saveText?: string;
  disabled?: boolean;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="st-savebar"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 18 }}
          transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
          role="region"
          aria-label="บันทึกการแก้ไข"
        >
          <span className="st-savebar-dot" aria-hidden="true" />
          <span className="st-savebar-label">{label}</span>
          {onReset && (
            <button type="button" className="st-btn ghost" onClick={onReset} disabled={busy}>
              ยกเลิก
            </button>
          )}
          <button type="button" className="st-btn primary" onClick={onSave} disabled={busy || disabled}>
            {busy ? <Spinner label="กำลังบันทึก" /> : saveText}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="st-spin-wrap">
      <i className="st-spin" aria-hidden="true" />
      {label && <span>{label}…</span>}
    </span>
  );
}

const pct = (v: number, max: number) => `${Math.max(0, Math.min(100, max > 0 ? (v / max) * 100 : 0))}%`;

/** Same meter look as the public profile (players.css .pf-meter). */
export function Meter({ label, value, max, unit, tone }: { label: string; value: number; max: number; unit?: string; tone: string }) {
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

/** "อีก 42 นาที" style countdown text for a future ms epoch (re-renders every 30s). */
export function useCountdown(until: number | undefined) {
  const [now, setNow] = useState(() => Date.now());
  const left = (until ?? 0) - now;
  useEffect(() => {
    if (left <= 0) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [left]);
  if (left <= 0) return null;
  const min = Math.ceil(left / 60_000);
  return min >= 60 ? `${Math.floor(min / 60)} ชม. ${min % 60} นาที` : `${min} นาที`;
}
