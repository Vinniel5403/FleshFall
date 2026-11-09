/** Disabled CTA for the coming-soon page. */
export function ComingSoon({ className = "cta", label = "✦ สร้างตัวละคร" }: { className?: string; label?: string }) {
  return (
    <span className={`${className} soon`} role="button" aria-disabled="true" title="เร็ว ๆ นี้">
      {label}
      <small>Coming Soon</small>
    </span>
  );
}
