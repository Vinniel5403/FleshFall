import type { Metadata, Viewport } from "next";
import { Cinzel, Kanit } from "next/font/google";
import localFont from "next/font/local";
import { Header } from "@/components/Header";
import { DESCRIPTION, SITE, SITE_NAME, SITE_TITLE, THEME } from "@/lib/site";
import "./globals.css";
import "./kv.css";
import "./nav.css";
import "./landing.css";
import "./icons.css";
import "./characters.css";
import "./hud.css";

const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["600", "800"] });
// Cloister Black Light (Dieter Steffmann, freeware via dafont) — logo / calligraphy
const logo = localFont({ src: "./fonts/CloisterBlack.woff2", variable: "--font-logo", weight: "400", display: "swap" });
const kanit = Kanit({ variable: "--font-kanit", subsets: ["thai", "latin"], weight: ["300", "400", "500", "600", "700", "800"] });


export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: SITE_TITLE, template: "%s · Fleshfall" },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["Fleshfall", "เมดเนื้อ", "FleshFall ARG", "FF_ARG", "ARG", "Discord RPG", "เกม Discord", "เกมสยองขวัญ", "horror RPG", "M.A.I.D.S", "Rouge Land", "Old Realm"],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  category: "games",
  // favicon.ico / icon.png / apple-icon.png / manifest.ts / opengraph-image.jpg / twitter-image.jpg are file conventions in app/
  openGraph: {
    type: "website",
    url: SITE,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: DESCRIPTION,
    locale: "th_TH",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = { themeColor: THEME, colorScheme: "dark" };

/** Structured data: the site + the game it teases. */
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": `${SITE}/#website`, url: SITE, name: SITE_NAME, alternateName: "เมดเนื้อ", inLanguage: "th", description: DESCRIPTION },
    {
      "@type": "VideoGame",
      "@id": `${SITE}/#game`,
      name: SITE_NAME,
      alternateName: "เมดเนื้อ",
      url: SITE,
      image: `${SITE}/opengraph-image.jpg`,
      description: DESCRIPTION,
      inLanguage: "th",
      genre: ["Horror", "RPG", "Alternate reality game"],
      gamePlatform: "Discord",
      playMode: "MultiPlayer",
      applicationCategory: "Game",
      contentRating: "18+",
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${cinzel.variable} ${kanit.variable} ${logo.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c") }} />
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
