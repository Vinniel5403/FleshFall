"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AUTH_EVENT, type AuthUser } from "@/lib/client";

const NAV_ITEMS = [
  { href: "/codex", label: "Codex" },
  { href: "/players", label: "ผู้เล่น" },
];
const CREATE = { href: "/create", label: "✦ สร้างตัวละคร" };
const PROFILE = { href: "/profile", label: "โปรไฟล์" };
const AUTH_CACHE = "ff:auth";

/**
 * Logged-in Discord user for the nav CTA: undefined = still checking (CTA hidden, no wrong-button flash).
 * Cached in sessionStorage so page loads after the first paint the right button at once.
 */
function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  useEffect(() => {
    const keep = (u: AuthUser | null) => {
      setUser(u);
      try {
        sessionStorage.setItem(AUTH_CACHE, JSON.stringify(u));
      } catch {}
    };
    try {
      const c = sessionStorage.getItem(AUTH_CACHE);
      if (c) setUser(JSON.parse(c) as AuthUser | null);
    } catch {}
    let live = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json() as Promise<{ user: AuthUser | null }>)
      .then((d) => live && keep(d.user))
      .catch(() => live && setUser((u) => (u === undefined ? null : u)));
    const onAuth = (e: Event) => keep((e as CustomEvent<AuthUser | null>).detail);
    window.addEventListener(AUTH_EVENT, onAuth);
    return () => {
      live = false;
      window.removeEventListener(AUTH_EVENT, onAuth);
    };
  }, []);
  return user;
}

function NavCta({ user, active, onClick, mobile }: { user: AuthUser | null | undefined; active: (h: string) => boolean; onClick?: () => void; mobile?: boolean }) {
  if (user) {
    return (
      <Link href={PROFILE.href} onClick={onClick} className={`nav-me ${active(PROFILE.href) ? "on" : ""}`} aria-label={`โปรไฟล์ของ ${user.username}`}>
        <span className="nav-me-avatar" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {user.avatar ? <img src={user.avatar} alt="" width={28} height={28} /> : <i>{user.username.slice(0, 1).toUpperCase()}</i>}
        </span>
        <span className="nav-me-label">{PROFILE.label}</span>
        {mobile && <span className="nav-me-name">{user.username}</span>}
      </Link>
    );
  }
  return (
    <Link href={CREATE.href} onClick={onClick} className={`nav-cta ${active(CREATE.href) ? "on" : ""}${user === undefined ? " pending" : ""}`}>
      {CREATE.label}
    </Link>
  );
}

/** Full-width bar over the art; its solid background fades in once you scroll. */
const SCROLL_THRESHOLD = 40;

export function Header() {
  const path = usePathname();
  const user = useAuthUser();
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
            <NavCta user={user} active={active} />
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
                <NavCta user={user} active={active} onClick={close} mobile />
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
