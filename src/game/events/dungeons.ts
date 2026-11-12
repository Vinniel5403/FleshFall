import { itemCount } from '../character.js';
import type { GameEventDef } from '../types.js';

export const DUNGEON_EVENTS: GameEventDef[] = [
  // ================= GREEN — Sophia / Birth =================
  {
    id: 'g_womb_wall',
    door: 'green',
    title: '🟩 ผนังมดลูก',
    description: 'ผนังทั้งห้องเป็นมดลูกโปร่งแสง ทารกผิดรูปดิ้นอยู่ข้างใน บางตัวกำลังจะคลอด',
    weight: 10,
    choices: [
      {
        id: 'harvest',
        label: 'เก็บเกี่ยวเนื้อทารก',
        emoji: '🍼',
        style: 'primary',
        hint: 'ว่องไว DC 11',
        resolve: ({ check, rand }) => {
          const r = check('agi', 11);
          return r.success
            ? { text: `คุณกรีดเอาเนื้อจากรกได้โดยไม่ปลุกพวกมัน ${r.tag}`, items: { fetal_flesh: rand(2, 3) }, xp: 12 }
            : { text: `ทารกตัวหนึ่งคลอดออกมาและกัดคุณ — มันงอกแขนใหม่ทันทีที่คุณฟันขาด ${r.tag}`, hp: -rand(5, 9), items: { fetal_flesh: 1 }, xp: 8 };
        },
      },
      { id: 'sneak', label: 'ย่องผ่าน', emoji: '🤫', style: 'secondary', resolve: () => ({ text: 'เสียงหัวใจเต้นนับร้อยดวงตามคุณไป', sanity: -3, xp: 5 }) },
    ],
  },
  {
    id: 'g_hive',
    door: 'green',
    title: '🟩 รังรังไข่ยักษ์',
    description: 'กลุ่มรังไข่ขนาดเท่าบ้านเต้นเป็นจังหวะ ดูนานไปจะคลื่นไส้',
    weight: 8,
    choices: [
      {
        id: 'cut',
        label: 'ผ่ารังไข่',
        emoji: '🔪',
        style: 'danger',
        hint: 'พละ DC 12 — อาจได้เนื้อเกรดพรีเมียม',
        resolve: ({ check, rand }) => {
          const r = check('str', 12);
          return r.success
            ? { text: `ข้างในมีเนื้อสดบริสุทธิ์ ไร้คำสาป ${r.tag}`, items: { fresh_cut: 1, fetal_flesh: 1 }, flesh: rand(5, 12), xp: 16 }
            : { text: `ของเหลวพุ่งใส่หน้าคุณ — มีบางอย่างเริ่มงอกบนผิว ${r.tag}`, hp: -rand(4, 7), mutation: 'ตุ่มเนื้องอกเล็ก ๆ บนแก้ม', xp: 8 };
        },
      },
      { id: 'leave', label: 'อย่ามอง', emoji: '🙈', style: 'secondary', resolve: () => ({ text: 'คุณเบือนหน้าแล้วเดินต่อ', xp: 3 }) },
    ],
  },
  {
    id: 'g_boss_knight',
    door: 'green',
    boss: true,
    title: '🟩👹 อัศวินเกราะโชกเลือด',
    description: 'ปีศาจในชุดเกราะอัศวินกำลังดูดกลืนและหลอมรวมกับซากเด็กสาว "ข้าคือโซเฟีย... มารดาผู้ให้กำเนิดทุกสรรพสิ่ง"',
    weight: 1,
    choices: [
      {
        id: 'fight',
        label: 'สู้',
        emoji: '⚔️',
        style: 'danger',
        hint: 'พละ DC 15',
        resolve: ({ check, rand }) => {
          const r = check('str', 15);
          return r.success
            ? { text: `เกราะแตกออก ข้างในว่างเปล่า มีเพียงเนื้อที่ยังเต้น ${r.tag}`, flesh: rand(25, 40), items: { rusted_armor: 1 }, xp: 45 }
            : { text: `มันพยายามใช้ร่างคุณเป็นภาชนะ คุณดิ้นหลุดมาได้หวุดหวิด ${r.tag}`, hp: -rand(12, 18), mutation: 'สายรกพันรอบข้อมือ', xp: 15 };
        },
      },
      {
        id: 'talk',
        label: 'คุยกับมัน',
        emoji: '🗣️',
        style: 'primary',
        hint: 'สัมผัส DC 14',
        resolve: ({ check }) => {
          const r = check('int', 14);
          return r.success
            ? { text: `มันเล่าถึงการหลอมรวมกับผู้ให้กำเนิดคือการเกิดใหม่ที่แท้จริง แล้วปล่อยคุณไป ${r.tag}`, xp: 40, sanity: -6 }
            : { text: `คำพูดของมันฝังลงในหัวคุณ "ทุกสิ่งคือหนึ่งเดียว..." ${r.tag}`, sanity: -15, humanity: -4, xp: 12 };
        },
      },
    ],
  },

  // ================= YELLOW — Hastur / Fear =================
  {
    id: 'y_footsteps',
    door: 'yellow',
    title: '🟨 เสียงฝีเท้าในความมืด',
    description: 'มืดสนิท ประตูล็อกแล้ว ทางเดินประดับด้วยซากศพและขี้เถ้า มีเสียงฝีเท้าก้าวตามจังหวะคุณพอดี',
    weight: 10,
    choices: [
      {
        id: 'light',
        label: 'จุดไฟแช็ก',
        emoji: '🔥',
        style: 'success',
        visible: (c) => itemCount(c, 'lighter') > 0,
        hint: 'มีไฟแช็ก — ปลอดภัยกว่ามาก',
        resolve: ({ rand }) => ({ text: 'แสงไฟเผยให้เห็นทาง... และเงาสูงสามเมตรที่ถอยหนีแสง', items: { bone: rand(1, 2) }, sanity: -2, xp: 14 }),
      },
      {
        id: 'run',
        label: 'วิ่งในความมืด',
        emoji: '🏃',
        style: 'primary',
        hint: 'ว่องไว DC 14 (ไม่มีแสง)',
        resolve: ({ check, rand }) => {
          const r = check('agi', 14);
          return r.success
            ? { text: `ขาคุณแข็งแรงพอ ${r.tag}`, stamina: -2, xp: 14 }
            : { text: `คุณล้มลงกลางซากศพ บางอย่างลูบหลังคุณ ${r.tag}`, hp: -rand(5, 9), sanity: -10, xp: 6 };
        },
      },
    ],
  },
  {
    id: 'y_whispers',
    door: 'yellow',
    title: '🟨 เสียงกระซิบจากผนัง',
    description: 'ผนังกระซิบชื่อของคุณ บอกตำแหน่งของสิ่งที่ซ่อนอยู่... หรือมันกำลังหลอก?',
    weight: 8,
    choices: [
      {
        id: 'listen',
        label: 'ตั้งใจฟัง',
        emoji: '👂',
        style: 'primary',
        hint: 'สัมผัส DC 13',
        resolve: ({ check, rand }) => {
          const r = check('int', 13);
          return r.success
            ? { text: `เสียงนำคุณไปเจอซอกที่ซ่อนของไว้ ${r.tag}`, flesh: rand(10, 20), items: { pocket_watch: 1 }, xp: 18 }
            : { text: `เสียงไม่หยุด แม้คุณจะอุดหูแล้ว ${r.tag}`, sanity: -12, xp: 6 };
        },
      },
      { id: 'cover', label: 'อุดหู เดินต่อ', emoji: '🙉', style: 'secondary', resolve: () => ({ text: 'คุณฮัมเพลงกลบเสียง', sanity: -4, xp: 5 }) },
    ],
  },
  {
    id: 'y_boss_dread',
    door: 'yellow',
    boss: true,
    title: '🟨👹 ผู้ทำให้หวาดผวา',
    description: 'ร่างแขนขายาวผิดสัดส่วน ดวงตาว่างเปล่าไม่สมมาตร เงาของมันเต็มทั้งห้อง ความกลัวดั้งเดิมพุ่งขึ้นจากไขสันหลัง',
    weight: 1,
    choices: [
      {
        id: 'face',
        label: 'เผชิญหน้า',
        emoji: '⚔️',
        style: 'danger',
        hint: 'พละ DC 15',
        resolve: ({ check, rand, has }) => {
          const r = check('str', has('lighter') ? 13 : 16);
          return r.success
            ? { text: `มันสลายเป็นขี้เถ้าเมื่อคุณไม่ยอมกลัว ${r.tag}`, flesh: rand(25, 40), items: { sigil: 1 }, xp: 45 }
            : { text: `คุณวิ่งหนีจนสุดห้อง ทั้งที่จำไม่ได้ว่าตัดสินใจหนีตอนไหน ${r.tag}`, hp: -rand(8, 14), sanity: -18, xp: 15 };
        },
      },
      {
        id: 'hide',
        label: 'ซ่อนตัวรอมันผ่าน',
        emoji: '🫥',
        style: 'primary',
        hint: 'ว่องไว DC 14',
        resolve: ({ check }) => {
          const r = check('agi', 14);
          return r.success
            ? { text: `มันเดินผ่านไปทั้งที่ห่างคุณแค่คืบ ${r.tag}`, xp: 35, sanity: -6 }
            : { text: `มันก้มลงมามองหน้าคุณตรง ๆ ${r.tag}`, sanity: -22, xp: 12 };
        },
      },
    ],
  },

  // ================= GRAY — Loki / Distortion =================
  {
    id: 'gr_convenience',
    door: 'gray',
    title: '⬜ ร้านสะดวกซื้อ',
    description: 'ร้านสะดวกซื้อจากโลกจริง ไฟติด ปลั๊กใช้ได้ ชั้นวางเต็มไปด้วยบะหมี่กึ่งสำเร็จรูปและโชยุ',
    weight: 10,
    choices: [
      {
        id: 'grab',
        label: 'หยิบของแล้วไปต่อ',
        emoji: '🛒',
        style: 'primary',
        resolve: ({ rand }) => ({ text: 'คุณกวาดของใส่กระเป๋าแล้วรีบออกมา', items: { instant_noodle: rand(1, 2) }, xp: 10 }),
      },
      {
        id: 'stay',
        label: 'นั่งพักสักครู่',
        emoji: '🪑',
        style: 'danger',
        hint: 'สัมผัส DC 14 — ระวังลืมเวลา',
        resolve: ({ check }) => {
          const r = check('int', 14);
          return r.success
            ? { text: `คุณรู้ตัวทันก่อนจะติดกับดักเวลา ${r.tag}`, stamina: 4, sanity: 15, xp: 12 }
            : { text: `คุณลืมไปแล้วว่ามาทำอะไร... ผ่านไปกี่วันแล้ว? ${r.tag}`, stamina: -4, humanity: -4, sanity: -6, xp: 4 };
        },
      },
    ],
  },
  {
    id: 'gr_desire',
    door: 'gray',
    title: '⬜ คนที่คุณรอคอย',
    description: 'คนที่สวยงามที่สุดเท่าที่คุณเคยจินตนาการยืนรออยู่ ภาพนี้สร้างจากจิตใต้สำนึกของคุณเอง',
    weight: 7,
    choices: [
      {
        id: 'resist',
        label: 'ปฏิเสธ',
        emoji: '✋',
        style: 'primary',
        hint: 'สัมผัส DC 13',
        resolve: ({ check }) => {
          const r = check('int', 13);
          return r.success
            ? { text: `ภาพนั้นแตกเป็นเสี่ยงเหมือนกระจก ${r.tag}`, xp: 18, humanity: 2 }
            : { text: `คุณยื่นมือออกไป... มันแทบจะกลืนคุณเป็นทรัพยากรของดันเจียน ${r.tag}`, humanity: -6, hp: -6, xp: 6 };
        },
      },
    ],
  },
  {
    id: 'gr_boss_mirror',
    door: 'gray',
    boss: true,
    title: '⬜👹 ตัวคุณอีกคน',
    description: 'สิ่งมีชีวิตเรขาคณิตไม่เสถียรค่อย ๆ ปั้นตัวเองให้เป็นคุณ พูดด้วยเสียงคุณ "ใครคือตัวจริง?"',
    weight: 1,
    choices: [
      {
        id: 'assert',
        label: 'ยืนยันตัวตน',
        emoji: '🪞',
        style: 'primary',
        hint: 'สัมผัส DC 15',
        resolve: ({ check, rand }) => {
          const r = check('int', 15);
          return r.success
            ? { text: `ภาพลวงพังทลาย เหลือเพียงประตู ${r.tag}`, flesh: rand(20, 35), items: { vinyl_record: 1 }, xp: 45 }
            : { text: `ตอนนี้คุณไม่แน่ใจแล้วว่าใครเดินออกมาจากห้องนั้น ${r.tag}`, humanity: -8, sanity: -12, xp: 15 };
        },
      },
      {
        id: 'strike',
        label: 'ฟันมัน',
        emoji: '⚔️',
        style: 'danger',
        hint: 'พละ DC 15',
        resolve: ({ check, rand }) => {
          const r = check('str', 15);
          return r.success
            ? { text: `มันแตกเป็นชิ้นเนื้อที่ไม่มีรูปทรง ${r.tag}`, flesh: rand(20, 35), xp: 40 }
            : { text: `แผลเกิดขึ้นบนตัวคุณแทน ${r.tag}`, hp: -rand(10, 16), xp: 12 };
        },
      },
    ],
  },

  // ================= ORANGE — Beelzebub / Gluttony =================
  {
    id: 'o_maws',
    door: 'orange',
    title: '🟧 ปากเหวหิวโหย',
    description: 'พื้นเต็มไปด้วยปากและเหวลึก หนวดเนื้อโผล่ออกจากผนังพร้อมเสียงโหยหวน',
    weight: 10,
    choices: [
      {
        id: 'feed',
        label: 'โยนเนื้อให้มัน',
        emoji: '🍖',
        style: 'success',
        visible: (c) => itemCount(c, 'fetal_flesh') > 0 || itemCount(c, 'rotten_flesh') > 0,
        hint: 'ป้อนเนื้อ = ผ่านอย่างปลอดภัย และได้พร',
        resolve: ({ char }) => {
          const id = itemCount(char, 'rotten_flesh') > 0 ? 'rotten_flesh' : 'fetal_flesh';
          return { text: 'ปากนับร้อยแย่งกันกิน ทันใดนั้นคุณรู้สึกอิ่ม แผลเก่าปิดสนิท', items: { [id]: -1 }, hp: 12, xp: 14 };
        },
      },
      {
        id: 'jump',
        label: 'กระโดดข้ามเหว',
        emoji: '🦘',
        style: 'primary',
        hint: 'ว่องไว DC 13',
        resolve: ({ check, rand }) => {
          const r = check('agi', 13);
          return r.success
            ? { text: `คุณข้ามได้ แขนนับสิบคว้าลมข้างหลัง ${r.tag}`, xp: 14 }
            : { text: `แขนกอดรัดดึงขาคุณลงไปครึ่งตัวก่อนคุณจะดิ้นหลุด ${r.tag}`, hp: -rand(8, 13), xp: 6 };
        },
      },
    ],
  },
  {
    id: 'o_feast',
    door: 'orange',
    title: '🟧 โต๊ะเลี้ยงไม่สิ้นสุด',
    description: 'โต๊ะยาวสุดสายตาเต็มไปด้วยเนื้อทุกชนิด คนที่นั่งกินอยู่ไม่มีใครหยุดได้ แม้ท้องจะแตกแล้ว',
    weight: 7,
    choices: [
      {
        id: 'eat',
        label: 'กินสักคำ',
        emoji: '🍽️',
        style: 'danger',
        hint: 'สัมผัส DC 13 เพื่อหยุดกินได้',
        resolve: ({ check }) => {
          const r = check('int', 13);
          return r.success
            ? { text: `คำเดียวพอ คุณบังคับตัวเองให้ลุกได้ ${r.tag}`, hp: 15, stamina: 4, humanity: -3, xp: 12 }
            : { text: `คุณกินไม่หยุด... ผิวหนังเริ่มลอกเผยเนื้อแดง ${r.tag}`, hp: 20, humanity: -10, mutation: 'ผิวลอกเป็นหย่อม เห็นเนื้อแดงข้างใต้', xp: 8 };
        },
      },
      {
        id: 'steal',
        label: 'ขโมยของบนโต๊ะ',
        emoji: '🤏',
        style: 'primary',
        hint: 'ว่องไว DC 12',
        resolve: ({ check, rand }) => {
          const r = check('agi', 12);
          return r.success
            ? { text: `ไม่มีใครเงยหน้าจากจาน ${r.tag}`, items: { fresh_cut: 1 }, flesh: rand(8, 15), xp: 14 }
            : { text: `มีดหั่นเนื้อปักลงบนมือคุณ ${r.tag}`, hp: -rand(5, 8), xp: 5 };
        },
      },
    ],
  },
  {
    id: 'o_boss_maw',
    door: 'orange',
    boss: true,
    title: '🟧👹 กองกล้ามเนื้อหิวกระหาย',
    description: 'Fiend แห่ง Beelzebub — ปากเขี้ยวซ้อนกันหลายชั้นทั่วลำตัว เนื้อแดงหลุดลอก มันได้กลิ่นคุณแล้ว',
    weight: 1,
    choices: [
      {
        id: 'fight',
        label: 'สู้',
        emoji: '⚔️',
        style: 'danger',
        hint: 'พละ DC 16',
        resolve: ({ check, rand }) => {
          const r = check('str', 16);
          return r.success
            ? { text: `คุณแล่มันโดยไม่เหลือเศษให้เสียของ ${r.tag}`, flesh: rand(35, 55), items: { bone_saw: 1 }, xp: 50 }
            : { text: `มันกัดเนื้อคุณไปคำใหญ่ ${r.tag}`, hp: -rand(14, 20), xp: 15 };
        },
      },
      {
        id: 'offer',
        label: 'ป้อนเนื้อสด 20 ให้มัน',
        emoji: '🥩',
        style: 'primary',
        visible: (c) => c.flesh >= 20,
        resolve: () => ({ text: 'มันกลืนแล้วหลับไปอย่างพอใจ', flesh: -20, xp: 30 }),
      },
    ],
  },

  // ================= WHITE — Wendigo / Destitution =================
  {
    id: 'w_hunger_day',
    door: 'white',
    title: '🤍 วันที่ผ่านไปในความเงียบ',
    description: 'ไม่มีอาหาร ไม่มีน้ำ ไม่มีเสียง ความหิวกัดกินจากข้างใน วันแล้ววันเล่า',
    weight: 10,
    choices: [
      {
        id: 'endure',
        label: 'อดทน',
        emoji: '🧘',
        style: 'primary',
        hint: 'สัมผัส DC 12 — ความทุกข์คือสัจธรรม',
        resolve: ({ check }) => {
          const r = check('int', 12);
          return r.success
            ? { text: `ความหิวกลายเป็นความว่าง ${r.tag}`, hp: -4, stamina: -2, sanity: 4, humanity: 3, xp: 20 }
            : { text: `คุณกัดนิ้วตัวเองโดยไม่รู้ตัว ${r.tag}`, hp: -8, stamina: -2, sanity: -8, xp: 10 };
        },
      },
      {
        id: 'eat_supplies',
        label: 'กินเสบียงที่ซ่อนไว้',
        emoji: '🍜',
        style: 'secondary',
        visible: (c) => itemCount(c, 'instant_noodle') > 0 || itemCount(c, 'fetal_flesh') > 0,
        resolve: ({ char }) => {
          const id = itemCount(char, 'instant_noodle') > 0 ? 'instant_noodle' : 'fetal_flesh';
          return { text: 'คุณแอบกินในความมืด ห้องนี้รู้ว่าคุณโกง', items: { [id]: -1 }, stamina: 2, xp: 5 };
        },
      },
    ],
  },
  {
    id: 'w_ascetic',
    door: 'white',
    title: '🤍 นักพรตผอมแห้ง',
    description: 'นักพรตที่เหลือแต่หนังหุ้มกระดูกนั่งสมาธิ "เจ้ายังหิวอยู่... ดีแล้ว"',
    weight: 7,
    choices: [
      { id: 'learn', label: 'ขอคำสอน', emoji: '📿', style: 'primary', resolve: () => ({ text: 'เขาสอนให้คุณรักความหิว', sanity: 10, humanity: 4, stamina: -1, xp: 22 }) },
      {
        id: 'eat_him',
        label: 'กินเขา',
        emoji: '🦷',
        style: 'danger',
        hint: 'ความเป็นมนุษย์ลดหนักมาก',
        resolve: () => ({ text: 'เขาไม่ขัดขืน มีเพียงกระดูกกับหนัง แต่คุณก็ยังกิน', hp: 10, humanity: -14, xp: 10 }),
      },
    ],
  },
  {
    id: 'w_boss_famished',
    door: 'white',
    boss: true,
    title: '🤍👹 วันที่เก้า',
    description: 'ความหิวรวมตัวเป็นรูปร่าง — กวางผอมสูงจรดเพดาน เขากิ่งไม้ ซี่โครงโผล่ มันไม่โจมตี มันแค่รอให้คุณยอมแพ้',
    weight: 1,
    choices: [
      {
        id: 'endure',
        label: 'ไม่ยอมแพ้',
        emoji: '🧘',
        style: 'primary',
        hint: 'สัมผัส DC 15 — รางวัลสูงสุดในดันเจียน',
        resolve: ({ check, rand }) => {
          const r = check('int', 15);
          return r.success
            ? { text: `ไม่มีสิ่งใดในโลกนี้จะทำลายคุณได้อีกแล้ว ${r.tag}`, sanity: 20, humanity: 8, flesh: rand(20, 30), xp: 60 }
            : { text: `คุณคุกเข่าลง ความหิวกลืนเศษเสี้ยวตัวตนของคุณ ${r.tag}`, hp: -14, sanity: -15, humanity: -6, xp: 15 };
        },
      },
    ],
  },

  // ================= BLUE — Belphegor / Despair =================
  {
    id: 'b_memories',
    door: 'blue',
    title: '🟦 ห้องแห่งความทรงจำ',
    description: 'ทุกผนังฉายความทรงจำที่เจ็บปวดที่สุดของคุณ ซ้ำแล้วซ้ำเล่า',
    weight: 10,
    choices: [
      {
        id: 'watch',
        label: 'ยอมรับมัน',
        emoji: '😢',
        style: 'primary',
        hint: 'สัมผัส DC 14 — ความทรมานคือการชำระล้าง',
        resolve: ({ check }) => {
          const r = check('int', 14);
          return r.success
            ? { text: `คุณร้องไห้จนไม่เหลืออะไร แล้วลุกขึ้นใหม่ ${r.tag}`, sanity: -6, humanity: 5, xp: 25 }
            : { text: `ความโศกกดทับจนคุณขยับไม่ได้ ${r.tag}`, sanity: -16, xp: 8 };
        },
      },
      {
        id: 'smash',
        label: 'ทุบผนังทิ้ง',
        emoji: '💥',
        style: 'danger',
        hint: 'พละ DC 13',
        resolve: ({ check, rand }) => {
          const r = check('str', 13);
          return r.success
            ? { text: `ภาพแตกกระจาย ข้างหลังมีของซ่อนอยู่ ${r.tag}`, flesh: rand(10, 20), xp: 18 }
            : { text: `มือของคุณจมเข้าไปในผนัง และติดอยู่ตรงนั้น ${r.tag}`, hp: -rand(8, 12), mutation: 'นิ้วสองนิ้วหลอมรวมเป็นเนื้อเดียวกับผนัง (หายไปแล้ว)', xp: 8 };
        },
      },
    ],
  },
  {
    id: 'b_merged',
    door: 'blue',
    title: '🟦 ผู้ที่ไม่ได้กลับออกไป',
    description: 'ร่างคนหลายสิบหลอมรวมกับโครงสร้างดันเจียน ครึ่งตัวในผนัง ครึ่งตัวยังขยับ "ช่วย... ไม่สิ ฆ่าเรา"',
    weight: 7,
    choices: [
      { id: 'mercy', label: 'ปลดปล่อยพวกเขา', emoji: '🗡️', style: 'primary', resolve: () => ({ text: 'ทีละคน จนเงียบสนิท', humanity: 4, sanity: -8, xp: 18 }) },
      { id: 'loot', label: 'ค้นของจากร่างพวกเขา', emoji: '🖐️', style: 'danger', resolve: ({ rand }) => ({ text: 'พวกเขามองคุณค้นกระเป๋า', flesh: rand(15, 25), items: { family_photo: 1 }, humanity: -5, xp: 12 }) },
    ],
  },
  {
    id: 'b_boss_martyr',
    door: 'blue',
    boss: true,
    title: '🟦👹 ผู้พลีชีพตรึงหนาม',
    description: 'Fiend แห่ง Belphegor — ร่างถูกตรึงด้วยหมุดเหล็กขึ้นสนิมนับร้อย แขนขาที่ขาดถูกเย็บต่อกลับผิดที่',
    weight: 1,
    choices: [
      {
        id: 'fight',
        label: 'สู้',
        emoji: '⚔️',
        style: 'danger',
        hint: 'พละ DC 16',
        resolve: ({ check, rand }) => {
          const r = check('str', 16);
          return r.success
            ? { text: `คุณถอนหมุดตัวสุดท้าย มันขอบคุณก่อนสลาย ${r.tag}`, flesh: rand(35, 50), items: { sigil: 1, old_shotgun: 1 }, xp: 55 }
            : { text: `หมุดหนึ่งตัวย้ายมาปักบนตัวคุณ ${r.tag}`, hp: -rand(14, 20), mutation: 'หมุดเหล็กขึ้นสนิมฝังอยู่ในไหปลาร้า', xp: 15 };
        },
      },
    ],
  },

  // ================= PURPLE — Thanatos / Decay =================
  {
    id: 'p_rot_hall',
    door: 'purple',
    title: '🟪 ห้องโถงเน่าสลาย',
    description: 'Miasma ข้นจนมองไม่เห็นปลายทาง เนื้อทุกชิ้นในห้องเน่าเป็นสีม่วง สปอร์ลอยว่อน',
    weight: 10,
    choices: [
      {
        id: 'push',
        label: 'ฝ่าไป',
        emoji: '😷',
        style: 'primary',
        hint: 'Miasma หนัก — สาวก Thanatos ไม่เป็นไร',
        resolve: ({ rand }) => ({ text: 'คุณกลั้นหายใจฝ่าไป', miasma: rand(12, 18), items: { rotten_flesh: 2 }, xp: 15 }),
      },
      {
        id: 'commune',
        label: 'สื่อสารกับวิญญาณที่กำลังตาย',
        emoji: '💀',
        style: 'secondary',
        visible: (c) => c.icon === 'thanatos',
        hint: 'Necro-Communion',
        resolve: ({ rand }) => ({ text: 'ศพบอกคุณว่าของมีค่าถูกฝังไว้ตรงไหน', flesh: rand(20, 30), items: { alchemy_salve: 1 }, xp: 22 }),
      },
    ],
  },
  {
    id: 'p_funeral',
    door: 'purple',
    title: '🟪 พิธีศพที่ไม่มีวันจบ',
    description: 'นักบวชงานศพหน้ากากนกกำลังสวดให้ศพที่ลุกขึ้นมาแล้วล้มลงซ้ำ ๆ',
    weight: 7,
    choices: [
      {
        id: 'join',
        label: 'ร่วมสวด',
        emoji: '🕯️',
        style: 'primary',
        resolve: ({ rand }) => ({ text: 'นักบวชมอบยาให้คุณเป็นการตอบแทน', items: { alchemy_salve: 1 }, miasma: rand(4, 8), xp: 14 }),
      },
      {
        id: 'rob',
        label: 'ขโมยของจากโลงศพ',
        emoji: '⚰️',
        style: 'danger',
        hint: 'ว่องไว DC 13',
        resolve: ({ check, rand }) => {
          const r = check('agi', 13);
          return r.success
            ? { text: `ไม่มีใครหันมา ${r.tag}`, flesh: rand(15, 25), items: { pocket_watch: 1 }, xp: 15 }
            : { text: `ศพลุกขึ้นมาจับข้อมือคุณ ลมหายใจมันคือ Miasma ล้วน ๆ ${r.tag}`, miasma: rand(14, 20), hp: -6, xp: 6 };
        },
      },
    ],
  },
  {
    id: 'p_boss_husk',
    door: 'purple',
    boss: true,
    title: '🟪👹 ซากแห้งผู้พ่นสปอร์',
    description: 'Fiend แห่ง Thanatos — โครงกระดูกแห้งกรังปกคลุมด้วยแผลเน่า ทุกลมหายใจคือคลื่น Miasma',
    weight: 1,
    choices: [
      {
        id: 'fight',
        label: 'สู้',
        emoji: '⚔️',
        style: 'danger',
        hint: 'พละ DC 16 + Miasma',
        resolve: ({ check, rand }) => {
          const r = check('str', 16);
          return r.success
            ? { text: `กระดูกแตกเป็นผง เหลือไว้เพียงยาเล่นแร่ ${r.tag}`, flesh: rand(30, 45), items: { alchemy_salve: 2, sigil: 1 }, miasma: 8, xp: 55 }
            : { text: `มันหายใจรดหน้าคุณ ${r.tag}`, hp: -rand(10, 15), miasma: rand(18, 25), xp: 15 };
        },
      },
      {
        id: 'flee',
        label: 'วิ่งหาประตู',
        emoji: '🏃',
        style: 'primary',
        hint: 'ว่องไว DC 14',
        resolve: ({ check, rand }) => {
          const r = check('agi', 14);
          return r.success
            ? { text: `คุณถึงประตูก่อนคลื่น Miasma ${r.tag}`, xp: 30 }
            : { text: `คลื่น Miasma กลืนคุณ ${r.tag}`, miasma: rand(20, 28), xp: 10 };
        },
      },
    ],
  },
];
