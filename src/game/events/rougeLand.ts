import { VINTAGE_IDS } from '../items.js';
import type { Character, GameEventDef } from '../types.js';

const vintageOwned = (c: Character) => VINTAGE_IDS.find((id) => (c.inventory[id] ?? 0) > 0);

export const ROUGE_LAND_EVENTS: GameEventDef[] = [
  {
    id: 'patron_commission',
    title: '🎩 คำว่าจ้างจาก Patron',
    description: 'Flesh Remnant ร่างพองในสูทลายทางเรียกคุณ "ข้าตามหาของจากโลกจริง... จ่ายเป็นเนื้อสดอย่างงาม"',
    where: 'rouge_land',
    weight: 8,
    choices: [
      {
        id: 'sell',
        label: 'ยื่นของวินเทจให้',
        emoji: '🖼️',
        style: 'success',
        visible: (c) => !!vintageOwned(c),
        hint: 'ขายของวินเทจได้ราคาดีกว่าร้าน',
        resolve: ({ char, rand }) => {
          const v = vintageOwned(char)!;
          return { text: 'เขาลูบมันด้วยนิ้วที่เยิ้มเมือก "ของแท้..."', items: { [v]: -1 }, flesh: rand(50, 80), xp: 15 };
        },
      },
      {
        id: 'accept',
        label: 'รับงานล่า',
        emoji: '📜',
        style: 'primary',
        hint: 'ได้มัดจำเนื้อสด — ใช้ /travel ออกไปล่าที่ Old Realm',
        resolve: ({ rand }) => ({ text: '"กลับมาพร้อมของล้ำค่า แล้วข้าจะจ่ายมากกว่านี้"', flesh: rand(8, 15), xp: 6 }),
      },
      { id: 'decline', label: 'ปฏิเสธ', emoji: '🙅', style: 'secondary', resolve: () => ({ text: 'เขาหัวเราะเสียงเปียก ๆ แล้วเดินจากไป', xp: 1 }) },
    ],
  },
  {
    id: 'confessional',
    title: '⛪ ห้องสารภาพแห่งความอยาก',
    description: 'บาทหลวงดาเมียโนผูกคุณไว้ในห้องแคบ เนื้อสดเกรดพรีเมียมส่งกลิ่นหอมหวานอยู่ตรงหน้า เสียงสวดดังมาจากข้างนอก',
    where: 'rouge_land',
    roles: ['maid'],
    weight: 6,
    choices: [
      {
        id: 'endure',
        label: 'อดกลั้น',
        emoji: '🙏',
        style: 'primary',
        hint: 'สัมผัส DC 13 — ผ่านแล้วได้ความเป็นมนุษย์คืน',
        resolve: ({ check }) => {
          const r = check('int', 13);
          return r.success
            ? { text: `คุณไม่แม้แต่จะกลืนน้ำลาย บาทหลวงพยักหน้าพอใจ ${r.tag}`, humanity: 8, sanity: 5, xp: 25 }
            : { text: `คุณทนไม่ไหว ฟันคุณจมลงในเนื้อนั้น บทลงโทษตามมาทันที ${r.tag}`, humanity: -5, hp: -8, xp: 8 };
        },
      },
    ],
  },
  {
    id: 'damiano_training',
    title: '🗡️ ระบำมีดแล่เนื้อ',
    description: 'บาทหลวงดาเมียโนกดกริชลงบนซากศพทดลอง "อวัยวะนี้คืออะไร? เกรดอะไร? แล่ตามจังหวะบทสวด"',
    where: 'rouge_land',
    weight: 6,
    choices: [
      {
        id: 'dissect',
        label: 'แล่ตามจังหวะ plagal cadence',
        emoji: '🔪',
        style: 'primary',
        hint: 'ว่องไว DC 12',
        resolve: ({ check, rand }) => {
          const r = check('agi', 12);
          return r.success
            ? { text: `มีดของคุณไหลไปตามเสียงสวดไม่พลาดสักจังหวะ ${r.tag}`, xp: 25, flesh: rand(5, 10) }
            : { text: `คุณกรีดช้ำไปหนึ่งจุด และได้รับการลงโทษทันที ${r.tag}`, hp: -rand(4, 8), xp: 10 };
        },
      },
      {
        id: 'name_organ',
        label: 'ระบุอวัยวะและเกรด',
        emoji: '🧠',
        style: 'secondary',
        hint: 'สัมผัส DC 12',
        resolve: ({ check }) => {
          const r = check('int', 12);
          return r.success
            ? { text: `"ตับ เกรด A ปลอดคำสาป" — ถูกต้อง ${r.tag}`, xp: 22 }
            : { text: `"ผิด" บาทหลวงกดกริชลงที่จุดเดียวกันบนตัวคุณ ${r.tag}`, hp: -5, sanity: -4, xp: 8 };
        },
      },
    ],
  },
  {
    id: 'butchery_shift',
    title: '🏪 กะหน้าร้านเนื้อ',
    description: 'ร้านเนื้อสาขาหนึ่งขาดคน ลูกค้าเศษเดนเนื้อต่อแถวยาว ประตูหลังร้านเชื่อมตรงสู่ Le Fontaine de Sang',
    where: 'rouge_land',
    weight: 7,
    choices: [
      {
        id: 'serve',
        label: 'ช่วยขายหน้าร้าน',
        emoji: '⚖️',
        style: 'primary',
        hint: 'สัมผัส DC 10 — ได้ค่าแรงเป็นเนื้อสด',
        resolve: ({ check, rand }) => {
          const r = check('int', 10);
          return r.success
            ? { text: `คุณชั่งเนื้อแม่นทุกกรัม ลูกค้าพอใจ ${r.tag}`, flesh: rand(12, 22), xp: 12 }
            : { text: `ลูกค้าคนหนึ่งคลั่งเพราะเนื้อไม่พอ กัดแขนคุณ ${r.tag}`, hp: -rand(3, 6), flesh: rand(4, 8), xp: 6 };
        },
      },
      {
        id: 'dispose',
        label: 'กำจัดเนื้อตกเกรด (ด้วยการกิน)',
        emoji: '🍽️',
        style: 'danger',
        hint: 'หน้าที่ Grade D — อิ่ม แต่เสียความเป็นมนุษย์',
        resolve: () => ({ text: 'หน้าที่ก็คือหน้าที่', hp: 10, stamina: 2, humanity: -3, xp: 8 }),
      },
    ],
  },
  {
    id: 'bar_sanctuary',
    title: '🍷 บาร์ — เขตปลอดภัย',
    description: 'ที่เดียวที่มนุษย์และ Flesh Remnant นั่งโต๊ะเดียวกันได้ เจ้าของบาร์ในสภาวะไม่เสถียรกำลังเคี่ยวหม้อเนื้อเน่า',
    where: 'rouge_land',
    weight: 7,
    choices: [
      {
        id: 'eat',
        label: 'สั่งสตูว์ (8 เนื้อสด)',
        emoji: '🥘',
        style: 'success',
        visible: (c) => c.flesh >= 8,
        hint: 'บรรเทาผลกรรมของ Icon',
        resolve: () => ({ text: 'รสชาติแปลก แต่ร่างกายคุณเบาลงอย่างน่าประหลาด', flesh: -8, hp: 8, sanity: 12, humanity: 4, xp: 5 }),
      },
      {
        id: 'gossip',
        label: 'ฟังเรื่องเล่า',
        emoji: '👂',
        style: 'primary',
        resolve: ({ chance }) =>
          chance(0.5)
            ? { text: 'Hound ขี้เมาเล่าถึงประตูสีส้มที่นำไปสู่ศาลของ Beelzebub — คุณจดไว้', xp: 12 }
            : { text: 'มีคนเล่าเรื่อง Abysmarine จนทั้งบาร์เงียบกริบ', sanity: -3, xp: 10 },
      },
      {
        id: 'feed_owner',
        label: 'มอบเนื้อเน่าให้เจ้าของบาร์',
        emoji: '🦠',
        style: 'secondary',
        visible: (c) => (c.inventory['rotten_flesh'] ?? 0) > 0,
        resolve: () => ({ text: 'เจ้าของบาร์ยิ้มให้ร่างที่สั่นไหวคงรูปขึ้น และตอบแทนคุณด้วยไวน์', items: { rotten_flesh: -1, blood_wine: 1 }, humanity: 2, xp: 8 }),
      },
    ],
  },
  {
    id: 'hound_friction',
    title: '🐺 Hound กับ Maid',
    description: 'Hound ร่างกลายพันธุ์แขนที่สามลากซากสัตว์เข้ามา มันยิ้มให้เมดคนหนึ่งเกินหน้าที่... สิ่งต้องห้าม',
    where: 'rouge_land',
    weight: 4,
    choices: [
      {
        id: 'report',
        label: 'รายงานบาทหลวง',
        emoji: '📜',
        style: 'primary',
        resolve: () => ({ text: 'ระเบียบต้องคงอยู่ คุณได้รางวัลเป็นเนื้อสด', flesh: 12, humanity: -2, xp: 10 }),
      },
      {
        id: 'ignore',
        label: 'ทำเป็นไม่เห็น',
        emoji: '🙈',
        style: 'secondary',
        resolve: () => ({ text: 'ในโลกนี้ ความอ่อนโยนเล็ก ๆ ก็ยังหลงเหลืออยู่', humanity: 3, xp: 5 }),
      },
    ],
  },
  {
    id: 'fontaine',
    title: '⛲ Le Fontaine de Sang',
    description: 'น้ำพุโลหิตกลางลานสวนดอกไม้สีแดงฉาน ใต้โดมหลังคาสีเทอร์ควอยซ์ เสียงระฆังโบสถ์ดังขึ้น',
    where: 'rouge_land',
    weight: 5,
    choices: [
      { id: 'pray', label: 'สวดภาวนา', emoji: '🙏', style: 'primary', resolve: () => ({ text: 'ความสงบไหลผ่านเหมือนเลือดในน้ำพุ', sanity: 10, humanity: 2, xp: 6 }) },
      {
        id: 'drink',
        label: 'วักเลือดจากน้ำพุดื่ม',
        emoji: '🩸',
        style: 'danger',
        hint: 'ฟื้นแรงมาก แต่ถูกเมดจับได้หรือเปล่า? (ว่องไว DC 14)',
        resolve: ({ check }) => {
          const r = check('agi', 14);
          return r.success
            ? { text: `อุ่นและหวาน ไม่มีใครเห็น ${r.tag}`, stamina: 6, hp: 10, humanity: -3, xp: 10 }
            : { text: `เมด Grade B เห็นคุณพอดี บทลงโทษไม่ปรานี ${r.tag}`, hp: -12, flesh: -10, xp: 4 };
        },
      },
    ],
  },
  {
    id: 'crimson_lockdown',
    title: '🌕 Crimson Moon ขึ้นเหนือเกาะ',
    description: 'ระฆังเตือนดังทั่วเกาะ ทุกคนต้องเข้าที่ร่ม เสียงคำรามของเศษเดนเนื้อที่ติดอยู่ข้างนอกดังมาจากถนน',
    where: 'rouge_land',
    crimson: 'only',
    weight: 14,
    choices: [
      { id: 'shelter', label: 'หลบในอาคาร', emoji: '🏠', style: 'primary', resolve: () => ({ text: 'คุณปิดหน้าต่างทุกบาน และรอจนแสงสีเลือดจางไป', stamina: 2, sanity: 3, xp: 4 }) },
      {
        id: 'hunt',
        label: 'ออกไปเก็บเนื้อจาก Fiend ตัวใหม่',
        emoji: '🔪',
        style: 'danger',
        hint: 'พละ DC 15 — รางวัลสูง เสี่ยงมาก',
        resolve: ({ check, rand }) => {
          const r = check('str', 15);
          return r.success
            ? { text: `คุณกลับมาพร้อมเนื้อ Fiend สด ๆ ${r.tag}`, flesh: rand(30, 50), items: { fresh_cut: 1 }, sanity: -8, xp: 35 }
            : { text: `แสงจันทร์และกรงเล็บพร้อมกัน ${r.tag}`, hp: -rand(10, 16), sanity: -15, humanity: -4, xp: 10 };
        },
      },
    ],
  },
];
