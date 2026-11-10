import Image from "next/image";
import { ART, type ArtKey } from "@/lib/art";
import { SectionHead } from "./SectionHead";
import { Backdrop, Brackets } from "./Dossier";

/** Full-bleed art banner at the top of sub-pages, with the HUD section head. */
export function PageBanner({ art, en, th, lead }: { art: ArtKey; en: string; th: string; lead?: string }) {
  const a = ART[art];
  return (
    <section className="banner ff-host">
      <Image src={a.src} alt={a.alt} fill sizes="100vw" preload style={{ objectPosition: a.pos }} className="banner-img" />
      <div className="banner-shade" aria-hidden="true" />
      <Backdrop word={en} band />
      <Brackets label={`FLESHFALL · ARCHIVE · ${en}`} />
      <div className="banner-copy">
        <SectionHead en={en} th={th} as="h1" />
        {lead && <p className="banner-lead">{lead}</p>}
      </div>
    </section>
  );
}
