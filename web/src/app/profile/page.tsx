import type { Metadata } from "next";
import { ProfileStudio } from "@/components/profile/ProfileStudio";
import { GAME } from "@/lib/game";
import "../forge.css";
import "../players.css";
import "../profile.css";

/** Private settings page for the logged-in player — not indexed, not in PAGES/sitemap. */
export const metadata: Metadata = {
  title: "โปรไฟล์ของฉัน",
  description: "ตั้งค่าตัวละคร Fleshfall ของคุณ — ชื่อ บันทึก ภาพ สไปรต์ ห้องส่วนตัว และบัญชี Discord",
  robots: { index: false, follow: false },
};

/** Static shell; ProfileStudio loads /api/me in the browser (no login → /create, no character → /create#forge). */
export default function ProfilePage() {
  return (
    <main className="profile-page">
      <ProfileStudio
        roles={GAME.roles.map(({ id, name, emoji, short }) => ({ id, name, emoji, short }))}
        icons={GAME.icons.map(({ id, name, emoji, concept, door, doorName }) => ({ id, name, emoji, concept, door, doorName }))}
        slots={GAME.imageSlots}
      />
    </main>
  );
}
