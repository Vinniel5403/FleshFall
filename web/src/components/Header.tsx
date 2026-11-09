"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/world", label: "แผนที่" },
  { href: "/codex", label: "คัมภีร์" },
  { href: "/hunt", label: "ทดลองล่า", hot: true },
  { href: "/leaderboard", label: "ทำเนียบ" },
];

export function Header() {
  const path = usePathname();
  return (
    <header className="top">
      <Link className="brand" href="/">
        FLESH<span>FALL</span>
      </Link>
      <nav>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={[l.hot ? "hot" : "", path.startsWith(l.href) ? "on" : ""].join(" ")}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
