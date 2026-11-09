"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/world", label: "แผนที่" },
  { href: "/codex", label: "คัมภีร์" },
];
const CTA = { href: "/create", label: "✦ สร้างตัวละคร" };

/** Full-width bar over the art; its solid background fades in once you scroll. */
const SCROLL_THRESHOLD = 40;

export function Header() {
  const path = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleKey = (event: KeyboardEvent) => event.key === "Escape" && setIsMobileMenuOpen(false);
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isMobileMenuOpen]);

  // close the mobile menu on navigation
  const [lastPath, setLastPath] = useState(path);
  if (path !== lastPath) {
    setLastPath(path);
    setIsMobileMenuOpen(false);
  }

  const close = () => setIsMobileMenuOpen(false);
  const active = (href: string) => path.startsWith(href);

  return (
    <header className="nav-shell">
      <nav aria-label="เมนูหลัก" className={`nav-bar ${isScrolled ? "solid" : ""}`}>
        <Link href="/" onClick={close} className="nav-logo" aria-label="FleshFall หน้าแรก">
          Fleshfall
        </Link>

        <ul className="nav-links">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={active(item.href) ? "on" : undefined}>
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href={CTA.href} className={`nav-cta ${active(CTA.href) ? "on" : ""}`}>
              {CTA.label}
            </Link>
          </li>
        </ul>

        <button
          type="button"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-menu"
          aria-label={isMobileMenuOpen ? "ปิดเมนู" : "เปิดเมนู"}
          onClick={() => setIsMobileMenuOpen((v) => !v)}
          className="nav-burger"
        >
          <svg width="28" height="28" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            {isMobileMenuOpen ? <path d="M5 5l12 12M17 5L5 17" strokeLinecap="round" /> : <path d="M3 6h16M3 11h16M3 16h16" strokeLinecap="round" />}
          </svg>
        </button>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`nav-mobile ${isScrolled ? "scrolled" : ""}`}
          >
            <ul>
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} onClick={close} className={active(item.href) ? "on" : undefined}>
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={CTA.href} onClick={close} className="nav-cta">
                  {CTA.label}
                </Link>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
