"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ComingSoon } from "./ComingSoon";

/** Coming-soon header: logo + disabled CTA. Clear at the top, frosted after scrolling. */
const SCROLL_THRESHOLD = 40;

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="nav-shell">
      <nav aria-label="เมนูหลัก" className={`nav-bar ${isScrolled ? "solid" : ""}`}>
        <Link href="/" className="nav-logo" aria-label="FleshFall หน้าแรก">
          Fleshfall
        </Link>
        <ComingSoon className="nav-cta" />
      </nav>
    </header>
  );
}
