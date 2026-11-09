import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";

/** Credits. Edit roles/names here. */
const STAFF: { role: string; names: string[] }[] = [
  { role: "Created by", names: ["DON"] },
  { role: "Team", names: ["Vinniel", "Morjor", "reiginleifz"] },
];

export function Staff() {
  return (
    <section className="staff">
      <Reveal>
        <SectionHead en="STAFF" th="ทีมผู้สร้าง" center />
        <div className="staff-list">
          {STAFF.map((g) => (
            <div key={g.role} className="staff-group">
              <p className="staff-role">{g.role}</p>
              <p className="staff-names">
                {g.names.map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
