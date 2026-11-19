"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Wraps a thumbnail; click opens the full image in an in-page popup (Esc / click outside closes). */
export function ZoomLink({ src, alt, caption, label, children }: { src: string; alt: string; caption?: string; label?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* real link stays for middle-click / no-JS; a plain click opens the popup */}
      <a
        href={src}
        aria-label={label ?? `${alt} (ขยายภาพ)`}
        aria-haspopup="dialog"
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </a>
      {open &&
        createPortal(
          <div className="zoom" role="dialog" aria-modal="true" aria-label={alt} onClick={() => setOpen(false)}>
            <button type="button" className="zoom-close" autoFocus aria-label="ปิดภาพ">
              ✕
            </button>
            <figure>
              {/* plain img: also used for player uploads on R2 */}
              <span className="zoom-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={alt} />
              </span>
              {caption && <figcaption>{caption}</figcaption>}
            </figure>
          </div>,
          document.body,
        )}
    </>
  );
}
