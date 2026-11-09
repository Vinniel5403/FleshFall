import type { Metadata } from "next";
import { PageBanner } from "@/components/PageBanner";
import { HuntDemo } from "@/components/HuntDemo";

export const metadata: Metadata = { title: "ทดลองล่า" };

export default function HuntPage() {
  return (
    <>
      <PageBanner art="kv" en="HUNT" th="ทดลองล่า" lead="จำลองการล่าด้วยระบบเดียวกับในบอท — ตัวละครทดลองไม่ถูกบันทึก" />
      <main>
      <section className="block page-body">
        <HuntDemo />
      </section>
      </main>
    </>
  );
}
