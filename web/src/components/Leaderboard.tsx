"use client";

import { useApi } from "@/lib/api";
import type { Icon, Player, Role } from "@/lib/types";

export function Leaderboard() {
  const { data: rows, error } = useApi<Player[]>("leaderboard");
  const { data: roles } = useApi<Role[]>("roles");
  const { data: icons } = useApi<Icon[]>("icons");
  if (error) return <p className="notice">{error}</p>;
  if (!rows) return <p className="notice">กำลังโหลด…</p>;
  if (rows.length === 0) return <p className="notice">ยังไม่มีผู้รอดชีวิต</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>ชื่อ</th>
            <th>บทบาท</th>
            <th>Icon</th>
            <th>Lv</th>
            <th>อยู่ที่</th>
            <th>ดันเจียน</th>
            <th>ตาย</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c, i) => {
            const r = roles?.find((x) => x.id === c.role);
            const ic = icons?.find((x) => x.id === c.icon);
            return (
              <tr key={i} className={c.fiend ? "fiend" : undefined}>
                <td>{i + 1}</td>
                <td>
                  {c.name}
                  {c.fiend && " 👹"}
                </td>
                <td>
                  {r?.emoji} {r?.name.split(" ")[0] ?? c.role}
                </td>
                <td>
                  {ic?.emoji} {ic?.name ?? c.icon}
                </td>
                <td>{c.level}</td>
                <td>{c.zone === "traveling" ? "🧭 กำลังเดินทาง" : c.zone}</td>
                <td>{c.dungeonsCleared}</td>
                <td>{c.deaths}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
