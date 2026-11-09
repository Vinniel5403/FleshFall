import type { Metadata } from "next";
import { Codex } from "@/components/Codex";

export const metadata: Metadata = { title: "คัมภีร์" };

export default function CodexPage() {
  return (
    <main>
      <section className="block page-head">
        <h2>
          <small>02</small> คัมภีร์
        </h2>
        <Codex />
      </section>
    </main>
  );
}
