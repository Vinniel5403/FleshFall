/** Key art in /public. `pos` = object-position focus (where the characters are). */
export interface Art {
  src: string;
  alt: string;
  pos: string;
}

const bg = (file: string) => encodeURI(`/background/${file}`);
const asset = (file: string) => encodeURI(`/asset/${file}`);

export const ART = {
  // backgrounds (also used by the home carousel)
  kv: { src: bg("IMG_5797.PNG"), alt: "เทพมีวงแหวนก้มลงหาผู้หลงมิติ", pos: "72% 35%" },
  door: { src: bg("IMG_5802.PNG"), alt: "ประตูสีเขียวกลางผนังเนื้อ", pos: "50% 55%" },
  maid: { src: bg("IMG_5816 (1).PNG"), alt: "เมดแห่ง M.A.I.D.S ในไดเนอร์", pos: "28% 40%" },
  // character assets
  cleaver: { src: asset("IMG_5918.PNG"), alt: "เมดถือมีดอีโต้เปื้อนเลือด", pos: "50% 20%" }, // transparent cut-out
  gramophone: { src: asset("IMG_5937.PNG"), alt: "เมดมีวงแหวนกับเครื่องเล่นแผ่นเสียงวินเทจ", pos: "40% 45%" },
  cookbook: { src: asset("IMG_5959.PNG"), alt: "เมดอ่านตำรา To Serve Man", pos: "50% 35%" },
  hound: { src: asset("Untitled_Artwork.png"), alt: "เมดเปื้อนเลือดถือมีด", pos: "50% 30%" },
} satisfies Record<string, Art>;

export type ArtKey = keyof typeof ART;
