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
  door: { src: bg("02-green-door.webp"), alt: "ประตูสีเขียวกลางผนังเนื้อ", pos: "50% 55%" },
  maid: { src: bg("03-diner-maid.webp"), alt: "เมดแห่ง M.A.I.D.S ในไดเนอร์", pos: "28% 40%" },
  // character assets
  cleaver: { src: asset("maid-cleaver.webp"), alt: "เมดถือมีดอีโต้เปื้อนเลือด", pos: "50% 20%" }, // transparent cut-out
  gramophone: { src: asset("maid-gramophone.webp"), alt: "เมดมีวงแหวนกับเครื่องเล่นแผ่นเสียงวินเทจ", pos: "40% 45%" },
  cookbook: { src: asset("maid-cookbook.webp"), alt: "เมดอ่านตำรา To Serve Man", pos: "50% 35%" },
  hound: { src: asset("maid-bloodied.webp"), alt: "เมดเปื้อนเลือดถือมีด", pos: "50% 30%" },
  haloMaid: { src: asset("maid-halo.webp"), alt: "เมดมีวงแหวนถือเนื้อ", pos: "50% 30%" },
} satisfies Record<string, Art>;

export type ArtKey = keyof typeof ART;
