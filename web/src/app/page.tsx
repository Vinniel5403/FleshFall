import Link from "next/link";
import { Hero } from "@/components/Hero";

const SECTIONS = [
  { href: "/world", title: "🗺️ แผนที่ Old Realm", body: "50 เมือง 7 ทวีป แต่ละทวีปมี Icon ปกครองและร้านค้าของตัวเอง" },
  { href: "/codex", title: "📖 คัมภีร์", body: "7 Icon · บทบาท · สัตว์ประหลาด · ไอเทม" },
  { href: "/hunt", title: "🎲 ทดลองล่า", body: "สู้มอน 3 ตัวด้วยระบบเดียวกับในบอท" },
  { href: "/leaderboard", title: "🏆 ทำเนียบ", body: "ผู้รอดชีวิตที่ไปได้ไกลที่สุด" },
];

export default function Home() {
  return (
    <>
      <Hero />
      <main>
        <section className="block">
          <div className="grid home-links">
            {SECTIONS.map((s) => (
              <Link key={s.href} href={s.href}>
                <div className="card">
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
