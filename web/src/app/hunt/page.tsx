import type { Metadata } from "next";
import { HuntDemo } from "@/components/HuntDemo";

export const metadata: Metadata = { title: "ทดลองล่า" };

export default function HuntPage() {
  return (
    <main>
      <section className="block page-head">
        <h2>
          <small>03</small> ทดลองล่า
        </h2>
        <p className="lead">จำลองการล่าด้วยระบบเดียวกับในบอท — ตัวละครทดลองไม่ถูกบันทึก</p>
        <HuntDemo />
      </section>
    </main>
  );
}
