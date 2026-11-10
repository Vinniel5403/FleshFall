/**
 * "Dossier" accent primitives — FGO ornate base + a light NIKKE touch. See designsystem.md → "Dossier accents".
 * Styles: app/dossier.css. Parents of <Backdrop> need `.ff-host` (relative + overflow hidden + isolation).
 */

/** Giant outlined serif wordmark behind a section, optionally with one soft diagonal blood band. */
export function Backdrop({ word, band = false, className = "" }: { word?: string; band?: boolean; className?: string }) {
  return (
    <div className={`ff-bg ${className}`} aria-hidden="true">
      {word && <span className="ff-word">{word}</span>}
      {band && <i className="ff-band" />}
    </div>
  );
}

/** Thin bracket corners (top-left + bottom-right) and a vertical file label around an art block. */
export function Brackets({ label }: { label?: string }) {
  return (
    <>
      <span className="ff-corner tl" aria-hidden="true" />
      <span className="ff-corner br" aria-hidden="true" />
      {label && (
        <span className="ff-file" aria-hidden="true">
          {label}
        </span>
      )}
    </>
  );
}
