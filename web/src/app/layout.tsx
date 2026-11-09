import type { Metadata } from "next";
import { Cinzel, Noto_Serif_Thai, Sarabun } from "next/font/google";
import { Header } from "@/components/Header";
import "./globals.css";

const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["600", "800"] });
const serif = Noto_Serif_Thai({ variable: "--font-serif", subsets: ["thai", "latin"], weight: ["400", "600", "800"] });
const sarabun = Sarabun({ variable: "--font-sarabun", subsets: ["thai", "latin"], weight: ["300", "400", "600"] });

export const metadata: Metadata = {
  title: { default: "FleshFall", template: "%s · FleshFall" },
  description: "FleshFall — โลกสยองขวัญของเกาะเนื้อ Rouge Land และวังวน Old Realm",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${cinzel.variable} ${serif.variable} ${sarabun.variable}`}>
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
