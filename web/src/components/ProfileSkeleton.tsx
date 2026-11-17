import { Backdrop, Brackets } from "@/components/Dossier";

/** Loading state: the same dossier layout with shimmering placeholders, so the page doesn't jump when data lands. */
export function ProfileSkeleton() {
  const line = (w: string, h = 12) => (
    <i className="sk" style={{ width: w, height: h }} />
  );
  return (
    <div
      className="player-profile pf-skeleton"
      role="status"
      aria-live="polite"
    >
      <section className="pf-hero ff-host">
        <Backdrop band />
        <div className="pf-portrait">
          <i className="sk sk-fill" />
          <span className="sk-seal">M.A.I.D.S</span>
          <Brackets />
        </div>
        <div className="pf-id">
          <p className="forge-file sk-label">
            กำลังเปิดแฟ้ม
            <span className="sk-dots" aria-hidden="true" />
          </p>
          {line("min(360px, 70%)", 40)}
          <div className="sk-row">
            {line("120px")}
            {line("90px")}
            {line("110px")}
          </div>
          <div className="pf-meters sk-meters">
            {[0, 1, 2, 3, 4].map((n) => (
              <div key={n} className="pf-meter">
                {line(`${40 + ((n * 17) % 30)}%`, 10)}
                {line("100%", 6)}
              </div>
            ))}
          </div>
          <div className="pf-stats">
            {[0, 1, 2, 3].map((n) => (
              <div key={n}>{line("50%", 22)}</div>
            ))}
          </div>
        </div>
      </section>
      <section className="step">
        {line("120px", 14)}
        <i className="sk sk-block" />
      </section>
      <div className="pf-body">
        <div className="pf-main">
          <section className="step">
            {line("140px", 14)}
            <div className="sk-lines">
              {line("100%")}
              {line("94%")}
              {line("97%")}
              {line("62%")}
            </div>
          </section>
        </div>
        <aside className="pf-side">
          {[3, 4, 6].map((n) => (
            <section key={n} className="step">
              {line("110px", 14)}
              <div className="sk-lines">
                {Array.from({ length: n }, (_, k) => (
                  <span key={k}>{line(`${55 + ((k * 23) % 40)}%`)}</span>
                ))}
              </div>
            </section>
          ))}
        </aside>
      </div>
      <span className="sr-only">กำลังเปิดแฟ้มประวัติ</span>
    </div>
  );
}
