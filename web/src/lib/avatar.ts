/** Roles with a stock square avatar in public/avatar (same files the bot uses, src/render/kit.ts ROLE_AVATAR). */
const AVATAR_ROLES = new Set(["maid", "hound", "bar", "patron", "outsider"]);

/** Stock avatar for a role, or null when there is none (e.g. survivor). */
export const roleAvatar = (role: string): string | null => (AVATAR_ROLES.has(role) ? `/avatar/role-${role}.webp` : null);
