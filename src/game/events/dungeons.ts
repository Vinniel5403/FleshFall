import { itemCount } from '../character.js';
import type { GameEventDef } from '../types.js';

/** Food a traveller can give up at the white door's empty table (first one held is taken). */
const WHITE_RATIONS = ['instant_noodle', 'canned_beans', 'spice_jerky', 'grilled_meat'];

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
        hint: 'ใช้ว่องไว · ต้องทอยรวมได้ 11 ขึ้นไป',
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
        hint: 'ใช้พละกำลัง · ต้องทอยรวมได้ 12 ขึ้นไป — อาจได้เนื้อเกรดพรีเมียม',
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
    id: 'g_cord_garden',
    door: 'green',
    title: '🟩 สวนสายรก',
    description: 'สายรกนับพันห้อยลงมาจากเพดานเหมือนเถาวัลย์ ปลายแต่ละเส้นมีบางอย่างกำลังโต บางเส้นขยับตามคุณ',
    weight: 8,
    choices: [
      {
        id: 'cut_through',
        label: 'ฟันเปิดทาง',
        emoji: '🔪',
        style: 'danger',
        hint: 'ใช้พละกำลัง · ต้องทอยรวมได้ 12 ขึ้นไป',
        resolve: ({ check, rand }) => {
          const r = check('str', 12);
          return r.success
            ? { text: `สายรกขาดร่วงเป็นกอง ของที่มันเลี้ยงไว้ตกลงมาแทบเท้าคุณ ${r.tag}`, items: { fetal_flesh: rand(1, 2), bone: 1 }, xp: 14 }
            : { text: `สายรกเส้นหนึ่งรัดคอคุณแล้วเริ่มสูบเลือด ${r.tag}`, hp: -rand(5, 9), sanity: -4, xp: 7 };
        },
      },
      {
        id: 'weave',
        label: 'ลัดเลาะระหว่างสาย',
        emoji: '🤸',
        style: 'primary',
        hint: 'ใช้ว่องไว · ต้องทอยรวมได้ 12 ขึ้นไป',
        resolve: ({ check, rand }) => {
          const r = check('agi', 12);
          return r.success
            ? { text: `คุณผ่านไปโดยไม่แตะสักเส้น ${r.tag}`, xp: 13 }
            : { text: `ปลายสายเส้นหนึ่งแตะต้นคอคุณ มันอุ่น และมันพยายามเชื่อมต่อ ${r.tag}`, hp: -rand(4, 6), mutation: 'รอยสะดือเล็ก ๆ ที่ต้นคอ', xp: 6 };
        },
      },
    ],
  },
  {
    id: 'g_nursery',
    door: 'green',
    title: '🟩 ห้องเด็กอ่อน',
    description: 'เปลที่สานจากซี่โครงเรียงเป็นแถว ทุกใบไกวเองช้า ๆ มีเสียงร้องไห้ดังมาจากใบเดียว',
    weight: 7,
    choices: [
      {
        id: 'soothe',
        label: 'ปลอบสิ่งที่ร้อง',
        emoji: '🤱',
        style: 'primary',
        hint: 'ใช้สัมผัส · ต้องทอยรวมได้ 12 ขึ้นไป',
        resolve: ({ check }) => {
          const r = check('int', 12);
          return r.success
            ? { text: `มันเงียบลงในอ้อมแขนคุณ ชั่วขณะหนึ่งคุณจำได้ว่าการเป็นมนุษย์รู้สึกอย่างไร ${r.tag}`, humanity: 3, sanity: 4, xp: 16 }
            : { text: `สิ่งที่อยู่ในเปลไม่ใช่เด็ก และมันไม่ได้ร้องไห้ — มันกำลังเลียนเสียง ${r.tag}`, sanity: -10, xp: 6 };
        },
      },
      {
        id: 'search',
        label: 'ค้นเปลใบอื่น',
        emoji: '🖐️',
        style: 'danger',
        hint: 'ใช้ว่องไว · ต้องทอยรวมได้ 13 ขึ้นไป',
        resolve: ({ check, rand }) => {
          const r = check('agi', 13);
          return r.success
            ? { text: `ใต้ผ้าห่มมีของที่แม่ของใครบางคนทิ้งไว้ ${r.tag}`, items: { family_photo: 1 }, flesh: rand(8, 15), xp: 14 }
            : { text: `มือเล็ก ๆ หลายสิบข้างคว้าแขนคุณไว้พร้อมกัน ${r.tag}`, hp: -rand(5, 8), xp: 5 };
        },
      },
      { id: 'tiptoe', label: 'ย่องผ่านเงียบ ๆ', emoji: '🤫', style: 'secondary', resolve: () => ({ text: 'เสียงร้องตามหลังคุณไปจนสุดห้อง', sanity: -2, xp: 4 }) },
    ],
  },
  {
    id: 'g_milk_pool',
    door: 'green',
    title: '🟩 บ่อน้ำนมอุ่น',
    description: 'บ่อของเหลวสีขาวขุ่นอุ่นเท่าอุณหภูมิร่างกาย ผนังรอบบ่อหยดลงมาไม่ขาดสาย กลิ่นของมันเหมือนบ้าน',
    weight: 7,
    choices: [
      {
        id: 'drink',
        label: 'ดื่ม',
        emoji: '🥛',
        style: 'danger',
        hint: 'ฟื้นเนื้อกาย — แต่มันไม่ใช่นมของมนุษย์',
        resolve: () => ({ text: 'แผลของคุณปิดสนิท และคุณเผลอเรียกผนังว่าแม่', hp: 12, humanity: -3, xp: 8 }),
      },
      {
        id: 'wade',
        label: 'ลุยข้ามบ่อ',
        emoji: '🚶',
        style: 'primary',
        hint: 'ใช้ว่องไว · ต้องทอยรวมได้ 11 ขึ้นไป',
        resolve: ({ check, rand }) => {
          const r = check('agi', 11);
          return r.success
            ? { text: `คุณถึงอีกฝั่งก่อนที่ผิวบ่อจะปิดเหนือหัว ${r.tag}`, xp: 12 }
            : { text: `บางอย่างใต้ผิวบ่อกอดขาคุณไว้เหมือนเด็กไม่ยอมให้ไป ${r.tag}`, hp: -rand(4, 8), sanity: -5, xp: 6 };
        },
      },
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
        hint: 'ใช้พละกำลัง · ต้องทอยรวมได้ 15 ขึ้นไป',
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
        hint: 'ใช้สัมผัส · ต้องทอยรวมได้ 14 ขึ้นไป',
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
        hint: 'ใช้ว่องไว · ต้องทอยรวมได้ 14 ขึ้นไป (ไม่มีแสง)',
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
        hint: 'ใช้สัมผัส · ต้องทอยรวมได้ 13 ขึ้นไป',
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
    id: 'y_candle_altar',
    door: 'yellow',
    title: '🟨 แท่นเทียนที่เพิ่งดับ',
    description: 'ตอเทียนนับร้อยล้อมแท่นขี้เถ้า ไส้เทียนทุกเล่มยังอุ่น เหมือนมีคนเป่าดับทั้งหมดหนึ่งวินาทีก่อนคุณเข้ามา',
    weight: 8,
    choices: [
      {
        id: 'light',
        label: 'จุดเทียน',
        emoji: '🔥',
        style: 'success',
        visible: (c) => itemCount(c, 'lighter') > 0,
        hint: 'มีไฟแช็ก — บางครั้งมีของถวายเหลืออยู่บนแท่น',
        resolve: ({ chance }) =>
          chance(0.35)
            ? { text: 'แสงเทียนนับร้อยไล่ความมืดออกไปชั่วครู่ บนแท่นมีตราที่ใครบางคนถวายไว้แล้วไม่ได้กลับมาเอา', items: { sigil: 1 }, sanity: 6, xp: 16 }
            : { text: 'แสงเทียนนับร้อยไล่ความมืดออกไปชั่วครู่ แท่นว่างเปล่า แต่คุณหายใจได้เต็มปอดเป็นครั้งแรก', sanity: 8, xp: 14 },
      },
      {
        id: 'grope',
        label: 'คลำหาของบนแท่น',
        emoji: '🖐️',
        style: 'primary',
        hint: 'ใช้สัมผัส · ต้องทอยรวมได้ 13 ขึ้นไป (ไม่มีแสง)',
        resolve: ({ check, rand }) => {
          const r = check('int', 13);
          return r.success
            ? { text: `นิ้วคุณเจอถุงผ้าใบเล็กใต้กองขี้เถ้า ${r.tag}`, flesh: rand(10, 18), xp: 14 }
            : { text: `มือคุณแตะโดนมืออีกข้าง ที่กำลังคลำหาอยู่เหมือนกัน ${r.tag}`, sanity: -11, xp: 6 };
        },
      },
      { id: 'leave', label: 'อย่าแตะอะไรทั้งนั้น', emoji: '🚶', style: 'secondary', resolve: () => ({ text: 'ข้างหลังคุณ มีเสียงไม้ขีดถูกจุด', sanity: -2, xp: 3 }) },
    ],
  },
  {
    id: 'y_breathing',
    door: 'yellow',
    title: '🟨 ลมหายใจข้างหู',
    description: 'ทางเดินแคบจนต้องตะแคงตัว มีลมหายใจอุ่น ๆ รดต้นคอคุณ ทั้งที่ข้างหลังคุณคือผนัง',
    weight: 7,
    choices: [
      {
        id: 'turn',
        label: 'หันไปมอง',
        emoji: '👁️',
        style: 'danger',
        hint: 'ใช้สัมผัส · ต้องทอยรวมได้ 13 ขึ้นไป',
        resolve: ({ check }) => {
          const r = check('int', 13);
          return r.success
            ? { text: `ไม่มีอะไรอยู่ตรงนั้น — และการรู้อย่างนั้นทำให้ความกลัวคลายมือออก ${r.tag}`, sanity: 6, xp: 18 }
            : { text: `มีบางอย่างอยู่ตรงนั้น และมันกำลังยิ้ม ${r.tag}`, sanity: -14, xp: 6 };
        },
      },
      {
        id: 'squeeze',
        label: 'เบียดตัวไปให้เร็วที่สุด',
        emoji: '🏃',
        style: 'primary',
        hint: 'ใช้ว่องไว · ต้องทอยรวมได้ 12 ขึ้นไป',
        resolve: ({ check, rand }) => {
          const r = check('agi', 12);
          return r.success
            ? { text: `คุณหลุดออกมาอีกฝั่ง ลมหายใจนั้นหยุดตามแค่ปากทาง ${r.tag}`, stamina: -1, xp: 13 }
            : { text: `ผนังขูดไหล่คุณจนถลอก ลมหายใจนั้นเร่งจังหวะตามคุณ ${r.tag}`, hp: -rand(4, 7), sanity: -6, xp: 6 };
        },
      },
    ],
  },
  {
    id: 'y_stair_down',
    door: 'yellow',
    title: '🟨 บันไดที่ไม่มีขั้นสุดท้าย',
    description: 'บันไดวนลงไปในความมืด คุณนับขั้นได้เกินร้อยแล้ว เศษหินที่เตะตกลงไปยังไม่มีเสียงกระทบพื้น',
    weight: 7,
    choices: [
      {
        id: 'light',
        label: 'ส่องไฟแช็กหาทาง',
        emoji: '🔥',
        style: 'success',
        visible: (c) => itemCount(c, 'lighter') > 0,
        hint: 'มีไฟแช็ก — ปลอดภัย',
        resolve: ({ rand }) => ({ text: 'เปลวไฟเผยให้เห็นประตูบานเล็กบนผนัง ที่คุณเดินผ่านมาแล้วสามรอบ', flesh: rand(6, 12), xp: 15 }),
      },
      {
        id: 'count',
        label: 'นับขั้นต่อไปอย่างมีสติ',
        emoji: '🔢',
        style: 'primary',
        hint: 'ใช้สัมผัส · ต้องทอยรวมได้ 12 ขึ้นไป',
        resolve: ({ check }) => {
          const r = check('int', 12);
          return r.success
            ? { text: `ขั้นที่สองร้อยสิบเจ็ดคือพื้น คุณไม่เคยดีใจกับพื้นขนาดนี้ ${r.tag}`, sanity: -2, xp: 16 }
            : { text: `คุณลืมไปแล้วว่านับถึงเท่าไร แต่มีเสียงหนึ่งนับต่อจากคุณ ${r.tag}`, stamina: -2, sanity: -10, xp: 6 };
        },
      },
      {
        id: 'jump',
        label: 'กระโดดลงไป',
        emoji: '🕳️',
        style: 'danger',
        hint: 'ใช้ว่องไว · ต้องทอยรวมได้ 14 ขึ้นไป — เสี่ยง',
        resolve: ({ check, rand }) => {
          const r = check('agi', 14);
          return r.success
            ? { text: `พื้นอยู่ใกล้กว่าที่ความมืดหลอกไว้ ข้างเท้าคุณมีของของคนที่กระโดดก่อนหน้า ${r.tag}`, items: { pocket_watch: 1 }, xp: 16 }
            : { text: `คุณตกลงไปนานพอจะมีเวลาเสียใจ ${r.tag}`, hp: -rand(7, 12), xp: 6 };
        },
      },
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
        hint: 'ใช้พละกำลัง · ต้องทอยรวมได้ 15 ขึ้นไป',
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
        hint: 'ใช้ว่องไว · ต้องทอยรวมได้ 14 ขึ้นไป',
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
        hint: 'ใช้สัมผัส · ต้องทอยรวมได้ 14 ขึ้นไป — ระวังลืมเวลา',
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
        hint: 'ใช้สัมผัส · ต้องทอยรวมได้ 13 ขึ้นไป',
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
    id: 'gr_apartment',
    door: 'gray',
    title: '⬜ ห้องของคุณเอง',
    description: 'ประตูเปิดออกสู่ห้องพักของคุณในโลกจริง ทุกอย่างอยู่ที่เดิม แม้แต่แก้วกาแฟที่ยังอุ่น มีเพียงนาฬิกาที่เดินถอยหลัง',
    weight: 8,
    choices: [
      {
        id: 'sleep',
        label: 'ล้มตัวลงบนเตียงตัวเอง',
        emoji: '🛏️',
        style: 'danger',
        hint: 'ใช้สัมผัส · ต้องทอยรวมได้ 14 ขึ้นไป — ระวังไม่ได้ตื่น',
        resolve: ({ check }) => {
          const r = check('int', 14);
          return r.success
            ? { text: `คุณหลับไปสิบนาทีที่ดีที่สุดในรอบหลายเดือน แล้วบังคับตัวเองให้ลุก ${r.tag}`, hp: 10, sanity: 10, xp: 12 }
            : { text: `คุณตื่นขึ้นในห้องเดิม แต่ผ้าปูที่นอนมีฝุ่นจับหนาเป็นนิ้ว ${r.tag}`, stamina: -3, humanity: -4, xp: 4 };
        },
      },
      {
        id: 'take',
        label: 'หยิบของติดมือไป',
        emoji: '🖼️',
        style: 'primary',
        resolve: () => ({ text: 'ของในมือคุณดูเก่าลงสิบปีทันทีที่พ้นประตู', items: { family_photo: 1 }, sanity: -6, xp: 10 }),
      },
      { id: 'close', label: 'ปิดประตู มันไม่ใช่ของจริง', emoji: '🚪', style: 'secondary', resolve: () => ({ text: 'คุณปิดประตูทั้งที่มือสั่น', humanity: 2, xp: 6 }) },
    ],
  },
  {
    id: 'gr_office',
    door: 'gray',
    title: '⬜ ออฟฟิศที่ไม่มีวันเลิกงาน',
    description: 'ออฟฟิศเปิดโล่ง ไฟนีออนกะพริบ นาฬิกาทุกเรือนค้างที่ 16:59 พนักงานไร้หน้าพิมพ์งานไม่หยุด มีโต๊ะว่างตัวหนึ่งติดป้ายชื่อคุณ',
    weight: 7,
    choices: [
      {
        id: 'work',
        label: 'นั่งทำงาน',
        emoji: '⌨️',
        style: 'danger',
        hint: 'ใช้สัมผัส · ต้องทอยรวมได้ 13 ขึ้นไป — ได้เงินเดือน ถ้าลุกออกมาได้',
        resolve: ({ check, rand }) => {
          const r = check('int', 13);
          return r.success
            ? { text: `คุณส่งงานแล้วลุกออกมาได้ทัน พร้อมซองเงินเดือน ${r.tag}`, stamina: -2, flesh: rand(15, 25), xp: 14 }
            : { text: `นาฬิกายังคง 16:59 คุณพิมพ์มากี่ปีแล้ว? ${r.tag}`, stamina: -4, sanity: -8, humanity: -3, xp: 5 };
        },
      },
      {
        id: 'drawers',
        label: 'รื้อลิ้นชัก',
        emoji: '🗄️',
        style: 'primary',
        hint: 'ใช้ว่องไว · ต้องทอยรวมได้ 12 ขึ้นไป',
        resolve: ({ check, rand }) => {
          const r = check('agi', 12);
          return r.success
            ? { text: `ไม่มีใครละสายตาจากจอ ${r.tag}`, items: { lighter: 1 }, flesh: rand(5, 10), xp: 13 }
            : { text: `เสียงพิมพ์หยุดลงพร้อมกันทั้งชั้น ทุกคนหันมา ${r.tag}`, hp: -rand(3, 6), sanity: -9, xp: 5 };
        },
      },
      { id: 'pass', label: 'เดินผ่านไปเฉย ๆ', emoji: '🚶', style: 'secondary', resolve: () => ({ text: 'ป้ายชื่อบนโต๊ะว่างเปลี่ยนเป็นชื่อคนอื่น', xp: 4 }) },
    ],
  },
  {
    id: 'gr_vending',
    door: 'gray',
    title: '⬜ ตู้กดน้ำกลางทางเดิน',
    description: 'ตู้กดอัตโนมัติส่องแสงอยู่กลางทางเดินว่างเปล่า สินค้าข้างในไม่มีฉลาก ช่องหยอดเหรียญกว้างพอจะสอดนิ้วเข้าไป',
    weight: 7,
    choices: [
      {
        id: 'pay',
        label: 'หยอดเนื้อสด 10',
        emoji: '🪙',
        style: 'success',
        visible: (c) => c.flesh >= 10,
        hint: 'ได้ของกิน 1 ชิ้น (สุ่ม)',
        resolve: ({ rand }) => {
          const id = ['canned_beans', 'absinthe', 'instant_noodle'][rand(0, 2)]!;
          return { text: 'ตู้กลืนเนื้อลงไปพร้อมเสียงเคี้ยว แล้วคายของออกมาหนึ่งชิ้น', flesh: -10, items: { [id]: 1 }, xp: 10 };
        },
      },
      {
        id: 'shake',
        label: 'เขย่าตู้',
        emoji: '💢',
        style: 'danger',
        hint: 'ใช้พละกำลัง · ต้องทอยรวมได้ 12 ขึ้นไป',
        resolve: ({ check, rand }) => {
          const r = check('str', 12);
          return r.success
            ? { text: `ของร่วงลงมาสองชิ้น ตู้ส่งเสียงครางอย่างไม่พอใจ ${r.tag}`, items: { canned_beans: 2 }, xp: 13 }
            : { text: `ตู้ล้มทับคุณ ข้างในมันอุ่นและเต้นเป็นจังหวะ ${r.tag}`, hp: -rand(6, 10), xp: 5 };
        },
      },
      { id: 'ignore', label: 'ไม่ไว้ใจมัน', emoji: '🙅', style: 'secondary', resolve: () => ({ text: 'แสงตู้ดับลงทันทีที่คุณหันหลัง', xp: 3 }) },
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
        hint: 'ใช้สัมผัส · ต้องทอยรวมได้ 15 ขึ้นไป',
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
        hint: 'ใช้พละกำลัง · ต้องทอยรวมได้ 15 ขึ้นไป',
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
        hint: 'ใช้ว่องไว · ต้องทอยรวมได้ 13 ขึ้นไป',
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
        hint: 'ใช้สัมผัส · ต้องทอยรวมได้ 13 ขึ้นไป เพื่อหยุดกินได้',
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
        hint: 'ใช้ว่องไว · ต้องทอยรวมได้ 12 ขึ้นไป',
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
    id: 'o_larder',
    door: 'orange',
    title: '🟧 ห้องเก็บเสบียงมีชีวิต',
    description: 'เนื้อชิ้นมหึมาแขวนเป็นแถวจากตะขอ ทุกชิ้นยังหายใจ บางชิ้นมีปากและกำลังแทะชิ้นข้าง ๆ',
    weight: 8,
    choices: [
      {
        id: 'carve',
        label: 'แล่เนื้อจากตะขอ',
        emoji: '🔪',
        style: 'danger',
        hint: 'ใช้พละกำลัง · ต้องทอยรวมได้ 12 ขึ้นไป',
        resolve: ({ check, rand }) => {
          const r = check('str', 12);
          return r.success
            ? { text: `คุณแล่ได้ก่อนที่มันจะหันมา ${r.tag}`, items: { raw_meat: rand(2, 4) }, flesh: rand(6, 12), xp: 15 }
            : { text: `ชิ้นเนื้อหันมากัดแขนคุณก่อน ${r.tag}`, hp: -rand(6, 10), xp: 6 };
        },
      },
      {
        id: 'duck',
        label: 'ลอดใต้ตะขอ',
        emoji: '🤸',
        style: 'primary',
        hint: 'ใช้ว่องไว · ต้องทอยรวมได้ 12 ขึ้นไป',
        resolve: ({ check, rand }) => {
          const r = check('agi', 12);
          return r.success
            ? { text: `น้ำลายหยดใส่หลังคุณ แต่ไม่มีปากไหนงับทัน ${r.tag}`, xp: 13 }
            : { text: `ตะขอเกี่ยวไหล่คุณไว้ ชั่วครู่หนึ่งคุณเป็นเสบียงชิ้นหนึ่งในแถว ${r.tag}`, hp: -rand(4, 8), sanity: -3, xp: 6 };
        },
      },
    ],
  },
  {
    id: 'o_tongue_bridge',
    door: 'orange',
    title: '🟧 สะพานลิ้น',
    description: 'ลิ้นยาวสิบเมตรทอดข้ามเหวน้ำย่อย มันเปียก อุ่น และกระตุกทุกครั้งที่ได้กลิ่นเนื้อ',
    weight: 7,
    choices: [
      {
        id: 'pay',
        label: 'วางเนื้อสด 15 ไว้ปลายลิ้น',
        emoji: '🥩',
        style: 'success',
        visible: (c) => c.flesh >= 15,
        hint: 'ข้ามได้อย่างปลอดภัย',
        resolve: () => ({ text: 'ลิ้นม้วนเอาเนื้อไป แล้วนิ่งสนิทจนคุณข้ามเสร็จ', flesh: -15, xp: 14 }),
      },
      {
        id: 'run',
        label: 'วิ่งข้าม',
        emoji: '🏃',
        style: 'primary',
        hint: 'ใช้ว่องไว · ต้องทอยรวมได้ 13 ขึ้นไป',
        resolve: ({ check, rand }) => {
          const r = check('agi', 13);
          return r.success
            ? { text: `คุณถึงอีกฝั่งก่อนที่มันจะรู้ตัวว่ามีอะไรเหยียบ ${r.tag}`, xp: 15 }
            : { text: `ลิ้นม้วนรัดคุณแล้วชิม ก่อนจะคายออกเพราะยังไม่อ้วนพอ ${r.tag}`, hp: -rand(7, 12), humanity: -2, xp: 6 };
        },
      },
    ],
  },
  {
    id: 'o_stomach',
    door: 'orange',
    title: '🟧 ห้องกระเพาะ',
    description: 'พื้นนุ่มหยุ่นเท้า ผนังหลั่งน้ำย่อยช้า ๆ ข้าวของของคนที่มาก่อนลอยอยู่ครึ่งละลาย',
    weight: 7,
    choices: [
      {
        id: 'fish',
        label: 'ช้อนของในน้ำย่อย',
        emoji: '🫳',
        style: 'danger',
        hint: 'ใช้ว่องไว · ต้องทอยรวมได้ 13 ขึ้นไป',
        resolve: ({ check, rand }) => {
          const r = check('agi', 13);
          return r.success
            ? { text: `คุณคว้าถุงเนื้อของใครบางคนขึ้นมาได้ก่อนมันละลายหมด ${r.tag}`, flesh: rand(12, 22), items: { bone: rand(1, 2) }, xp: 15 }
            : { text: `น้ำย่อยกัดมือคุณจนเห็นขาว ${r.tag}`, hp: -rand(6, 10), xp: 6 };
        },
      },
      {
        id: 'force',
        label: 'แหวกผนังออกไปก่อนมันบีบ',
        emoji: '💪',
        style: 'primary',
        hint: 'ใช้พละกำลัง · ต้องทอยรวมได้ 12 ขึ้นไป',
        resolve: ({ check, rand }) => {
          const r = check('str', 12);
          return r.success
            ? { text: `กล้ามเนื้อหูรูดยอมคลายให้คุณลอดออกไป ${r.tag}`, xp: 13 }
            : { text: `ห้องบีบตัวหนึ่งครั้งก่อนคุณจะหลุดออกมา ${r.tag}`, hp: -rand(5, 8), stamina: -1, xp: 6 };
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
        hint: 'ใช้พละกำลัง · ต้องทอยรวมได้ 16 ขึ้นไป',
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
        hint: 'ใช้สัมผัส · ต้องทอยรวมได้ 12 ขึ้นไป — ความทรมานคือสัจธรรม',
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
    id: 'w_frost_mirror',
    door: 'white',
    title: '🤍 เงาในน้ำแข็ง',
    description: 'ผนังน้ำแข็งใสสะท้อนเงาของคุณ — ผอมกว่า ซีดกว่า และกำลังเคี้ยวอะไรบางอย่าง',
    weight: 8,
    choices: [
      {
        id: 'stare',
        label: 'จ้องมันกลับ',
        emoji: '👁️',
        style: 'primary',
        hint: 'ใช้สัมผัส · ต้องทอยรวมได้ 13 ขึ้นไป',
        resolve: ({ check }) => {
          const r = check('int', 13);
          return r.success
            ? { text: `เงาหยุดเคี้ยวแล้วก้มหน้า คุณยังเป็นคุณ ${r.tag}`, humanity: 4, sanity: 3, xp: 20 }
            : { text: `คุณเผลอเคี้ยวตามมัน ในปากมีรสเลือด ${r.tag}`, humanity: -5, sanity: -8, xp: 8 };
        },
      },
      {
        id: 'smash',
        label: 'ทุบน้ำแข็ง',
        emoji: '🧊',
        style: 'danger',
        hint: 'ใช้พละกำลัง · ต้องทอยรวมได้ 12 ขึ้นไป',
        resolve: ({ check, rand }) => {
          const r = check('str', 12);
          return r.success
            ? { text: `หลังน้ำแข็งมีศพนักเดินทางกับเป้ที่ยังไม่ถูกเปิด ${r.tag}`, items: { bandage: 1 }, flesh: rand(8, 15), xp: 15 }
            : { text: `น้ำแข็งแตกเป็นคมมีดใส่หน้าคุณ เงายังอยู่ที่เดิมในทุกเศษ ${r.tag}`, hp: -rand(5, 9), xp: 6 };
        },
      },
    ],
  },
  {
    id: 'w_snow_tracks',
    door: 'white',
    title: '🤍 รอยเท้าในหิมะ',
    description: 'รอยเท้าเปล่าคู่หนึ่งนำหน้าคุณไปในหิมะ ทุกสิบก้าวรอยจะยาวขึ้น และนิ้วจะน้อยลง',
    weight: 7,
    choices: [
      {
        id: 'follow',
        label: 'ตามรอยไป',
        emoji: '👣',
        style: 'primary',
        hint: 'ใช้สัมผัส · ต้องทอยรวมได้ 12 ขึ้นไป',
        resolve: ({ check }) => {
          const r = check('int', 12);
          return r.success
            ? { text: `รอยสิ้นสุดที่ซากกองไฟเก่า ใครบางคนทิ้งของไว้ให้คนที่มาทีหลัง ${r.tag}`, items: { whale_blubber: 1 }, xp: 16 }
            : { text: `รอยเท้าวนกลับมาอยู่ข้างหลังคุณ ${r.tag}`, stamina: -1, sanity: -10, xp: 6 };
        },
      },
      {
        id: 'own_path',
        label: 'ฝ่าหิมะไปทางของตัวเอง',
        emoji: '🌨️',
        style: 'secondary',
        hint: 'ใช้พละกำลัง · ต้องทอยรวมได้ 12 ขึ้นไป',
        resolve: ({ check, rand }) => {
          const r = check('str', 12);
          return r.success
            ? { text: `หิมะสูงถึงเอว แต่ขาคุณยังไม่ยอมแพ้ ${r.tag}`, stamina: -1, xp: 14 }
            : { text: `นิ้วเท้าคุณหมดความรู้สึกไปสองนิ้ว ${r.tag}`, hp: -rand(4, 8), stamina: -2, xp: 6 };
        },
      },
    ],
  },
  {
    id: 'w_empty_table',
    door: 'white',
    title: '🤍 โต๊ะอาหารว่างเปล่า',
    description: 'โต๊ะยาวปูผ้าขาว จานเปล่าเรียงเป็นระเบียบ คนผอมแห้งนั่งประจำที่ ยกช้อนเปล่าเข้าปากช้า ๆ มีเก้าอี้ว่างอยู่หนึ่งตัว',
    weight: 7,
    choices: [
      {
        id: 'sit',
        label: 'นั่งร่วมโต๊ะ',
        emoji: '🪑',
        style: 'primary',
        resolve: () => ({ text: 'คุณเคี้ยวความว่างเปล่าไปพร้อมกับพวกเขา ความหิวไม่ได้หายไป แต่มันเงียบลง', stamina: -1, sanity: 8, humanity: 2, xp: 18 }),
      },
      {
        id: 'share',
        label: 'แบ่งเสบียงให้ทั้งโต๊ะ',
        emoji: '🍜',
        style: 'success',
        visible: (c) => WHITE_RATIONS.some((id) => itemCount(c, id) > 0),
        hint: 'เสียของกิน 1 ชิ้น — ความเป็นมนุษย์เพิ่มมาก',
        resolve: ({ char }) => {
          const id = WHITE_RATIONS.find((x) => itemCount(char, x) > 0)!;
          return { text: 'ทุกคนได้คนละคำเดียว ไม่มีใครพูดอะไร แล้วทุกคนก็ร้องไห้', items: { [id]: -1 }, humanity: 8, sanity: 5, xp: 24 };
        },
      },
      {
        id: 'steal',
        label: 'ขโมยช้อนเงิน',
        emoji: '🥄',
        style: 'danger',
        hint: 'ใช้ว่องไว · ต้องทอยรวมได้ 13 ขึ้นไป',
        resolve: ({ check, rand }) => {
          const r = check('agi', 13);
          return r.success
            ? { text: `ไม่มีใครเงยหน้าจากจานเปล่า ${r.tag}`, flesh: rand(12, 20), humanity: -2, xp: 12 }
            : { text: `ทุกคนวางช้อนพร้อมกัน แล้วมองคุณเหมือนมองอาหาร ${r.tag}`, hp: -rand(6, 10), sanity: -6, xp: 5 };
        },
      },
    ],
  },
  {
    id: 'w_frozen_pilgrims',
    door: 'white',
    title: '🤍 ขบวนผู้แสวงบุญ',
    description: 'ผู้แสวงบุญนับสิบแข็งตายในท่าคุกเข่า หันหน้าไปทางเดียวกัน มือทุกคู่ประคองอะไรบางอย่างไว้แนบอก',
    weight: 6,
    choices: [
      {
        id: 'kneel',
        label: 'คุกเข่าสวดร่วมกับพวกเขา',
        emoji: '🙏',
        style: 'primary',
        hint: 'ใช้สัมผัส · ต้องทอยรวมได้ 12 ขึ้นไป',
        resolve: ({ check, rand }) => {
          const r = check('int', 12);
          return r.success
            ? { text: `ความหนาวกัดลึก แต่ใจคุณนิ่งอย่างที่ไม่ได้เป็นมานาน ${r.tag}`, hp: -3, sanity: 6, humanity: 3, xp: 20 }
            : { text: `เข่าของคุณเริ่มติดกับพื้นน้ำแข็ง เหมือนของพวกเขา ${r.tag}`, hp: -rand(6, 9), stamina: -2, xp: 8 };
        },
      },
      {
        id: 'pry',
        label: 'งัดมือศพ',
        emoji: '🫳',
        style: 'danger',
        hint: 'ใช้พละกำลัง · ต้องทอยรวมได้ 13 ขึ้นไป — ลบหลู่',
        resolve: ({ check }) => {
          const r = check('str', 13);
          return r.success
            ? { text: `นิ้วแข็งหักดังเป๊าะ ในมือนั้นคือตราที่เขากำไว้จนลมหายใจสุดท้าย ${r.tag}`, items: { sigil: 1 }, humanity: -4, xp: 14 }
            : { text: `นิ้วหักคามือคุณ แล้วศพทั้งขบวนก็หันหน้ามา ${r.tag}`, sanity: -9, humanity: -3, xp: 5 };
        },
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
        hint: 'ใช้สัมผัส · ต้องทอยรวมได้ 15 ขึ้นไป — รางวัลสูงสุดในดันเจียน',
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
        hint: 'ใช้สัมผัส · ต้องทอยรวมได้ 14 ขึ้นไป — ความทรมานคือการชำระล้าง',
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
        hint: 'ใช้พละกำลัง · ต้องทอยรวมได้ 13 ขึ้นไป',
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
    id: 'b_confession',
    door: 'blue',
    title: '🟦 ตู้สารภาพบาป',
    description: 'ตู้สารภาพบาปไม้ผุตั้งอยู่กลางห้องว่าง หลังตะแกรงมีเสียงหายใจ และมันรู้ชื่อคุณ',
    weight: 8,
    choices: [
      {
        id: 'confess',
        label: 'สารภาพ',
        emoji: '🙏',
        style: 'primary',
        hint: 'ใช้สัมผัส · ต้องทอยรวมได้ 13 ขึ้นไป',
        resolve: ({ check }) => {
          const r = check('int', 13);
          return r.success
            ? { text: `คุณพูดสิ่งที่ไม่เคยบอกใคร เสียงหลังตะแกรงตอบเพียง "ดีแล้ว" ${r.tag}`, humanity: 5, sanity: -4, xp: 22 }
            : { text: `มันสารภาพบาปของคุณกลับมาให้ฟัง ทีละข้อ ไม่ตกสักข้อ ${r.tag}`, sanity: -14, xp: 8 };
        },
      },
      {
        id: 'open',
        label: 'กระชากประตูอีกฝั่ง',
        emoji: '🚪',
        style: 'danger',
        hint: 'ใช้พละกำลัง · ต้องทอยรวมได้ 12 ขึ้นไป',
        resolve: ({ check, rand }) => {
          const r = check('str', 12);
          return r.success
            ? { text: `ไม่มีใครอยู่ มีเพียงกล่องบริจาคที่ไม่มีใครมาเก็บ ${r.tag}`, flesh: rand(12, 22), xp: 14 }
            : { text: `มีคนอยู่ข้างใน และเขาคือคุณ ${r.tag}`, hp: -rand(3, 6), sanity: -10, xp: 6 };
        },
      },
    ],
  },
  {
    id: 'b_weeping_pool',
    door: 'blue',
    title: '🟦 สระน้ำตา',
    description: 'ห้องจมอยู่ใต้น้ำเค็มสูงถึงเอว เพดานร้องไห้ไม่หยุด ใต้ผิวน้ำมีมือที่ไม่ได้พยายามดึงคุณลงไป — แค่อยากให้ใครสักคนจับ',
    weight: 7,
    choices: [
      { id: 'hold', label: 'จับมือพวกเขา', emoji: '🤝', style: 'primary', resolve: () => ({ text: 'คุณยืนจับมือเย็นเฉียบนั้นไว้ จนมันคลายออกเอง', humanity: 4, sanity: -7, xp: 18 }) },
      {
        id: 'wade',
        label: 'ลุยไปให้เร็ว',
        emoji: '🏃',
        style: 'secondary',
        hint: 'ใช้ว่องไว · ต้องทอยรวมได้ 12 ขึ้นไป',
        resolve: ({ check, rand }) => {
          const r = check('agi', 12);
          return r.success
            ? { text: `คุณไม่ก้มมองลงไปเลยสักครั้ง ${r.tag}`, xp: 13 }
            : { text: `คุณลื่นจมลงไป ใต้น้ำมีเสียงสะอื้นของทุกคนที่เคยอยู่ที่นี่ ${r.tag}`, hp: -rand(4, 7), sanity: -9, xp: 6 };
        },
      },
      {
        id: 'dive',
        label: 'ดำลงไปค้นก้นสระ',
        emoji: '🤿',
        style: 'danger',
        hint: 'ใช้พละกำลัง · ต้องทอยรวมได้ 13 ขึ้นไป',
        resolve: ({ check, rand }) => {
          const r = check('str', 13);
          return r.success
            ? { text: `ก้นสระเต็มไปด้วยของที่ผู้คนปล่อยมือ ${r.tag}`, items: { pocket_watch: 1 }, flesh: rand(8, 15), xp: 15 }
            : { text: `มือพวกนั้นไม่ได้ดึงคุณไว้ คุณเองที่ไม่อยากขึ้น ${r.tag}`, hp: -rand(6, 10), sanity: -5, xp: 6 };
        },
      },
    ],
  },
  {
    id: 'b_wall_face',
    door: 'blue',
    title: '🟦 ใบหน้าบนผนัง',
    description: 'ใบหน้าขนาดเท่าประตูนูนออกมาจากผนัง ตาปิดสนิท ริมฝีปากขยับเป็นคำเดียวซ้ำ ๆ: "พอแล้ว"',
    weight: 7,
    choices: [
      {
        id: 'comfort',
        label: 'ปลอบมัน',
        emoji: '🫂',
        style: 'primary',
        hint: 'ใช้สัมผัส · ต้องทอยรวมได้ 13 ขึ้นไป',
        resolve: ({ check }) => {
          const r = check('int', 13);
          return r.success
            ? { text: `มันลืมตาขึ้นครั้งหนึ่ง แล้วคายสิ่งที่อมไว้นานออกมาให้คุณ ${r.tag}`, items: { alchemy_salve: 1 }, humanity: 2, xp: 18 }
            : { text: `"พอแล้ว" ดังขึ้นในหัวคุณ ด้วยเสียงของคุณเอง ${r.tag}`, sanity: -13, xp: 7 };
        },
      },
      {
        id: 'teeth',
        label: 'ถอนฟันมัน',
        emoji: '🦷',
        style: 'danger',
        hint: 'ใช้พละกำลัง · ต้องทอยรวมได้ 13 ขึ้นไป',
        resolve: ({ check, rand }) => {
          const r = check('str', 13);
          return r.success
            ? { text: `มันไม่ขัดขืน และนั่นทำให้รู้สึกแย่กว่าเดิม ${r.tag}`, items: { fiend_fang: rand(1, 2) }, humanity: -3, xp: 14 }
            : { text: `ปากงับแขนคุณไว้ ไม่แรง แต่ไม่ยอมปล่อย ${r.tag}`, hp: -rand(7, 11), xp: 6 };
        },
      },
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
        hint: 'ใช้พละกำลัง · ต้องทอยรวมได้ 16 ขึ้นไป',
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
        hint: 'ใช้ว่องไว · ต้องทอยรวมได้ 13 ขึ้นไป',
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
    id: 'p_spore_garden',
    door: 'purple',
    title: '🟪 สวนเห็ดบนซากศพ',
    description: 'เห็ดสีม่วงเรืองแสงงอกเป็นทุ่งบนซากศพที่เรียงเป็นแปลง สปอร์ลอยขึ้นทุกครั้งที่คุณก้าว',
    weight: 8,
    choices: [
      {
        id: 'harvest',
        label: 'เก็บของจากแปลง',
        emoji: '🍄',
        style: 'primary',
        hint: 'ใช้ว่องไว · ต้องทอยรวมได้ 12 ขึ้นไป — พลาดคือสูด Miasma เต็มปอด',
        resolve: ({ check, rand }) => {
          const r = check('agi', 12);
          return r.success
            ? { text: `คุณเด็ดได้โดยไม่ทำดอกไหนแตก ${r.tag}`, items: { eye_fruit: 2, rotten_flesh: 1 }, miasma: rand(3, 6), xp: 14 }
            : { text: `เห็ดดอกหนึ่งระเบิดใส่หน้าคุณ ${r.tag}`, miasma: rand(12, 18), xp: 6 };
        },
      },
      {
        id: 'tend',
        label: 'ดูแลแปลงตามพิธี',
        emoji: '💀',
        style: 'secondary',
        visible: (c) => c.icon === 'thanatos',
        hint: 'ผู้ศรัทธา Thanatos',
        resolve: () => ({ text: 'คุณรู้ว่าแปลงไหนสุกแล้ว และศพไหนยินดีให้', items: { alchemy_salve: 1, eye_fruit: 2 }, xp: 20 }),
      },
      { id: 'rush', label: 'กลั้นหายใจวิ่งผ่าน', emoji: '😷', style: 'secondary', resolve: ({ rand }) => ({ text: 'ปอดคุณแสบไปอีกนานหลังพ้นห้อง', stamina: -1, miasma: rand(5, 9), xp: 8 }) },
    ],
  },
  {
    id: 'p_embalmer',
    door: 'purple',
    title: '🟪 โต๊ะช่างดองศพ',
    description: 'ช่างดองศพหน้ากากนกกำลังเย็บศพบนโต๊ะหิน ขวดยาเรียงเป็นแถว เขาเงยหน้าขึ้น ชี้ที่ขวด แล้วชี้ที่ถุงเนื้อของคุณ',
    weight: 7,
    choices: [
      {
        id: 'buy',
        label: 'จ่ายเนื้อสด 15 แลกยา',
        emoji: '⚗️',
        style: 'success',
        visible: (c) => c.flesh >= 15,
        resolve: () => ({ text: 'เขาชั่งเนื้ออย่างพิถีพิถัน แล้วเลื่อนขวดมาให้', flesh: -15, items: { alchemy_salve: 1 }, xp: 10 }),
      },
      {
        id: 'assist',
        label: 'ช่วยเขาเย็บศพ',
        emoji: '🪡',
        style: 'primary',
        hint: 'ใช้สัมผัส · ต้องทอยรวมได้ 12 ขึ้นไป',
        resolve: ({ check, rand }) => {
          const r = check('int', 12);
          return r.success
            ? { text: `ฝีเข็มของคุณเรียบพอให้เขาพยักหน้า แล้วยื่นขี้ผึ้งให้เป็นค่าแรง ${r.tag}`, items: { myrrh_balm: 1 }, humanity: 2, miasma: rand(3, 6), xp: 16 }
            : { text: `ศพบนโต๊ะลืมตาตอนเข็มแทงลง ${r.tag}`, sanity: -9, miasma: rand(6, 10), xp: 6 };
        },
      },
      {
        id: 'steal',
        label: 'ฉกขวดยา',
        emoji: '🤏',
        style: 'danger',
        hint: 'ใช้ว่องไว · ต้องทอยรวมได้ 14 ขึ้นไป',
        resolve: ({ check, rand }) => {
          const r = check('agi', 14);
          return r.success
            ? { text: `เขาไม่เงยหน้าจากศพ ${r.tag}`, items: { alchemy_salve: 2 }, xp: 15 }
            : { text: `เข็มเย็บศพปักทะลุหลังมือคุณ ${r.tag}`, hp: -rand(6, 10), miasma: rand(6, 10), xp: 5 };
        },
      },
    ],
  },
  {
    id: 'p_ossuary',
    door: 'purple',
    title: '🟪 สุสานกระดูก',
    description: 'ผนังก่อด้วยกะโหลกนับหมื่นเรียงเป็นลวดลาย เบ้าตาทุกคู่มีเชื้อราสีม่วงเรืองแสงเหมือนกำลังมอง',
    weight: 7,
    choices: [
      {
        id: 'pry',
        label: 'แงะกระดูกดี ๆ ออกมา',
        emoji: '🦴',
        style: 'danger',
        hint: 'ใช้พละกำลัง · ต้องทอยรวมได้ 12 ขึ้นไป',
        resolve: ({ check, rand }) => {
          const r = check('str', 12);
          return r.success
            ? { text: `คุณเลือกชิ้นที่ยังไม่ผุ ผนังครางเบา ๆ แต่ไม่ถล่ม ${r.tag}`, items: { bone: rand(2, 4), fiend_fang: 1 }, xp: 14 }
            : { text: `ผนังทั้งแถบถล่มลงมาทับคุณ พร้อมฝุ่นสปอร์ ${r.tag}`, hp: -rand(6, 10), miasma: rand(6, 10), xp: 6 };
        },
      },
      {
        id: 'read',
        label: 'อ่านลวดลาย',
        emoji: '🧩',
        style: 'primary',
        hint: 'ใช้สัมผัส · ต้องทอยรวมได้ 13 ขึ้นไป',
        resolve: ({ check, rand }) => {
          const r = check('int', 13);
          return r.success
            ? { text: `ลวดลายคือแผนที่ ชี้ไปยังช่องลับหลังกะโหลกใบหนึ่ง ${r.tag}`, flesh: rand(15, 25), xp: 18 }
            : { text: `ลวดลายคือรายชื่อ และช่องสุดท้ายยังว่างอยู่ ${r.tag}`, sanity: -11, xp: 6 };
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
        hint: 'ใช้พละกำลัง · ต้องทอยรวมได้ 16 ขึ้นไป + Miasma',
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
        hint: 'ใช้ว่องไว · ต้องทอยรวมได้ 14 ขึ้นไป',
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
