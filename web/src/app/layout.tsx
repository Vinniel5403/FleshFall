import type { Metadata } from "next";
import { Cinzel, Kanit, UnifrakturMaguntia } from "next/font/google";
import { Header } from "@/components/Header";
import "./globals.css";
import "./kv.css";
import "./nav.css";
import "./landing.css";
import "./icons.css";
import "./characters.css";
import "./hud.css";
import "./dossier.css";

const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["600", "800"] });
const logo = UnifrakturMaguntia({ variable: "--font-logo", subsets: ["latin"], weight: "400" });
const kanit = Kanit({ variable: "--font-kanit", subsets: ["thai", "latin"], weight: ["300", "400", "500", "600", "700", "800"] });

const SITE = "https://fleshfall.org";
const DESCRIPTION = "สู่แดนแห่งเนื้อสดและเมดผู้หิวโหย — เล่นบน Discord";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Fleshfall — เมดเนื้อ", template: "%s · Fleshfall" },
  description: DESCRIPTION,
  applicationName: "Fleshfall",
  keywords: ["Fleshfall", "เมดเนื้อ", "FleshFall ARG", "FF_ARG", "Discord RPG", "horror"],
  // og:image / twitter:image come from app/opengraph-image.jpg + app/twitter-image.jpg
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Fleshfall",
    title: "Fleshfall — เมดเนื้อ",
    description: DESCRIPTION,
    locale: "th_TH",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fleshfall — เมดเนื้อ",
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${cinzel.variable} ${kanit.variable} ${logo.variable}`}>
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
