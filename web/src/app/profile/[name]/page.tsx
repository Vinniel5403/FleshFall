import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PlayerCard } from "@/components/PlayerCard";
import { PlayerDossier } from "@/components/PlayerDossier";
import { ProfileSkeleton } from "@/components/ProfileSkeleton";
import { botPublic } from "@/lib/server/bot";
import { publicUrl } from "@/lib/server/r2";
import { nameHandle, type HandleLookup, type PlayerHit, type PlayerProfile } from "@/lib/types";
import "../../forge.css";
import "../../players.css";

/** Blocking route: the shared Header reads usePathname() outside Suspense, which a runtime [name] can't prerender. */
export const instant = false;

export const metadata: Metadata = {
  title: "แฟ้มประวัติตัวละคร",
  description: "โปรไฟล์ตัวละครผู้เล่น Fleshfall — ภาพ ชีท สไปรต์ ค่าพลัง และบันทึกตัวละคร",
};

/** fleshfall.org/profile/<character name> — public profile by handle (lowercased name, spaces → "-"). /profile itself = own settings. */
export default function NamedProfilePage({ params }: PageProps<"/profile/[name]">) {
  return (
    <main className="player-page">
      <p className="player-back">
        <Link href="/players">← แฟ้มประวัติผู้เล่นทั้งหมด</Link>
      </p>
      <Suspense fallback={<ProfileSkeleton />}>
        {params.then(({ name }) => (
          <Named name={name} />
        ))}
      </Suspense>
    </main>
  );
}

async function Named({ name }: { name: string }) {
  await connection();
  let handle: string;
  try {
    handle = decodeURIComponent(name);
  } catch {
    notFound();
  }
  if (!handle || handle.length > 64 || handle.includes("/")) notFound();
  let r: HandleLookup | null;
  try {
    r = await lookup(nameHandle(handle));
  } catch {
    return <p className="forge-error">เซิร์ฟเวอร์เกมไม่ตอบสนอง ลองใหม่อีกครั้ง</p>;
  }
  if (!r) notFound();
  if (r.profile) return <PlayerDossier p={r.profile} />;

  // older characters may share a name — let the visitor pick (cards use the permanent /players/<slug> link)
  return (
    <section className="block page-body" style={{ paddingTop: 8 }}>
      <h1 className="pf-h">มีตัวละครชื่อ “{r.matches[0]?.name ?? handle}” {r.matches.length} คน</h1>
      <ul className="players-grid">
        {r.matches.map((h) => (
          <li key={h.slug}>
            <PlayerCard h={{ ...h, portraitUrl: h.portrait ? publicUrl(h.portrait) : null }} permalink />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Handle → profile. Uses the bot's `characters/by-name` endpoint; bots without it (404) fall back to the
 * public name search (`characters?q=` on the handle's longest word) + exact-handle filter + profile by slug.
 */
async function lookup(handle: string): Promise<HandleLookup | null> {
  const direct = await botPublic<HandleLookup>(`characters/by-name/${encodeURIComponent(handle)}`);
  if (direct) return direct;
  const word = handle.split("-").sort((a, b) => b.length - a.length)[0]?.slice(0, 40) ?? "";
  if (!word) return null;
  const hits = (await botPublic<PlayerHit[]>(`characters?q=${encodeURIComponent(word)}`)) ?? [];
  const matches = hits.filter((h) => nameHandle(h.name) === handle);
  if (!matches.length) return null;
  const profile = matches.length === 1 ? await botPublic<PlayerProfile>(`characters/${matches[0]!.slug}`) : null;
  return { profile, matches };
}
