import type { Metadata } from "next";
import { PageBanner } from "@/components/PageBanner";
import { Codex } from "@/components/Codex";

export const metadata: Metadata = { title: "คัมภีร์" };

export default function CodexPage() {
  return (
    <>
      <PageBanner art="maid" en="CODEX" th="คัมภีร์" lead="7 Icon · บทบาท · สัตว์ประหลาด · ไอเทม" />
      <main>
      <section className="block page-body">
        <Codex />
      </section>
      </main>
    </>
  );
}
