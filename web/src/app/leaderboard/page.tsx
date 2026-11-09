import type { Metadata } from "next";
import { Leaderboard } from "@/components/Leaderboard";

export const metadata: Metadata = { title: "ทำเนียบ" };

export default function LeaderboardPage() {
  return (
    <main>
      <section className="block page-head">
        <h2>
          <small>04</small> ทำเนียบผู้รอดชีวิต
        </h2>
        <Leaderboard />
      </section>
    </main>
  );
}
