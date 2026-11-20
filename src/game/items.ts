import type { ItemDef, StatKey } from './types.js';

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
  // --- ยาบัฟชั่วคราว (อ่อนกว่าอาหารสูตรลับบาร์ แต่ซื้อได้เลย) ---
  { id: 'rage_tonic', name: 'ยาดองเลือดเดือด', emoji: '🍶', type: 'consumable', value: 28, buff: { stat: 'str', amount: 1, minutes: 20 },
    description: 'เหล้าดองเขี้ยว Fiend กระดกแล้วเลือดสูบฉีดจนมือสั่น (บัฟ พละ +1 นาน 20 นาที)' },
  { id: 'hide_tonic', name: 'ขี้ผึ้งหนังด้าน', emoji: '🧴', type: 'consumable', value: 28, buff: { def: 1, amount: 1, minutes: 20 },
    description: 'ทาแล้วผิวแข็งกระด้างเหมือนหนังตากแห้ง (บัฟ ลดดาเมจ +1 นาน 20 นาที)' },
  { id: 'fiend_adrenal', name: 'ต่อมคลั่งของ Fiend', emoji: '💉', type: 'consumable', value: 80, humanity: -2, buff: { stat: 'str', amount: 3, minutes: 30 },
    description: 'ต่อมสด ๆ จาก Fiend ในเมืองอันตราย กลืนแล้วกล้ามเนื้อกระตุกไม่หยุด (บัฟ พละ +3 นาน 30 นาที, -2 ความเป็นมนุษย์) · ดรอปเฉพาะเมืองระดับ Hard ขึ้นไป' },
  // --- ระเบิด (ขว้างได้เฉพาะตอนล่า — โดนมอนสเตอร์ทุกตัว ไม่มีวันพลาด) ---
  { id: 'bone_bomb', name: 'ระเบิดเศษกระดูก', emoji: '💣', type: 'consumable', value: 35, blast: [6, 10],
    description: 'กระป๋องอัดดินปืนกับเศษกระดูก ขว้างตอนล่า — มอนสเตอร์ทุกตัวโดน 6–10 (+ครึ่งเลเวลของคุณ)' },
  { id: 'flesh_grenade', name: 'ระเบิดก้อนเนื้อ', emoji: '🧨', type: 'consumable', value: 90, blast: [14, 20],
    description: 'ก้อนเนื้อบวมก๊าซที่ยังเต้นอยู่ ขว้างตอนล่า — มอนสเตอร์ทุกตัวโดน 14–20 (+ครึ่งเลเวลของคุณ) · ดรอปเฉพาะเมืองระดับ Hard ขึ้นไป' },
  // --- อาวุธ ---
  { id: 'pipe', name: 'ท่อเหล็ก', emoji: '🔧', type: 'weapon', value: 4, atk: 1, description: '+1 พละ' },
  { id: 'walking_cane', name: 'ไม้เท้าหัวกะโหลก', emoji: '🦯', type: 'weapon', value: 15, atk: 1, description: '+1 พละ ดูดีสำหรับคนมีฐานะ' },
  { id: 'kris', name: 'กริช', emoji: '🗡️', type: 'weapon', value: 18, atk: 2, description: '+2 พละ แบบเดียวกับของบาทหลวงดาเมียโน' },
  { id: 'carving_knife', name: 'มีดแล่เนื้อประจำตัว', emoji: '🔪', type: 'weapon', value: 25, atk: 2, description: '+2 พละ คมพอจะแล่โดยไม่เหลือเศษ' },
  { id: 'bone_club', name: 'กระบองกระดูกปีศาจ', emoji: '🦴', type: 'weapon', value: 20, atk: 2, description: '+2 พละ' },
  { id: 'bone_saw', name: 'เลื่อยกระดูก', emoji: '🪚', type: 'weapon', value: 70, atk: 4, description: '+4 พละ' },
  { id: 'old_shotgun', name: 'ลูกซองยุค 1920', emoji: '🔫', type: 'weapon', value: 120, atk: 5, description: '+5 พละ ของวินเทจที่ยังยิงได้' },
  // ไม่มีขาย — ดรอปจากเมืองระดับสูงเท่านั้น (TIER_GEAR ใน drops.ts)
  { id: 'butcher_cleaver', name: 'ปังตอเพชฌฆาต', emoji: '🪓', type: 'weapon', value: 180, atk: 6, description: '+6 พละ หนักจนต้องจับสองมือ · ดรอปเฉพาะเมืองระดับ Hard ขึ้นไป' },
  { id: 'knight_sword', name: 'ดาบอัศวินขึ้นสนิม', emoji: '⚔️', type: 'weapon', value: 260, atk: 7, description: '+7 พละ คู่กับเกราะของเจ้าของเดิม คมกว่าที่สนิมบอก · ดรอปเฉพาะเมืองระดับ Epic' },
  // --- เกราะ ---
  { id: 'blood_apron', name: 'ผ้ากันเปื้อนคราบเลือด', emoji: '🦺', type: 'armor', value: 12, def: 1, description: 'ลดดาเมจ 1' },
  { id: 'leather_coat', name: 'โค้ทหนังเก่า', emoji: '🧥', type: 'armor', value: 25, def: 2, description: 'ลดดาเมจ 2' },
  { id: 'rusted_armor', name: 'เกราะอัศวินขึ้นสนิม', emoji: '🛡️', type: 'armor', value: 90, def: 4, description: 'ลดดาเมจ 4 ยังมีคราบของเจ้าของเดิม' },
  { id: 'fiend_hide', name: 'เสื้อหนัง Fiend', emoji: '🥋', type: 'armor', value: 200, def: 5, description: 'ลดดาเมจ 5 หนังฟอกที่ยังอุ่นเหมือนมีชีวิต · ดรอปเฉพาะเมืองระดับ Epic' },
  // --- ของวินเทจจากโลกจริง (ขายให้ Patron / ใช้เป็นค่าโดยสารเรือ) ---
  { id: 'lighter', name: 'ไฟแช็ก', emoji: '🔥', type: 'vintage', value: 35, description: 'แสงสว่างที่ช่วยชีวิตในดันเจียนเหลือง' },
  { id: 'dead_phone', name: 'มือถือไร้สัญญาณ', emoji: '📱', type: 'vintage', value: 60, description: 'ใช้ไม่ได้ แต่ Patron ยอมจ่ายแพง' },
  { id: 'family_photo', name: 'รูปถ่ายครอบครัว', emoji: '🖼️', type: 'vintage', value: 45, description: 'หน้าคนในรูปเริ่มเลือนลาง' },
  { id: 'pocket_watch', name: 'นาฬิกาพก', emoji: '⌚', type: 'vintage', value: 55, description: 'เข็มเดินถอยหลัง' },
  { id: 'vinyl_record', name: 'แผ่นเสียงไวนิล', emoji: '💿', type: 'vintage', value: 70, description: 'เพลงที่ไม่มีใครในเกาะจำได้' },
  // --- ของเก่าแต่งห้อง (ดรอปจากการล่าเท่านั้น ดู drops.ts) — วางในห้องได้เมื่อมีภาพใน assets/rooms-src แล้วใส่ furniture ---
  { id: 'tube_radio', name: 'วิทยุหลอด', emoji: '📻', type: 'vintage', decor: true, value: 110, description: 'เปิดแล้วมีแต่เสียงซ่า กับเสียงใครบางคนเรียกชื่อคุณ · ของเก่าแต่งห้อง' },
  { id: 'rotary_phone', name: 'โทรศัพท์หมุน', emoji: '☎️', type: 'vintage', decor: true, value: 100, description: 'สายขาดไปนานแล้ว แต่บางคืนมันยังดัง · ของเก่าแต่งห้อง' },
  { id: 'crt_tv', name: 'โทรทัศน์จอตู้', emoji: '📺', type: 'vintage', decor: true, value: 140, description: 'จอเป็นเม็ดหิมะ มองนานพอจะเห็นห้องของคุณเอง · ของเก่าแต่งห้อง' },
  { id: 'typewriter', name: 'เครื่องพิมพ์ดีด', emoji: '⌨️', type: 'vintage', decor: true, value: 120, description: 'กระดาษที่ค้างอยู่พิมพ์คำเดียวซ้ำทั้งหน้า · ของเก่าแต่งห้อง' },
  { id: 'oil_lamp', name: 'ตะเกียงน้ำมัน', emoji: '🪔', type: 'vintage', decor: true, value: 90, description: 'เปลวไฟเอนเข้าหาคนเสมอ · ของเก่าแต่งห้อง' },
  { id: 'cracked_mirror', name: 'กระจกเงาบานร้าว', emoji: '🪞', type: 'vintage', decor: true, value: 100, description: 'เงาในกระจกขยับช้ากว่าคุณครึ่งจังหวะ · ของเก่าแต่งห้อง' },
  // ของเก่าประจำทวีป
  { id: 'grandfather_clock', name: 'นาฬิกาลูกตุ้ม', emoji: '🕰️', type: 'vintage', decor: true, value: 200, description: 'ตีบอกเวลาสิบสามครั้ง จากคฤหาสน์ร้างในยุโรป · ของเก่าแต่งห้อง' },
  { id: 'paper_lantern', name: 'โคมกระดาษแดง', emoji: '🏮', type: 'vintage', decor: true, value: 160, description: 'จุดแล้วส่องเห็นแต่สิ่งที่ไม่ควรเห็น จากตลาดกลางคืนในเอเชีย · ของเก่าแต่งห้อง' },
  { id: 'jukebox', name: 'ตู้เพลงหยอดเหรียญ', emoji: '🎶', type: 'vintage', decor: true, value: 220, description: 'เล่นเพลงเดียวซ้ำไปมา ทั้งที่ไม่มีใครหยอดเหรียญ จากร้านอาหารข้างทางในอเมริกา · ของเก่าแต่งห้อง' },
  { id: 'carnival_mask', name: 'หน้ากากคาร์นิวัล', emoji: '🎭', type: 'vintage', decor: true, value: 160, description: 'แขวนผนังไว้ดีกว่าสวม เพราะมันถอดไม่ออก จากขบวนแห่ในอเมริกาใต้ · ของเก่าแต่งห้อง' },
  { id: 'hide_drum', name: 'กลองหนังโบราณ', emoji: '🥁', type: 'vintage', decor: true, value: 170, description: 'วางเฉย ๆ ก็ยังได้ยินจังหวะเบา ๆ จากข้างใน จากแอฟริกา · ของเก่าแต่งห้อง' },
  { id: 'outback_sign', name: 'ป้ายเตือนข้างทาง', emoji: '🪧', type: 'vintage', decor: true, value: 230, description: 'ป้ายสังกะสีรูปสัตว์ที่ไม่มีอยู่จริง จากถนนสายเปลี่ยวในออสเตรเลีย · ของเก่าแต่งห้อง' },
  { id: 'expedition_crate', name: 'ลังไม้คณะสำรวจ', emoji: '📦', type: 'vintage', decor: true, value: 260, description: 'ตีตราปี 1912 ข้างในว่างเปล่า มีรอยเล็บขูดจากด้านใน จากแอนตาร์กติกา · ของเก่าแต่งห้อง' },
  // ของที่มอนสเตอร์แต่ละชนิดหวงไว้
  { id: 'empty_icebox', name: 'ตู้เย็นว่างเปล่า', emoji: '🧊', type: 'vintage', decor: true, value: 150, description: 'เศษเดนเนื้อเฝ้ามันไว้ ทั้งที่ข้างในไม่เหลืออะไรให้กิน · ของเก่าแต่งห้อง' },
  { id: 'specimen_jar', name: 'โหลดองตัวอย่าง', emoji: '🧪', type: 'vintage', decor: true, value: 150, description: 'ของในโหลยังขยับเป็นบางครั้ง ซากคลานเน่าชอบขดอยู่รอบมัน · ของเก่าแต่งห้อง' },
  { id: 'floor_lamp', name: 'โคมไฟตั้งพื้น', emoji: '💡', type: 'vintage', decor: true, value: 160, description: 'เปิดแล้วเงาที่ทอดลงพื้นไม่ใช่เงาของโคม · ของเก่าแต่งห้อง' },
  { id: 'dog_house', name: 'บ้านสุนัขไม้', emoji: '🛖', type: 'vintage', decor: true, value: 160, description: 'ป้ายชื่อถูกกัดจนอ่านไม่ออก ข้างในยังอุ่น · ของเก่าแต่งห้อง' },
  { id: 'church_pew', name: 'ม้านั่งโบสถ์', emoji: '⛪', type: 'vintage', decor: true, value: 180, description: 'พนักพิงสลักบทสวดที่ไม่มีในคัมภีร์ไหน · ของเก่าแต่งห้อง' },
  { id: 'glass_terrarium', name: 'ตู้กระจกเพาะเห็ด', emoji: '🍄', type: 'vintage', decor: true, value: 180, description: 'เห็ดข้างในโตเองไม่ต้องรดน้ำ อย่าเปิดฝา · ของเก่าแต่งห้อง' },
  { id: 'stained_glass', name: 'บานกระจกสี', emoji: '🪟', type: 'vintage', decor: true, value: 240, description: 'ลวดลายเรขาคณิตเปลี่ยนไปทุกครั้งที่กะพริบตา · ของเก่าแต่งห้อง' },
  // --- ของตกแต่งห้องส่วนตัว (จัดห้องบนเว็บ — วางได้เท่าจำนวนที่มี) ---
  { id: 'steel_shelf', name: 'ชั้นวางเหล็ก', emoji: '🗄️', type: 'furniture', value: 60, furniture: 'concrete-shelf',
    description: 'ชั้นเหล็กขึ้นสนิมจากโกดังร้าง ของตกแต่งห้องส่วนตัว — จัดวางได้ที่หน้าโปรไฟล์บนเว็บ' },
  // --- วัตถุดิบ/ของแปลก ---
  { id: 'bone', name: 'กระดูก', emoji: '🦴', type: 'material', value: 3, description: 'ไม่ใช่ของคุณ... หวังว่านะ' },
  { id: 'sophia_rite', name: 'พิธีชุบชีวิตของ Sophia', emoji: '🥚', type: 'material', value: 0,
    description: 'ไข่เนื้อสีชมพูที่ยังเต้นตุบ จากศาลของ Sophia — ใช้ /revive นำเพื่อนที่กลายเป็น Fiend กลับมา' },
  { id: 'placenta', name: 'รกคืนชีพ', emoji: '🥚', type: 'material', value: 120,
    description: 'รกที่ยังอุ่นและเต้นตุบ ใช้ได้ตอนล้มตายในเมืองระดับ Hard/Epic — ฟื้นขึ้นมาสู้ต่อทันที (ต้องอยู่ในกระเป๋า ไม่ใช่ของรอรับ)' },
  { id: 'sigil', name: 'ตราสัญลักษณ์ Icon', emoji: '🔯', type: 'consumable', value: 50, sanity: 6, humanity: 4,
    description: 'ตราของรูปบูชา — ถวายที่ศาล Icon ท้ายดันเจียนเพื่อเลื่อนขั้นพร · หรือกำไว้ท่อง First Verses ได้ทุกที่ (+6 สติ, +4 ความเป็นมนุษย์)' },
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

