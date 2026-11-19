"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CodexEntry } from "@/lib/codexSearch";

type Chapter = { id: string; no: string; en: string; th: string };
type Hit = { entry: CodexEntry; score: number; snippet: string };

const MAX_HITS = 40;
const norm = (s: string) => s.normalize("NFC").toLowerCase();

/** Every term must appear somewhere in the entry; title hits rank first. */
function search(entries: readonly CodexEntry[], query: string): Hit[] {
  const terms = norm(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const hits: Hit[] = [];
  for (const entry of entries) {
    const title = norm(`${entry.title} ${entry.en ?? ""}`);
    const text = norm(entry.text);
    let score = 0;
    for (const t of terms) {
      if (title.includes(t)) score += title.startsWith(t) ? 12 : 8;
      else if (text.includes(t)) score += 1;
      else {
        score = 0;
        break;
      }
    }
    if (!score) continue;
    const at = text.indexOf(terms.find((t) => text.includes(t)) ?? "\0");
    const from = Math.max(0, at - 28);
    const snippet = entry.text ? (from > 0 ? "…" : "") + entry.text.slice(from, from + 120) + (from + 120 < entry.text.length ? "…" : "") : "";
    hits.push({ entry, score, snippet });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, MAX_HITS);
}

/** Wraps the matched terms in <mark>. */
function Marked({ text, query }: { text: string; query: string }) {
  const terms = norm(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return <>{text}</>;
  const low = norm(text);
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < text.length) {
    let at = -1;
    let len = 0;
    for (const t of terms) {
      const p = low.indexOf(t, i);
      if (p >= 0 && (at < 0 || p < at)) [at, len] = [p, t.length];
    }
    if (at < 0) break;
    if (at > i) out.push(text.slice(i, at));
    out.push(<mark key={at}>{text.slice(at, at + len)}</mark>);
    i = at + len;
  }
  out.push(text.slice(i));
  return <>{out}</>;
}

/** The on-page element holding `find` inside `root` (exact text node first, then partial). */
function locate(root: HTMLElement, find: string): HTMLElement | null {
  const want = norm(find);
  let partial: HTMLElement | null = null;
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const t = norm(n.nodeValue ?? "").trim();
    if (t === want) return n.parentElement;
    if (!partial && t.includes(want)) partial = n.parentElement;
  }
  return partial;
}

/** Codex search palette: trigger button + ⌘K / Ctrl+K / "/" dialog that jumps to the matching passage. */
export function CodexSearch({ entries, chapters }: { entries: readonly CodexEntry[]; chapters: readonly Chapter[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [mac, setMac] = useState(true);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const chapterOf = useMemo(() => new Map(chapters.map((c) => [c.id, c])), [chapters]);
  // no query = the chapter list as quick jumps
  const hits = useMemo<Hit[]>(
    () => (query.trim() ? search(entries, query) : entries.filter((e) => e.anchor === e.ch && !e.text).map((entry) => ({ entry, score: 0, snippet: "" }))),
    [entries, query],
  );

  useEffect(() => {
    setMac(/mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent));
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(input|textarea|select)$/i.test(e.target.tagName));
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // lock page scroll while open; hand focus back to the trigger on close
  useEffect(() => {
    if (!open) return;
    const btn = trigger.current;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      btn?.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-n="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setActive(0);
  };

  const go = (entry: CodexEntry) => {
    close();
    const root = document.getElementById(entry.anchor);
    if (!root) return;
    const find = entry.find ?? entry.title;
    const el = (find && locate(root, find)) || root;
    history.replaceState(null, "", `#${entry.anchor}`);
    // after the scroll lock is released
    requestAnimationFrame(() => {
      el.scrollIntoView({ block: el === root ? "start" : "center", behavior: "instant" }); // far jumps: smooth scroll outlasts the flash
      if (el === root) return;
      el.classList.remove("cx-found");
      void el.offsetWidth; // restart the flash
      el.classList.add("cx-found");
      window.setTimeout(() => el.classList.remove("cx-found"), 2400);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (hits.length) setActive((a) => (a + (e.key === "ArrowDown" ? 1 : hits.length - 1)) % hits.length);
    } else if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (hits[active]) go(hits[active].entry);
    } else if (e.key === "Tab") {
      e.preventDefault(); // single control: keep focus in the field
    }
  };

  return (
    <>
      <button ref={trigger} type="button" className="cx-search-btn" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-keyshortcuts="Meta+K Control+K">
        <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M12.8 12.8 17.5 17.5" stroke="currentColor" strokeWidth="1.4" />
        </svg>
        <span>ค้นหาใน Codex</span>
        <kbd>{mac ? "⌘K" : "Ctrl K"}</kbd>
      </button>

      {open &&
        createPortal(
          <div className="cx-search" onMouseDown={(e) => e.target === e.currentTarget && close()}>
            <div className="cx-search-panel" role="dialog" aria-modal="true" aria-label="ค้นหาใน Codex" onKeyDown={onKeyDown}>
              <div className="cx-search-field">
                <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                  <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M12.8 12.8 17.5 17.5" stroke="currentColor" strokeWidth="1.4" />
                </svg>
                <input
                  autoFocus
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  placeholder="ค้นหา เช่น Sophia, ประตูสีแดง, เนื้อเน่า…"
                  role="combobox"
                  aria-expanded="true"
                  aria-controls="cx-search-list"
                  aria-activedescendant={hits[active] ? `cx-hit-${active}` : undefined}
                  aria-autocomplete="list"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button type="button" className="cx-search-esc" onClick={close} aria-label="ปิดการค้นหา">
                  ESC
                </button>
              </div>

              <p className="cx-search-head">{query.trim() ? `ผลการค้นหา · ${hits.length}${hits.length === MAX_HITS ? "+" : ""}` : "CONTENTS · สารบัญ"}</p>
              {hits.length ? (
                <ul id="cx-search-list" ref={list} role="listbox" className="cx-search-list">
                  {hits.map(({ entry, snippet }, n) => {
                    const ch = chapterOf.get(entry.ch);
                    return (
                      <li
                        key={n}
                        id={`cx-hit-${n}`}
                        data-n={n}
                        role="option"
                        aria-selected={n === active}
                        className={n === active ? "on" : ""}
                        onMouseMove={() => setActive(n)}
                        onClick={() => go(entry)}
                      >
                        <span className="cx-search-no" aria-hidden="true">
                          {ch?.no}
                        </span>
                        <span className="cx-search-txt">
                          <span className="cx-search-title">
                            <b>
                              <Marked text={entry.title} query={query} />
                            </b>
                            {entry.en && (
                              <i>
                                <Marked text={entry.en} query={query} />
                              </i>
                            )}
                          </span>
                          {snippet && (
                            <span className="cx-search-snip">
                              <Marked text={snippet} query={query} />
                            </span>
                          )}
                        </span>
                        {query.trim() && ch && <span className="cx-search-ch">{ch.en}</span>}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="cx-search-none">ไม่พบ “{query.trim()}” ในบันทึก</p>
              )}

              <p className="cx-search-foot" aria-hidden="true">
                <span>
                  <kbd>↑</kbd>
                  <kbd>↓</kbd> เลื่อน
                </span>
                <span>
                  <kbd>↵</kbd> ไปยังหัวข้อ
                </span>
                <span>
                  <kbd>esc</kbd> ปิด
                </span>
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
