import type { Metadata } from "next";
import { Cinzel, Kanit } from "next/font/google";
import { Header } from "@/components/Header";
import "./globals.css";
import "./kv.css";
import "./nav.css";
import "./landing.css";
import "./icons.css";

const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["600", "800"] });
const kanit = Kanit({ variable: "--font-kanit", subsets: ["thai", "latin"], weight: ["300", "400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: { default: "FleshFall", template: "%s · FleshFall" },
  description: "FleshFall — โลกสยองขวัญของเกาะเนื้อ Rouge Land และวังวน Old Realm",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${cinzel.variable} ${kanit.variable}`}>
      <body>
        <div className="grain" aria-hidden="true" />
        <Header />
        {children}
        <footer>
          <p>FleshFall · เล่นจริงบน Discord · เว็บนี้ยังเป็นรุ่นทดลอง</p>
        </footer>
      </body>
    </html>
  );
}
