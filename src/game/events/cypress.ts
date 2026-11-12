import { VINTAGE_IDS } from '../items.js';
import { itemCount } from '../character.js';
import type { Character, GameEventDef } from '../types.js';

const hasVintage = (c: Character) => VINTAGE_IDS.some((id) => itemCount(c, id) > 0);
const canSeeFerryman = (c: Character) => c.humanity <= 60;

export const CYPRESS_EVENTS: GameEventDef[] = [
  {
    id: 'ferryman',
    title: '⛵ คนพายเรือในผ้าคลุม',
    description: 'ริมหาดทางใต้ของเกาะ ทะเลข้นเหมือนเลือดเก่า ไกลออกไปมีแผ่นดินสีแดงฉาน...',
    where: 'cypress',
    weight: 10,
    choices: [
      {
        id: 'too_human',
        label: 'มองหาเรือ',
        emoji: '🔍',
        style: 'secondary',
        visible: (c) => !canSeeFerryman(c),
        hint: 'ต้องเหลือความเป็นมนุษย์ ≤ 60 ถึงจะมองเห็นคนพายเรือ',
        resolve: () => ({ text: 'ไม่มีอะไรเลย มีแต่ทะเลนิ่งสนิท... บางทีคุณอาจยัง *เป็นมนุษย์* มากเกินไป', sanity: -3, xp: 3 }),
      },
      {
        id: 'pay_vintage',
        label: 'สละของจากโลกจริง',
        emoji: '🖼️',
        style: 'success',
        visible: (c) => canSeeFerryman(c) && hasVintage(c),
        hint: 'ค่าโดยสาร: ของวินเทจ 1 ชิ้น',
        resolve: ({ char }) => {
          const v = VINTAGE_IDS.find((id) => itemCount(char, id) > 0)!;
          return {
            text: 'คนพายเรือรับของล้ำค่านั้นไปโดยไม่พูดอะไร เรือแล่นผ่าน Abysmarine ที่ใหญ่เท่าตึกระฟ้า ไปสู่แผ่นดินที่หัวใจยังเต้น',
            items: { [v]: -1 },
            travel: 'rouge_land',
            unlockRougeLand: true,
            xp: 40,
          };
        },
      },
      {
        id: 'pay_flesh',
        label: 'สละเนื้อของตัวเอง',
        emoji: '🩸',
        style: 'danger',
        visible: canSeeFerryman,
        hint: 'ค่าโดยสาร: เนื้อกาย 15 และความเป็นมนุษย์',
        resolve: () => ({
          text: 'คุณเฉือนเนื้อตัวเองยื่นให้ คนพายเรือพยักหน้าช้า ๆ "ราคาที่ล้ำค่าที่สุด... คือตัวเจ้าเอง"',
          hp: -15,
          humanity: -8,
          travel: 'rouge_land',
          unlockRougeLand: true,
          xp: 40,
        }),
      },
      { id: 'wait', label: 'ยังไม่พร้อม', emoji: '🚶', style: 'secondary', resolve: () => ({ text: 'คุณหันหลังให้ทะเล', xp: 1 }) },
    ],
  },
  {
    id: 'greek_ruins',
    title: '🏛️ ซากวิหารกรีก',
    description: 'เสาหินหักโค่นเรียงราย มีแท่นบูชาเก่าที่ยังมีคราบเลือดสด',
    where: 'cypress',
    weight: 6,
    choices: [
      {
        id: 'search',
        label: 'ค้นแท่นบูชา',
        emoji: '🔍',
        style: 'primary',
        hint: 'สัมผัส DC 12',
        resolve: ({ check, rand }) => {
          const r = check('int', 12);
          return r.success
            ? { text: `ใต้แท่นมีของเซ่นที่ยังไม่มีใครเอาไป ${r.tag}`, items: { sigil: 1 }, flesh: rand(5, 15), xp: 14 }
            : { text: `จารึกบนแท่นสลับตัวอักษรขณะที่คุณอ่าน ${r.tag}`, sanity: -7, xp: 5 };
        },
      },
      {
        id: 'pray',
        label: 'สวดบท First Verses',
        emoji: '🙏',
        style: 'secondary',
        resolve: () => ({ text: 'เสียงสวดของคุณสะท้อนกลับมาเป็นเสียงของคนหลายสิบ', humanity: 3, sanity: 5, xp: 6 }),
      },
    ],
  },
  {
    id: 'abysmarine_shore',
    title: '🌊 Abysmarine',
    description: 'ผิวทะเลสีเลือดเก่าโป่งพองขึ้น หนวดยาวนับร้อยเมตรพร้อมดวงตาหลายล้านดวงโผล่ขึ้นมามอง',
    where: 'cypress',
    weight: 4,
    choices: [
      {
        id: 'stare',
        label: 'จ้องกลับ',
        emoji: '👁️',
        style: 'danger',
        hint: 'สัมผัส DC 16 — รางวัลสูง เสี่ยงสติแตก',
        resolve: ({ check }) => {
          const r = check('int', 16);
          return r.success
            ? { text: `คุณเห็นบางสิ่งที่สมองมนุษย์ไม่ควรรับได้ แต่คุณรับได้ ${r.tag}`, xp: 45, sanity: -5 }
            : { text: `สมองคุณพยายามประมวลผลรูปทรงที่ไม่มีอยู่ ${r.tag}`, sanity: -22, xp: 10 };
        },
      },
      { id: 'look_away', label: 'ก้มหน้าหนี', emoji: '🙈', style: 'primary', resolve: () => ({ text: 'มันจมกลับลงไปช้า ๆ', sanity: -3, xp: 3 }) },
    ],
  },
  {
    id: 'black_doors',
    title: '⬛ ทุ่งประตูดำ',
    description: 'ประตูสีดำสนิทดุจ Vantablack นับไม่ถ้วนตั้งเรียงหันหน้าไปทางทิศใต้',
    where: 'cypress',
    weight: 4,
    choices: [
      {
        id: 'back',
        label: 'กลับ Old Realm',
        emoji: '⬛',
        style: 'secondary',
        resolve: () => ({ text: 'คุณก้าวผ่านประตูดำ กลับไปยังจุดที่เคยอยู่', travel: 'old_realm', xp: 2 }),
      },
      { id: 'stay', label: 'อยู่บนเกาะต่อ', emoji: '🏝️', style: 'primary', resolve: () => ({ text: 'ยังมีอะไรให้สำรวจอีก', xp: 1 }) },
    ],
  },
];
