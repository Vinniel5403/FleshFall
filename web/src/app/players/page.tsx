import type { Metadata } from "next";
import { PageBanner } from "@/components/PageBanner";
import { PlayerSearch } from "@/components/PlayerSearch";
import { pageMeta } from "@/lib/site";
import "../forge.css";
import "../players.css";

export const metadata: Metadata = pageMeta("/players");

/** Static shell; the search list is fetched in the browser from /api/players (live data). */
export default function PlayersPage() {
  return (
    <>
      <PageBanner art="gramophone" en="PERSONNEL" th="แฟ้มประวัติผู้เล่น" lead="ค้นหาตัวละครของผู้เล่นคนอื่น ดูภาพ ชีท สไปรต์ ค่าพลัง และบันทึกของพวกเขา" />
      <main>
        <section className="block page-body">
          <PlayerSearch />
        </section>
      </main>
    </>
  );
}
