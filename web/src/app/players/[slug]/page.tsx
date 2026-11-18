import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PlayerDossier } from "@/components/PlayerDossier";
import { ProfileSkeleton } from "@/components/ProfileSkeleton";
import { botPublic } from "@/lib/server/bot";
import type { PlayerProfile } from "@/lib/types";
import "../../forge.css";
import "../../players.css";

/** Blocking route: the shared Header reads usePathname() outside Suspense, which a runtime [slug] can't prerender. */
export const instant = false;

export const metadata: Metadata = {
  title: "แฟ้มประวัติตัวละคร",
  description: "โปรไฟล์ตัวละครผู้เล่น Fleshfall — ภาพ ชีท สไปรต์ ค่าพลัง และบันทึกตัวละคร",
};

/** Params are runtime data (no generateStaticParams): the profile streams in behind Suspense. */
export default function PlayerPage({ params }: PageProps<"/players/[slug]">) {
  return (
    <main className="player-page">
      <p className="player-back">
        <Link href="/players">← แฟ้มประวัติผู้เล่นทั้งหมด</Link>
      </p>
      <Suspense fallback={<ProfileSkeleton />}>
        {params.then(({ slug }) => (
          <Profile slug={slug} />
        ))}
      </Suspense>
    </main>
  );
}

async function Profile({ slug }: { slug: string }) {
  // Request-time only: the fetch (AbortSignal.timeout) and the client sprite/room read the clock, which prerendering rejects.
  await connection();
  if (!/^[0-9a-f]{16}$/.test(slug)) notFound();
  let p: PlayerProfile | null;
  try {
    p = await botPublic<PlayerProfile>(`characters/${slug}`);
  } catch {
    return <p className="forge-error">เซิร์ฟเวอร์เกมไม่ตอบสนอง ลองใหม่อีกครั้ง</p>;
  }
  if (!p) notFound();
  return <PlayerDossier p={p} />;
}
