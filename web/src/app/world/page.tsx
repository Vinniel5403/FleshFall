import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";
import { PageBanner } from "@/components/PageBanner";
import { WorldMap } from "@/components/WorldMap";

export const metadata: Metadata = pageMeta("/world");

export default function WorldPage() {
  return (
    <>
      <PageBanner art="door" en="WORLD MAP" th="แผนที่ Old Realm" lead="มิติทับซ้อนโลกจริง ยืดออกแนวราบ 8–10 เท่า แต่ละทวีปมี Icon ปกครอง" />
      <main>
      <section className="block page-body">
        <WorldMap />
      </section>
      </main>
    </>
  );
}
