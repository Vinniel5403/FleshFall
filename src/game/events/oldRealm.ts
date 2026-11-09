import { ICON_BY_DOOR } from '../icons.js';
import { VINTAGE_IDS } from '../items.js';
import type { GameEventDef, IconDoor } from '../types.js';
import { DOORS, DUNGEON_RULES } from '../world.js';

const DOOR_WEIGHTS: Record<IconDoor, number> = { green: 7, yellow: 4, gray: 4, orange: 5, white: 2, blue: 2, purple: 2 };

const DOOR_FLAVOR: Record<IconDoor, string> = {
  green: 'กลิ่นน้ำคร่ำลอยออกมาจากรอยแยก มีเสียงทารกร้องแว่ว ๆ',
  yellow: 'ข้างในมืดสนิท ได้ยินเสียงฝีเท้าที่ไม่ใช่ของคุณ',
  gray: 'แสงไฟนีออนแบบโลกจริงลอดออกมา ปลั๊กไฟข้างในดูเหมือนใช้งานได้...',
  orange: 'ประตูส่งเสียงคำราม เหมือนมันหิว',
  white: 'เงียบสงัดจนได้ยินเสียงหัวใจตัวเอง ความหิวเริ่มก่อตัวทั้งที่ยังไม่ได้เข้าไป',
  blue: 'แค่มองเข้าไป ความทรงจำโศกเศร้าก็พุ่งชนหัวเหมือนรถไฟความเร็วสูง',
  purple: 'กลิ่นเปรี้ยวแสบจมูกยิ่งกว่าน้ำส้มสายชู — กลิ่นของความตายที่คืบคลาน',
};

/** One discovery event per icon door color. */
const doorEvents: GameEventDef[] = (Object.keys(DOOR_WEIGHTS) as IconDoor[]).map((door) => {
  const icon = ICON_BY_DOOR[door];
  const d = DOORS[door];
  return {
    id: `door_${door}`,
    title: `${d.emoji} พบ${d.name}`,
    description: `ระหว่างตึกแถวที่ถูกยืดออก มีสิ่งก่อสร้างหนึ่งดึงดูดสายตาอย่างประหลาด\n${DOOR_FLAVOR[door]}\n-# ${DUNGEON_RULES[door].note}`,
    where: 'old_realm',
    weight: DOOR_WEIGHTS[door],
    minLevel: door === 'white' || door === 'blue' || door === 'purple' ? 3 : 1,
    choices: [
      {
        id: 'enter',
        label: 'เข้าไป',
        emoji: '🚪',
        style: door === 'blue' || door === 'purple' ? 'danger' : 'primary',
        hint: `ดันเจียนของ ${icon.name} — ${DUNGEON_RULES[door].retreat === 'locked' ? 'ถอยไม่ได้จนกว่าจะจบ' : DUNGEON_RULES[door].retreat === 'feed' ? 'ออกกลางทางต้องป้อนเนื้อ' : 'ถอยออกได้'}`,
        resolve: () => ({ text: `คุณก้าวผ่าน${d.name}...`, enterDungeon: door }),
      },
      {
        id: 'peek',
        label: 'แง้มดู',
        emoji: '👀',
        style: 'secondary',
        hint: 'ได้ข้อมูลเล็กน้อย แต่เสี่ยงเสียสติ',
        resolve: ({ check }) => {
          const r = check('int', door === 'blue' ? 15 : 11);
          if (door === 'blue') {
            return r.success
              ? { text: `คุณปิดประตูทันก่อนความทรงจำจะท่วมหัว ${r.tag}`, sanity: -4, xp: 8 }
              : { text: `ความโศกของคนนับพันถาโถมเข้ามา คุณทรุดลงร้องไห้โดยไม่รู้สาเหตุ ${r.tag}`, sanity: -15, xp: 5 };
          }
          return r.success
            ? { text: `คุณจดจำโครงสร้างข้างในได้ส่วนหนึ่ง ${r.tag}`, xp: 6 }
            : { text: `บางอย่างข้างในจ้องกลับมา ${r.tag}`, sanity: -6, xp: 3 };
        },
      },
      { id: 'leave', label: 'เดินผ่านไป', emoji: '🚶', style: 'secondary', resolve: () => ({ text: 'ไม่ใช่วันนี้', xp: 1 }) },
    ],
  };
});