const STAT_LABEL: Record<StatKey, string> = { str: 'พละ', agi: 'ว่องไว', int: 'สัมผัส' };

/**
 * What using an item does, read off its numbers — menus show this so they can't drift from the data.
 * `short` = the icon-only form for select menus (100-char descriptions).
 */
export function itemEffects(id: string, short = false): string {
  const d = ITEMS[id];
  if (!d) return '';
  const signed = (v: number) => (v > 0 ? `+${v}` : `${v}`);
  const out: string[] = [];
  const add = (v: number | undefined, emoji: string, name: string) => {
    if (v) out.push(short ? `${emoji}${signed(v)}` : `${emoji} ${name} ${signed(v)}`);
  };
  add(d.heal, '🩸', 'เนื้อกาย');
  add(d.stamina, '⚡', 'แรง');
  add(d.sanity, '🧠', 'สติ');
  add(d.humanity, '🫀', 'ความเป็นมนุษย์');
  if (d.buff) {
    const what = d.buff.def ? 'ลดดาเมจ' : STAT_LABEL[d.buff.stat!];
    out.push(short ? `บัฟ ${what}+${d.buff.amount} ${d.buff.minutes}นาที` : `บัฟ ${what} +${d.buff.amount} (${d.buff.minutes} นาที)`);
  }
  if (d.blast) out.push(short ? `💥 ทุกตัว ${d.blast[0]}–${d.blast[1]}` : `💥 มอนสเตอร์ทุกตัว ${d.blast[0]}–${d.blast[1]} (ขว้างตอนล่า)`);
  return out.join(short ? ' ' : ' · ');
}

/** Items players can trade on the market (not quest relics). */
export const TRADEABLE_IDS = list.filter((i) => i.value > 0).map((i) => i.id);

/** room catalog id → the furniture item that places it */
export const FURNITURE_ITEM: Record<string, string> = Object.fromEntries(list.filter((i) => i.furniture).map((i) => [i.furniture!, i.id]));

/** Small real-world relics: ferry fare, Patron commissions, event rewards. Decoration pieces are kept out so those never eat or hand out one. */
export const VINTAGE_IDS = list.filter((i) => i.type === 'vintage' && !i.decor).map((i) => i.id);

/** Room-decoration collectibles (hunt drops). */
export const DECOR_IDS = list.filter((i) => i.decor).map((i) => i.id);
