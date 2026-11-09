import Image from "next/image";
import { ART, type ArtKey } from "@/lib/art";

/** Full-bleed art banner at the top of sub-pages. */
export function PageBanner({ art, en, th, lead }: { art: ArtKey; en: string; th: string; lead?: string }) {
  const a = ART[art];
  return (
    <section className="banner">
      <Image src={a.src} alt={a.alt} fill sizes="100vw" preload style={{ objectPosition: a.pos }} className="banner-img" />
      <div className="banner-shade" aria-hidden="true" />
      <div className="banner-copy">
        <p className="banner-en">{en}</p>
        <h1>{th}</h1>
        {lead && <p className="banner-lead">{lead}</p>}
      </div>
    </section>
  );
}