export const OLD_REALM_EVENTS: GameEventDef[] = [
  ...doorEvents,
  {
    id: 'red_door',
    title: '🟥 ประตูสีแดง',
    description: 'ประตูสีแดงสดตั้งอยู่โดด ๆ กลางถนนที่ไร้ไฟส่อง ลมเค็มคาวเลือดพัดลอดช่องประตู',
    where: 'old_realm',
    weight: 3,
    choices: [
      {
        id: 'enter',
        label: 'เปิดประตูแดง',
        emoji: '🟥',
        style: 'success',
        hint: 'นำไปสู่ Cypress Isle',
        resolve: () => ({ text: 'คุณก้าวออกมาบนเกาะที่เต็มไปด้วยซากกรีกโบราณ ประตูข้างหลังกลายเป็นสีดำสนิท', travel: 'cypress', xp: 10 }),
      },
      { id: 'leave', label: 'จำตำแหน่งไว้ก่อน', emoji: '🚶', style: 'secondary', resolve: () => ({ text: 'พอหันกลับไป ประตูก็หายไปแล้ว', xp: 1 }) },
    ],
  },
  {
    id: 'frozen_traces',
    title: '👥 เงาที่หยุดนิ่ง',
    description: 'ฝูงเงาโปร่งแสงของคนจากโลกจริงยืนแข็งค้างอยู่กลางทางม้าลาย หนึ่งในนั้นหน้าคุ้นมาก',
    where: 'old_realm',
    weight: 8,
    choices: [
      {
        id: 'search',
        label: 'ค้นของที่ทิ้งไว้',
        emoji: '🖐️',
        style: 'primary',
        hint: 'สัมผัส DC 11 — อาจได้ของวินเทจ',
        resolve: ({ check, rand }) => {
          const r = check('int', 11);
          const v = VINTAGE_IDS[rand(0, VINTAGE_IDS.length - 1)]!;
          return r.success
            ? { text: `ใต้เท้าเงาตนหนึ่งมีของจากโลกจริงตกอยู่ ${r.tag}`, items: { [v]: 1 }, xp: 12 }
            : { text: `เงาตนนั้นหันมามองคุณ... ทั้งที่มันไม่ควรขยับได้ ${r.tag}`, sanity: -8, xp: 4 };
        },
      },
      {
        id: 'touch',
        label: 'แตะเงาที่หน้าคุ้น',
        emoji: '🫳',
        style: 'danger',
        hint: 'ความทรงจำ — ได้ความเป็นมนุษย์ แต่เสียสติ',
        resolve: () => ({ text: 'มือคุณทะลุผ่าน แต่ความอบอุ่นบางอย่างยังหลงเหลืออยู่ คุณจำได้ว่าเคยเป็นใคร', humanity: 4, sanity: -6, xp: 6 }),
      },
      { id: 'leave', label: 'เดินผ่าน', emoji: '🚶', style: 'secondary', resolve: () => ({ text: 'พวกเขาไม่รู้ด้วยซ้ำว่าคุณอยู่ตรงนี้', xp: 1 }) },
    ],
  },
  {
    id: 'miasma_current',
    title: '🌫️ กระแส Miasma',
    description: 'ลมเหม็นเปรี้ยวแสบพัดมาจากทิศเหนือ ซากชีวมวลข้างทางเริ่มเน่าเป็นสีม่วง — Thanatos อยู่ใกล้',
    where: 'old_realm',
    weight: 6,
    choices: [
      {
        id: 'run',
        label: 'วิ่งหนี',
        emoji: '🏃',
        style: 'primary',
        hint: 'ว่องไว DC 12',
        resolve: ({ check, rand }) => {
          const r = check('agi', 12);
          return r.success
            ? { text: `คุณวิ่งพ้นแนวลมทัน ${r.tag}`, stamina: -1, xp: 8 }
            : { text: `ลมไล่ทัน กลิ่นนั้นเข้าไปถึงสมอง ${r.tag}`, stamina: -1, miasma: rand(8, 14), xp: 4 };
        },
      },
      {
        id: 'harvest',
        label: 'เก็บเนื้อเน่า',
        emoji: '🦠',
        style: 'danger',
        hint: 'ได้เนื้อเน่าไปให้บาร์ปรุง แต่โดน Miasma เต็ม ๆ',
        resolve: ({ rand }) => ({ text: 'คุณกลั้นอ้วกแล้วกอบเนื้อเน่าใส่ถุง', items: { rotten_flesh: rand(2, 3) }, miasma: rand(10, 16), xp: 8 }),
      },
    ],
  },
  {
    id: 'newcomer',
    title: '🧍 ผู้หลงมิติคนใหม่',
    description: 'คนหนุ่มในชุดสมัยใหม่ตัวสั่นอยู่ข้างถังขยะ เขายังเป็นมนุษย์เต็มตัว... เนื้อของเขายัง *สด*',
    where: 'old_realm',
    weight: 5,
    choices: [
      {
        id: 'help',
        label: 'ช่วยเขา',
        emoji: '🤝',
        style: 'success',
        hint: 'ความเป็นมนุษย์ +',
        resolve: ({ chance, rand }) =>
          chance(0.7)
            ? { text: 'เขาร้องไห้ขอบคุณ ยื่นของจากโลกจริงให้คุณเป็นการตอบแทน', humanity: 6, items: { [VINTAGE_IDS[rand(0, VINTAGE_IDS.length - 1)]!]: 1 }, xp: 10 }
            : { text: 'เขาตื่นตระหนกแทงคุณแล้ววิ่งหนีไป', humanity: 3, hp: -rand(4, 8), xp: 6 },
      },
      {
        id: 'butcher',
        label: 'แล่เขาเพื่อเอาเนื้อสด',
        emoji: '🔪',
        style: 'danger',
        hint: 'ได้เนื้อสดเยอะ ความเป็นมนุษย์ลดหนัก',
        resolve: ({ check, rand }) => {
          const r = check('str', 10);
          return r.success
            ? { text: `ทุกอย่างจบลงเร็ว คุณไม่ทิ้งเศษให้เสียของ ${r.tag}`, flesh: rand(25, 40), items: { fresh_cut: 1 }, humanity: -12, xp: 18 }
            : { text: `เขาสู้กลับอย่างบ้าคลั่งก่อนจะหนีไปได้ ${r.tag}`, hp: -rand(5, 9), humanity: -6, xp: 6 };
        },
      },
      {
        id: 'ignore',
        label: 'ปล่อยเขาไว้',
        emoji: '🚶',
        style: 'secondary',
        resolve: () => ({ text: 'ที่นี่การมีชีวิตอยู่ก็คือความตายทั้งเป็นอยู่แล้ว...', sanity: -2, xp: 2 }),
      },
    ],
  },
  {
    id: 'jamais_vu',
    title: '🛏️ ห้องนอนที่ไม่คุ้นเคย',
    description: 'คุณเปิดประตูเข้าไปพบห้องนอนของคุณเองจากโลกจริง แต่สัดส่วนผิดเพี้ยนไปนิดหนึ่ง — Jamais vu',
    where: 'old_realm',
    weight: 4,
    choices: [
      {
        id: 'rest',
        label: 'นอนพักบนเตียง',
        emoji: '😴',
        style: 'primary',
        hint: 'สัมผัส DC 13 — ถ้าพลาด สติจะแตกเล็กน้อย',
        resolve: ({ check }) => {
          const r = check('int', 13);
          return r.success
            ? { text: `คุณหลับไปจริง ๆ เป็นครั้งแรกในรอบหลายปี ${r.tag}`, stamina: 4, sanity: 10, xp: 8 }
            : { text: `เพดานเริ่มหายใจ คุณกระโดดออกมา ${r.tag}`, sanity: -10, xp: 4 };
        },
      },
      {
        id: 'search',
        label: 'ค้นลิ้นชัก',
        emoji: '🗄️',
        style: 'secondary',
        resolve: ({ rand }) => ({ text: 'ลิ้นชักมีของที่คุณจำได้ว่าเคยวางไว้', items: { [VINTAGE_IDS[rand(0, VINTAGE_IDS.length - 1)]!]: 1 }, sanity: -4, xp: 6 }),
      },
      { id: 'flee', label: 'วิ่งออกไป', emoji: '🏃', style: 'secondary', resolve: () => ({ text: 'คุณทนไม่ได้ และวิ่งออกไปทันที', stamina: -1, xp: 2 }) },
    ],
  },
  {
    id: 'ambush_survivors',
    title: '🪓 ผู้รอดชีวิตซุ่มโจมตี',
    description: 'กลุ่มผู้รอดชีวิตผอมโซถือมีดทำจากกระดูกล้อมคุณไว้ "เนื้อ... ขอเนื้อของแกหน่อย"',
    where: 'old_realm',
    weight: 5,
    choices: [
      {
        id: 'fight',
        label: 'สู้',
        emoji: '⚔️',
        style: 'danger',
        hint: 'พละ DC 13',
        resolve: ({ check, rand }) => {
          const r = check('str', 13);
          return r.success
            ? { text: `คุณล้มพวกมันได้ทั้งหมด ${r.tag}`, flesh: rand(10, 20), items: { bone: 2 }, humanity: -2, xp: 20 }
            : { text: `พวกมันเฉือนเนื้อคุณไปคนละชิ้น ${r.tag}`, hp: -rand(8, 13), xp: 6 };
        },
      },
      {
        id: 'pay',
        label: 'ยื่นเนื้อสดให้ 10',
        emoji: '🥩',
        style: 'secondary',
        visible: (c) => c.flesh >= 10,
        resolve: () => ({ text: 'พวกมันแย่งกันกินแล้วปล่อยคุณไป ใครจะมีแรงสู้กันล่ะ เปลืองเปล่า ๆ', flesh: -10, xp: 4 }),
      },
      {
        id: 'run',
        label: 'หนี',
        emoji: '🏃',
        style: 'primary',
        hint: 'ว่องไว DC 12',
        resolve: ({ check, rand }) => {
          const r = check('agi', 12);
          return r.success
            ? { text: `คุณหายเข้าไปในตรอกที่ยืดยาวไม่สิ้นสุด ${r.tag}`, stamina: -2, xp: 8 }
            : { text: `มีดกระดูกปักหลังคุณ ${r.tag}`, hp: -rand(5, 9), stamina: -2, xp: 3 };
        },
      },
    ],
  },
  {
    id: 'flesh_tree',
    title: '🌳 ต้นไม้เนื้อ',
    description: 'ต้นไม้ริมทางกลายพันธุ์เป็นเนื้อและกระดูก มีผลดวงตาห้อยระย้ากระพริบพร้อมกัน',
    where: 'old_realm',
    weight: 6,
    choices: [
      {
        id: 'pick',
        label: 'เด็ดผลดวงตา',
        emoji: '👁️',
        style: 'primary',
        hint: 'ว่องไว DC 10',
        resolve: ({ check, rand }) => {
          const r = check('agi', 10);
          return r.success
            ? { text: `คุณเด็ดได้หลายลูกก่อนกิ่งจะตวัดมา ${r.tag}`, items: { eye_fruit: rand(1, 3), wild_flour: 1 }, xp: 8 }
            : { text: `กิ่งไม้รัดแขนคุณแล้วดูดเลือด ${r.tag}`, hp: -rand(3, 6), items: { eye_fruit: 1 }, xp: 4 };
        },
      },
      { id: 'leave', label: 'ไม่ยุ่ง', emoji: '🚶', style: 'secondary', resolve: () => ({ text: 'ดวงตาทุกดวงมองตามคุณไปจนสุดถนน', sanity: -1, xp: 1 }) },
    ],
  },
  {
    id: 'crimson_fiend',
    title: '🌕 Fiend ใต้แสงจันทร์สีเลือด',
    description: 'Crimson Moon ส่องลงมา เศษเดนเนื้อตนหนึ่งข้างทางกำลังสูญเสียสติสุดท้าย ร่างมันบิดเบี้ยวเป็น Fiend ต่อหน้าคุณ',
    where: 'old_realm',
    crimson: 'only',
    weight: 12,
    choices: [
      {
        id: 'fight',
        label: 'ฆ่ามันก่อนแปลงร่างเสร็จ',
        emoji: '⚔️',
        style: 'danger',
        hint: 'พละ DC 15',
        resolve: ({ check, rand }) => {
          const r = check('str', 15);
          return r.success
            ? { text: `คุณตัดหัวมันขาดทันเวลา ${r.tag}`, flesh: rand(20, 35), items: { sigil: 1 }, xp: 35 }
            : { text: `ร่าง Fiend ที่สมบูรณ์ฉีกคุณเป็นชิ้น ๆ ${r.tag}`, hp: -rand(12, 18), sanity: -8, xp: 10 };
        },
      },
      {
        id: 'hide',
        label: 'หลบเข้าตึกให้พ้นแสงจันทร์',
        emoji: '🏚️',
        style: 'primary',
        hint: 'ว่องไว DC 12',
        resolve: ({ check }) => {
          const r = check('agi', 12);
          return r.success
            ? { text: `คุณหลบเข้าที่ร่มได้ทัน ${r.tag}`, xp: 10 }
            : { text: `แสงจันทร์สีเลือดแผดเผาสติคุณ ${r.tag}`, sanity: -14, humanity: -3, xp: 4 };
        },
      },
    ],
  },
];
