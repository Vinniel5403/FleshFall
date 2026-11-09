/** Discord-style markdown → safe HTML (escape first, then bold/code/strike/italic/-#). */
export function md(s: string): string {
  return s
    .replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/~~(.+?)~~/g, "<s>$1</s>")
    .replace(/\*(.+?)\*/g, "<i>$1</i>")
    .replace(/^-# (.*)$/, '<small class="sub">$1</small>');
}

export const TIER_NAME = { easy: "Easy", normal: "Normal", hard: "Hard", epic: "Epic" } as const;
export const doorVar = (c: string) => `var(--d-${c})`;
