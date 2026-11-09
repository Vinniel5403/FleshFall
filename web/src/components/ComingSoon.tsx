/** Disabled "Coming Soon" button for the teaser page. */
export function ComingSoon({ className = "cta" }: { className?: string }) {
  return (
    <span className={`${className} soon`} role="button" aria-disabled="true" title="เร็ว ๆ นี้">
      Coming Soon
    </span>
  );
}
