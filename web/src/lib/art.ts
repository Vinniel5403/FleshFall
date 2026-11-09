/** Key art in /public. `pos` = object-position focus (where the characters are). */
export interface Art {
  src: string;
  alt: string;
  pos: string;
}

const bg = (file: string) => `/background/${file}`;
const asset = (file: string) => `/asset/${file}`;

export const ART = {
  // backgrounds (also used by the home carousel)
  kv: { src: bg("01-halo-embrace.webp"), alt: "เทพมีวงแหวนก้มลงหาผู้หลงมิติ", pos: "72% 35%" },
  door: { src: bg("02-green-door-wide.webp"), alt: "ประตูสีเขียวกลางผนังเนื้อ", pos: "50% 55%" },
  maid: { src: bg("03-diner-maid.webp"), alt: "เมดแห่ง M.A.I.D.S ในไดเนอร์", pos: "28% 40%" },
  // character assets
  cleaver: { src: asset("maid-cleaver.webp"), alt: "เมดถือมีดอีโต้เปื้อนเลือด", pos: "50% 20%" }, // transparent cut-out
  gramophone: { src: asset("maid-gramophone.webp"), alt: "เมดมีวงแหวนกับเครื่องเล่นแผ่นเสียงวินเทจ", pos: "40% 45%" },
  cookbook: { src: asset("maid-cookbook.webp"), alt: "เมดอ่านตำรา To Serve Man", pos: "50% 35%" },
  hound: { src: asset("maid-bloodied.webp"), alt: "เมดเปื้อนเลือดถือมีด", pos: "50% 30%" },
  houndAxe: { src: asset("hound-axe.webp"), alt: "สุนัขล่าเนื้อสวมหน้ากากถือขวาน", pos: "50% 20%" }, // cut-out
  barOwner: { src: asset("bar-owner.webp"), alt: "เจ้าของบาร์ผมสีน้ำเงินม่วง", pos: "50% 20%" }, // cut-out
  patron: { src: asset("patron-parasol.webp"), alt: "ลูกค้าปีศาจร่างครึ่งสัตว์ในชุดขาวถือร่ม", pos: "50% 20%" }, // cut-out
  outsider: { src: asset("outsider.webp"), alt: "ผู้หลงมิติสวมแว่นถือหนังสือ", pos: "50% 20%" }, // cut-out
  ladyDoll: { src: asset("lady-doll.webp"), alt: "หญิงชุดดำกับตุ๊กตากระต่าย", pos: "50% 20%" }, // cut-out, unused
  haloMaid: { src: asset("maid-halo.webp"), alt: "เมดมีวงแหวนถือเนื้อ", pos: "50% 30%" }, // cut-out, LORE section
} satisfies Record<string, Art>;

export type ArtKey = keyof typeof ART;
