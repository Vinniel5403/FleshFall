import type { Metadata } from "next";
import { WorldMap } from "@/components/WorldMap";

export const metadata: Metadata = { title: "แผนที่ Old Realm" };

export default function WorldPage() {
  return (
    <main>
      <section className="block page-head">
        <h2>
          <small>01</small> แผนที่ Old Realm
        </h2>
        <p className="lead">มิติทับซ้อนโลกจริง ยืดออกแนวราบ 8–10 เท่า แต่ละทวีปมี Icon ปกครอง ประตูดันเจียนสีของเขาปรากฏบ่อยกว่าที่อื่น</p>
        <WorldMap />
      </section>
    </main>
  );
}
