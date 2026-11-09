/**
 * Ornate section heading (see designsystem.md → "Section head"):
 * serif EN title flanked by tapered lines over a diamond ornament, Thai heading below between hairlines.
 */
export function SectionHead({ en, th, center = false, as: H = "h2" }: { en: string; th: string; center?: boolean; as?: "h1" | "h2" }) {
  return (
    <div className={`sh ${center ? "center" : ""}`}>
      <p className="sh-title" aria-hidden="true">
        <i className="sh-line l" />
        <span className="sh-en">{en}</span>
        <i className="sh-line r" />
      </p>
      <H className="sh-sub">
        <span>{th}</span>
      </H>
    </div>
  );
}
