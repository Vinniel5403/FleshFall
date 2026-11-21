import type { Metadata } from "next";
import { ItemAdmin } from "@/components/admin/ItemAdmin";
import "../profile.css";
import "../admin.css";

/** Team-only item editor — not indexed, not in PAGES/sitemap. The bot decides who may use it (ADMIN_USERS). */
export const metadata: Metadata = {
  title: "แอดมิน · ไอเทม",
  robots: { index: false, follow: false },
};

/** Static shell; ItemAdmin loads /api/admin/items in the browser. */
export default function AdminPage() {
  return (
    <main className="admin-page">
      <header className="adm-title">
        <h1>คลังไอเทม</h1>
        <p>แก้ไอเทม รูป ความหายาก และที่ขาย/ดรอป — มีผลในเกมทันทีหลังบันทึก</p>
      </header>
      <ItemAdmin />
    </main>
  );
}
