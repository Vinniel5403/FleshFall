import { HeroCarousel } from "@/components/HeroCarousel";
import { Reveal } from "@/components/Reveal";
import { SectionHead } from "@/components/SectionHead";
import { backgroundSlides } from "@/lib/backgrounds";

/** Coming-soon landing: key visual + welcome only. */
export default function Home() {
  return (
    <>
      <HeroCarousel slides={backgroundSlides()} />

      {/* INTRO + CW */}
      <section className="intro">
        <Reveal>
        <SectionHead en="WELCOME" th="สู่แดนแห่งเนื้อสดและเมดผู้หิวโหย" center />
        <p className="intro-lead">
          ยินดีต้อนรับสู่ดินแดนที่ความหิวโหยเข่นฆ่าคือความโสภา พวกสัตว์เศษเดนศรัทธาความต่ำช้า และอวัยวะคือทรัพยากร
          ผู้เล่นต้องเอาชีวิตรอดในโลกวังวนสุดวิปลาส
        </p>
        <div className="cw">
          <span className="cw-age">18+</span>
          <span>CW: gore · disturbing images · violence · religion</span>
        </div>
        <div className="tags">
          {["#FleshFall_ARG", "#FF_ARG", "#เมดเนื้อ"].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        </Reveal>
      </section>
    </>
  );
}
