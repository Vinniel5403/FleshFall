import type { ItemDef } from './types.js';

const list: ItemDef[] = [
  // --- เนื้อ & ของกิน ---
  { id: 'fetal_flesh', name: 'เนื้อทารกผิดรูป', emoji: '🍼', type: 'consumable', isFlesh: true, value: 8, heal: 12, humanity: -3,
    description: 'เนื้อจากรกในผนังดันเจียนเขียว จืดแต่อยู่ท้อง (+12 เนื้อกาย, -3 ความเป็นมนุษย์)' },
  { id: 'fresh_cut', name: 'เนื้อสดเกรดพรีเมียม', emoji: '🥩', type: 'consumable', isFlesh: true, value: 30, heal: 25, stamina: 3, humanity: -6,
    description: 'หอมหวานจนคลั่ง (+25 เนื้อกาย, +3 แรง, -6 ความเป็นมนุษย์)' },
  { id: 'rotten_flesh', name: 'เนื้อเน่า', emoji: '🦠', type: 'material', value: 1,
    description: 'ต้นกำเนิด Miasma อย่ากินดิบ — เอาไปให้บาร์ปรุงด้วย /cook' },
  { id: 'blood_wine', name: 'ไวน์โลหิต', emoji: '🍷', type: 'consumable', value: 10, stamina: 3, sanity: 4,
    description: 'หมักจากเลือด ใช้ปรุงอาหารได้ (+3 แรง, +4 สติ)' },
  { id: 'raw_meat', name: 'เนื้อดิบ', emoji: '🥓', type: 'material', value: 5,
    description: 'เนื้อจากสิ่งมีชีวิตใน Old Realm — ไม่ใช่เนื้อสด ปนเปื้อนจนกินดิบไม่ได้ ขายหรือเอาไปย่างที่บาร์' },
  { id: 'fiend_fang', name: 'เขี้ยว Fiend', emoji: '🦷', type: 'material', value: 18,
    description: 'เขี้ยวจากสัตว์ประหลาดที่เคยเป็นมนุษย์ ช่างทำอาวุธในเกาะรับซื้อ' },
  { id: 'eye_fruit', name: 'ผลดวงตา', emoji: '👁️', type: 'material', value: 6,
    description: 'ขึ้นตามโขดหินที่มีกองเนื้อเยอะ ๆ บางทีก็กระพริบ' },
  { id: 'wild_flour', name: 'แป้งต้นฟีตัส', emoji: '🌾', type: 'material', value: 4,
    description: 'แป้งจากธัญพืชป่าและต้นฟีตัสตามทุ่งร้าง' },
  { id: 'instant_noodle', name: 'บะหมี่กึ่งสำเร็จรูป', emoji: '🍜', type: 'consumable', value: 12, stamina: 4, sanity: 10,
    description: 'จากดันเจียนเทา รสชาติของบ้าน... (+4 แรง, +10 สติ)' },
  // --- อาหารปรุง (/cook) ---
  { id: 'bourguignon', name: 'มีตบูร์กีญง', emoji: '🍲', type: 'consumable', value: 40, heal: 15, sanity: 25, humanity: 5,
    description: 'เนื้อตุ๋นไวน์โลหิต นุ่มจนน้ำในเนื้อระเบิดในปาก (+15 เนื้อกาย, +25 สติ, +5 ความเป็นมนุษย์)' },
  { id: 'taragege', name: 'ทารกเกะ', emoji: '🍗', type: 'consumable', value: 30, heal: 20, stamina: 4, humanity: 3,
    description: 'คาราเกะเนื้อทารกผิดรูป ทอดกรอบ (+20 เนื้อกาย, +4 แรง, +3 ความเป็นมนุษย์)' },
  { id: 'remnant_stew', name: 'สตูว์ถักทอเศษเนื้อ', emoji: '🥘', type: 'consumable', value: 20, heal: 8, sanity: 12, humanity: 4,
    description: 'สูตรประจำบาร์ บรรเทาผลกรรมของ Icon (+8 เนื้อกาย, +12 สติ, +4 ความเป็นมนุษย์)' },
  { id: 'grilled_meat', name: 'เนื้อดิบย่างถ่าน', emoji: '🍖', type: 'consumable', value: 16, heal: 14, stamina: 2, humanity: -1,
    description: 'เนื้อสัตว์จาก Old Realm ย่างจนไหม้ ไม่ใช่เนื้อสด แต่กินได้ (+14 เนื้อกาย, +2 แรง, -1 ความเป็นมนุษย์)' },
  // --- เนื้อล่า (Hound) → อาหารบัฟ (Bar เท่านั้น) ---
  { id: 'hunted_flesh', name: 'เนื้อล่าสด', emoji: '🫀', type: 'consumable', isFlesh: true, value: 14, heal: 14, stamina: 2, humanity: -5,
    description: 'เนื้อที่ Hound แล่จากเหยื่อสด ๆ ยังอุ่น กินดิบได้แต่มันกัดกินความเป็นมนุษย์ — ส่งให้บาร์ปรุงดีกว่า (+14 เนื้อกาย, +2 แรง, -5 ความเป็นมนุษย์)' },
  { id: 'hunter_steak', name: 'สเต๊กนักล่า', emoji: '🍽️', type: 'consumable', value: 45, heal: 10, buff: { stat: 'str', amount: 2, minutes: 45 },
    description: 'เนื้อล่าย่างไฟแรงราดซอสไวน์โลหิต (+10 เนื้อกาย · บัฟ พละ +2 นาน 45 นาที)' },
  { id: 'shade_tartare', name: 'ทาร์ทาร์เงา', emoji: '🥗', type: 'consumable', value: 45, sanity: 6, buff: { stat: 'agi', amount: 2, minutes: 45 },
    description: 'เนื้อล่าสับดิบคลุกผลดวงตา กินแล้วตัวเบาเหมือนเงา (+6 สติ · บัฟ ว่องไว +2 นาน 45 นาที)' },
  { id: 'seer_consomme', name: 'คอนซอมเมผู้หยั่งรู้', emoji: '🥣', type: 'consumable', value: 45, sanity: 10, buff: { stat: 'int', amount: 2, minutes: 45 },
    description: 'ซุปใสจนเห็นเงาตัวเองในชาม ประสาทสัมผัสคมขึ้น (+10 สติ · บัฟ สัมผัส +2 นาน 45 นาที)' },
  { id: 'bone_broth', name: 'ซุปกระดูกเคี่ยวข้ามคืน', emoji: '🍵', type: 'consumable', value: 45, heal: 16, buff: { def: 2, amount: 2, minutes: 45 },
    description: 'เคี่ยวกระดูกกับเนื้อล่าจนข้นเหมือนกาว ผิวหนังด้านขึ้น (+16 เนื้อกาย · บัฟ ลดดาเมจ +2 นาน 45 นาที)' },
  // --- ของประจำทวีป (ร้านใน Old Realm) ---
  { id: 'absinthe', name: 'แอบซินธ์สีเขียว', emoji: '🍸', type: 'consumable', value: 14, stamina: 1, sanity: 12,
    description: 'เหล้ายุโรปที่ทำให้เห็นนางฟ้าสีเขียว... หรืออะไรที่คล้ายกัน (+1 แรง, +12 สติ)' },
  { id: 'spice_jerky', name: 'เนื้อแห้งเครื่องเทศ', emoji: '🌶️', type: 'consumable', value: 12, heal: 10, stamina: 2,
    description: 'เนื้อดิบหมักพริกจนกลบกลิ่น ไม่ใช่เนื้อสด (+10 เนื้อกาย, +2 แรง)' },
  { id: 'canned_beans', name: 'ถั่วกระป๋อง', emoji: '🥫', type: 'consumable', value: 10, heal: 8, sanity: 6,
    description: 'ฉลากยังเป็นยี่ห้อจากโลกจริง รสชาติของบ้าน (+8 เนื้อกาย, +6 สติ)' },
  { id: 'mate_tea', name: 'ชามาเต้', emoji: '🧉', type: 'consumable', value: 10, stamina: 4, sanity: 3,
    description: 'ดูดผ่านหลอดเงิน ขมจนตาสว่าง (+4 แรง, +3 สติ)' },
  { id: 'myrrh_balm', name: 'ขี้ผึ้งมดยอบ', emoji: '🏺', type: 'consumable', value: 18, heal: 16, humanity: 1,
    description: 'ยาโบราณของคนดองศพ ทาแล้วแผลหายเร็ว (+16 เนื้อกาย, +1 ความเป็นมนุษย์)' },
  { id: 'eucalyptus_oil', name: 'น้ำมันยูคาลิปตัส', emoji: '🌿', type: 'consumable', value: 16, sanity: 15,
    description: 'กลิ่นแรงพอจะไล่เสียงกระซิบของ Hastur ไปได้สักพัก (+15 สติ)' },
  { id: 'whale_blubber', name: 'ไขมันวาฬ', emoji: '🐋', type: 'consumable', value: 20, heal: 18, stamina: 3,
    description: 'ไขมันข้นจากวาฬในน้ำแข็ง กันหนาวได้ดีกว่าเสื้อผ้า (+18 เนื้อกาย, +3 แรง)' },
  // --- ยา ---
  { id: 'bandage', name: 'ผ้าพันแผลเปื้อนเลือด', emoji: '🩹', type: 'consumable', value: 8, heal: 10,
    description: 'ห้ามเลือดได้ (+10 เนื้อกาย)' },
  { id: 'alchemy_salve', name: 'ยาเล่นแร่แปรธาตุ', emoji: '⚗️', type: 'consumable', value: 25, heal: 22,
    description: 'ยาที่สาวก Thanatos พึ่งพา (+22 เนื้อกาย)' },
  // --- อาวุธ ---
  { id: 'pipe', name: 'ท่อเหล็ก', emoji: '🔧', type: 'weapon', value: 4, atk: 1, description: '+1 พละ' },
  { id: 'walking_cane', name: 'ไม้เท้าหัวกะโหลก', emoji: '🦯', type: 'weapon', value: 15, atk: 1, description: '+1 พละ ดูดีสำหรับคนมีฐานะ' },
  { id: 'kris', name: 'กริช', emoji: '🗡️', type: 'weapon', value: 18, atk: 2, description: '+2 พละ แบบเดียวกับของบาทหลวงดาเมียโน' },
  { id: 'carving_knife', name: 'มีดแล่เนื้อประจำตัว', emoji: '🔪', type: 'weapon', value: 25, atk: 2, description: '+2 พละ คมพอจะแล่โดยไม่เหลือเศษ' },
  { id: 'bone_club', name: 'กระบองกระดูกปีศาจ', emoji: '🦴', type: 'weapon', value: 20, atk: 2, description: '+2 พละ' },
  { id: 'bone_saw', name: 'เลื่อยกระดูก', emoji: '🪚', type: 'weapon', value: 70, atk: 4, description: '+4 พละ' },
  { id: 'old_shotgun', name: 'ลูกซองยุค 1920', emoji: '🔫', type: 'weapon', value: 120, atk: 5, description: '+5 พละ ของวินเทจที่ยังยิงได้' },
  // --- เกราะ ---
  { id: 'blood_apron', name: 'ผ้ากันเปื้อนคราบเลือด', emoji: '🦺', type: 'armor', value: 12, def: 1, description: 'ลดดาเมจ 1' },
  { id: 'leather_coat', name: 'โค้ทหนังเก่า', emoji: '🧥', type: 'armor', value: 25, def: 2, description: 'ลดดาเมจ 2' },
  { id: 'rusted_armor', name: 'เกราะอัศวินขึ้นสนิม', emoji: '🛡️', type: 'armor', value: 90, def: 4, description: 'ลดดาเมจ 4 ยังมีคราบของเจ้าของเดิม' },
  // --- ของวินเทจจากโลกจริง (ขายให้ Patron / ใช้เป็นค่าโดยสารเรือ) ---
  { id: 'lighter', name: 'ไฟแช็ก', emoji: '🔥', type: 'vintage', value: 35, description: 'แสงสว่างที่ช่วยชีวิตในดันเจียนเหลือง' },
  { id: 'dead_phone', name: 'มือถือไร้สัญญาณ', emoji: '📱', type: 'vintage', value: 60, description: 'ใช้ไม่ได้ แต่ Patron ยอมจ่ายแพง' },
  { id: 'family_photo', name: 'รูปถ่ายครอบครัว', emoji: '🖼️', type: 'vintage', value: 45, description: 'หน้าคนในรูปเริ่มเลือนลาง' },
  { id: 'pocket_watch', name: 'นาฬิกาพก', emoji: '⌚', type: 'vintage', value: 55, description: 'เข็มเดินถอยหลัง' },
  { id: 'vinyl_record', name: 'แผ่นเสียงไวนิล', emoji: '💿', type: 'vintage', value: 70, description: 'เพลงที่ไม่มีใครในเกาะจำได้' },
  // --- วัตถุดิบ/ของแปลก ---
  { id: 'bone', name: 'กระดูก', emoji: '🦴', type: 'material', value: 3, description: 'ไม่ใช่ของคุณ... หวังว่านะ' },
  { id: 'sophia_rite', name: 'พิธีชุบชีวิตของ Sophia', emoji: '🥚', type: 'material', value: 0,
    description: 'ไข่เนื้อสีชมพูที่ยังเต้นตุบ จากศาลของ Sophia — ใช้ /revive นำเพื่อนที่กลายเป็น Fiend กลับมา' },
  { id: 'sigil', name: 'ตราสัญลักษณ์ Icon', emoji: '🔯', type: 'material', value: 50, description: 'ใช้ในพิธีติดต่อ Icon' },
];

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(list.map((i) => [i.id, i]));

export function getItem(id: string): ItemDef | undefined {
  return ITEMS[id];
}

export function itemLabel(id: string, qty?: number): string {
  const it = ITEMS[id];
  const base = it ? `${it.emoji} ${it.name}` : id;
  return qty !== undefined ? `${base} ×${qty}` : base;
}

/** Items players can trade on the market (not quest relics). */
export const TRADEABLE_IDS = list.filter((i) => i.value > 0).map((i) => i.id);

export const VINTAGE_IDS =list.filter((i) => i.type === 'vintage').map((i) => i.id);
