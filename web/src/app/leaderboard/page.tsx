import type { Metadata } from "next";
import { PageBanner } from "@/components/PageBanner";
import { Leaderboard } from "@/components/Leaderboard";

export const metadata: Metadata = { title: "ทำเนียบ" };

export default function LeaderboardPage() {
  return (
    <>
      <PageBanner art="door" en="RANKING" th="ทำเนียบผู้รอดชีวิต" lead="ผู้ที่ไปได้ไกลที่สุดใน Old Realm" />
      <main>
      <section className="block page-body">
        <Leaderboard />
      </section>
      </main>
    </>
  );
}
