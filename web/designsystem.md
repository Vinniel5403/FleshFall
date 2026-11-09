# FleshFall Web — Design System

แนวทาง: **เว็บเกมสายหรู–คลาสสิก (อ้างอิงความเรียบหรูแบบ FGO) ในโทนเลือด/เนื้อ** — มืด แดงเข้ม ตัว serif เส้นเรียวบาง ประดับข้าวหลามตัด ◆
หลักใหญ่: **ภาพตัวละครเป็นพระเอก** UI เป็นกรอบเส้นบางรอบภาพ ลูกเล่นประดับใช้ *พอดี ๆ* — เด่นที่หัวข้อกับกรอบภาพ เนื้อหาให้เรียบ
**ไม่ทำ:** ลายเฉียง `////`, มุมตัด, ขีด/ป้าย HUD ข้างจอ, ตารางเส้น — (เคยลองแบบ NIKKE แล้ว ลอกเกินไป)

ไฟล์ (โหลดตามลำดับใน `src/app/layout.tsx`):
`globals.css` (tokens + base) → `kv.css` (hero/banner) → `nav.css` → `landing.css` → `icons.css` → `characters.css` → **`hud.css`** (ชั้นตกแต่งทั้งเว็บ: SectionHead, ปุ่ม, การ์ด, พื้นลายจุด — โหลดท้ายสุด)

---

## 1. Color tokens

| Token | ค่า | ใช้กับ |
|---|---|---|
| `--bg` | `#0b0606` | พื้นหลังหลัก |
| `--bg2` | `#140909` | พื้นรอง |
| `--panel` | `#1a0c0c` | การ์ด, กล่อง |
| `--line` | `#3a1717` | เส้นขอบปกติ |
| `--crimson` | `#e01e37` | **accent หลัก** — เส้นเรียวหัวข้อ, ◆ มุมกรอบ, ขีดใต้แท็บ, ปุ่ม |
| `--blood` | `#a3121b` | ไล่สีปุ่ม, ป้าย 18+ |
| `--flesh` | `#e6b8a2` | หัวข้อรองไทย, ข้อความเน้น, hover |
| `--bone` | `#e9e0d4` | ข้อความหลัก, หัวข้อ EN |
| `--muted` | `#9a8178` | ข้อความรอง |
| `--hair` (`hud.css`) | `rgba(230,184,162,.55)` | เส้นบาง (hairline) ขนาบหัวข้อรอง/เส้นคั่น |
| `--ornament` | `rgba(224,30,55,.55)` | เส้นข้าวหลามตัดหลังหัวข้อ |
| `--dots` | `rgba(255,255,255,.03)` | พื้นลายจุด |

สีเฉพาะเกม (ข้อมูล ไม่ใช่ตกแต่ง): ระดับเมือง `--t-easy/normal/hard/epic`, สีประตู `--d-*` (ส่งผ่าน `style={{ "--door": doorVar(c) }}`)

**กฎ:** แสงเรืองของแถบเทพเป็น **สีขาว** · accent ตกแต่งใช้ `--crimson` · เส้นบางใช้ `--hair`

## 2. Typography

| Font | ตัวแปร | ใช้กับ |
|---|---|---|
| **UnifrakturMaguntia** | `--font-logo` | **โลโก้ “Fleshfall” เท่านั้น** (blackletter สีแดง ตัวเล็กตามโลโก้จริง ไม่ใช้ตัวใหญ่ทั้งคำ) |
| **Cinzel** (600/800) | `--font-cinzel` | หัวข้อ EN (`SectionHead`, ชื่อบทบาท, แบนเนอร์), ตัวเลข/label เล็ก, ชื่อแนวตั้งแถบเทพ |
| **Kanit** (300–800) | `--font-kanit` | ภาษาไทยทั้งหมด, เนื้อความ |

สเกล: โลโก้ hero `clamp(72px,12vw,170px)` · nav โลโก้ `26–34px` · หัวข้อ EN `clamp(32px,4.2vw,58px)` Cinzel 600 letter-spacing .1em · หัวข้อไทยรอง `clamp(16px,1.5vw,21px)` Kanit 500 สี `--flesh` · เนื้อความ 15–17px line-height 1.7–1.8

**ห้าม** letter-spacing กว้างกับภาษาไทย (สระ/วรรณยุกต์แตก) — ใช้กับ EN เท่านั้น

## 3. Ornament language

- **เส้นเรียว (tapered line)** — สองข้างหัวข้อ หนาตรงกลาง จางออกปลาย: `clip-path: polygon(0 50%, 100% 0, 100% 100%)` + gradient crimson→transparent
- **ข้าวหลามตัด ◆** — กรอบสี่เหลี่ยมหมุน 45° เส้นบางหลังหัวข้อ, จุด ◆ ทึบที่มุมกรอบภาพ, ◆ เล็กคั่นแท็บ/เส้นคั่น
- **เส้นบางขนาบ (hairlines)** — หัวข้อรองไทยมีเส้น 1px จางสองข้าง
- **กรอบคู่ (double frame)** — เส้นนอก `rgba(230,184,162,.35)` + เส้นใน inset 8px จางกว่า
- **มุมฉากเรียบ** — `border-radius: 0` ทุกที่ ไม่ตัดมุม
- **พื้นลายจุด** — `radial-gradient(var(--dots) 1.2px, transparent 1.6px)` ขนาด 22px

## 4. Components

### Section head — `<SectionHead en th center? as? />`
EN serif ตรงกลาง ขนาบเส้นเรียวแดงสองข้าง มีกรอบ ◆ จาง ๆ ด้านหลัง → หัวข้อไทยสี flesh ขนาบเส้นบาง
```tsx
<SectionHead en="GEOGRAPHY" th="สามดินแดน" center />
<SectionHead en="LORE" th="เนื้อคือทุกสิ่ง" />            // ชิดซ้าย: ไม่มีเส้นฝั่งซ้าย
<SectionHead en="WORLD MAP" th="แผนที่ Old Realm" as="h1" /> // ใน PageBanner
```
หัวข้อไทยคือ heading จริง (`h1/h2`) · EN ตกแต่ง (`aria-hidden`)

### Page banner — `<PageBanner art en th lead />`
ภาพเต็มกว้าง + เงาไล่ + `SectionHead as="h1"` (ไม่มีแผ่นเฉียง)

### Buttons
- `.cta` สี่เหลี่ยมไล่แดง + เส้นในขาวบาง (inset 1px) · hover: เส้นในชัดขึ้น + เงาแดง
- `.cta.ghost` พื้นดำโปร่ง เส้นขาวจาง
- ปุ่มหลัก = **“✦ สร้างตัวละคร”** → `/create`

### Cards — `.card` `.land` `.guide-card` `.step`
กรอบเส้นเดียว `--line` · hover: ขอบแดงจาง + **กรอบในเส้นบาง** (outline offset −6px) โผล่

### Characters — `components/CharacterSelect.tsx` (layout ของเราเอง)
1. `SectionHead` CHARACTERS (กลาง)
2. **แท็บชื่อบทบาท** แถวเดียวกลางจอ: EN (Cinzel) + ไทยเล็ก, คั่นด้วย ◆, ตัวที่เลือกมีขีดแดงจางใต้
3. **เวที 2 คอลัมน์**: ซ้าย = ภาพใน **กรอบคู่ มี ◆ แดงที่มุม** (ภาพตัดพื้น `cutout` โผล่ทะลุขอบบน / ภาพมีพื้น `framed` เต็มกรอบ / ไม่มีภาพ = “No Record”) · ขวา = `01 / 06`, ชื่อ EN ใหญ่, ชื่อไทย, เส้นคั่น ◆, ฉายา, คำอธิบาย, `‹ Prev  Next ›`
4. พื้นหลัง: แสงแดงจาง ๆ หลังกรอบ + ลายจุด

### Icon gallery — `components/IconGallery.tsx`
7 แถบตั้งตรง · hover/แตะ = ขยาย + ภาพเป็นสี + **เรืองขาว** · ไม่ hover = แถบเฉย ๆ · **ทั้ง section ใช้สีขาว/เทาเท่านั้น ไม่ใช้สีประตู** · ชื่อแนวตั้งแบบตะแคง (vertical-rl ปกติ) · **สเกลภาพคงที่**: ภาพสูงเต็มแถบ จัดกลาง แถบแคบแค่ตัดข้าง (ไม่ใช้ cover/ไม่ซูม) · ชื่อแนวตั้งไม่ขยายตอน hover แต่เลื่อนไปชิดซ้าย · **ภาพเคลื่อนไหวตอน hover** (เช่น Beelzebub): แตกเฟรมเป็น webp `<icon>-0..n`, ใส่ `frames` ใน `ICON_ART` → hover เล่นไปข้างหน้าแบบ ease-in (ช้าแล้วเร็ว 260→40ms) แล้วค้างเฟรมสุดท้าย (ไม่มีเด้ง), เอาออกเล่นย้อน · การ์ดข้อมูลบอกแค่ ฉายา/ชื่อ/คติ (ไม่มีคำว่าประตูสี ไม่มีค่าพลัง)

### Nav — `components/Header.tsx`
บนสุด: **ใส ไม่มีขอบ** · เลื่อน > 40px: กระจกเบลอ `blur(22px) saturate(150%)` บนพื้น `rgba(11,6,6,.5)` + เส้นล่างบาง · โลโก้ blackletter แดง · มือถือ ☰ (framer-motion)

### Hero — `components/HeroCarousel.tsx`
ทุกรูปใน `public/background/` (เรียงตามชื่อ) · Ken Burns ~8 วิ → crossfade 1.6 วิ · `object-fit: cover` (ครอป ไม่ยืด) · โลโก้ blackletter แดงใหญ่

## 5. Motion (framer-motion)

| Pattern | ที่ใช้ | ค่า |
|---|---|---|
| `<Reveal from="up\|left\|right\|fade" delay>` | เข้าจอครั้งแรก | 0.8s, ease `[0.2,0.8,0.2,1]`, 48–60px, `once` |
| `<RevealGroup>` + `<RevealItem>` | การ์ดหลายใบ | stagger 0.08s |
| `AnimatePresence mode="wait"` | สลับบทบาท | ภาพขึ้นจากล่าง 24px, ข้อความจากขวา 24px, 0.45–0.5s |
| CSS transition | hover/ขยายแถบ | 0.25–0.6s `cubic-bezier(.2,.8,.2,1)` |

เคารพ `prefers-reduced-motion` · animate แค่ `opacity/transform/filter/flex-grow`

## 6. Imagery

- `public/{background,asset,icons}` เป็น **webp** ชื่อ kebab-case (`maid-cleaver.webp`, `sophia.webp`) · background ≤ 2560px, อื่น ≤ 1800px
- **แทนรูปเดิม → ตั้งชื่อไฟล์ใหม่เสมอ** (เช่น `patron-centaur.webp`) ไม่เขียนทับชื่อเดิม เพราะแคชย่อรูปของ Next / เบราว์เซอร์ / CDN จะยังโชว์รูปเก่า
- ลงทะเบียนใน `src/lib/art.ts` (`src`, `alt`, `pos`) · ภาพเทพใน `IconGallery.tsx`
- ภาพตัดพื้น → `cutout` + `drop-shadow` · ภาพมีพื้น → `framed`
- ใช้ `next/image` (`fill` + `sizes`), ภาพแรกของหน้า `preload`

## 7. Content rules

- ไทยเป็นหลัก ชื่อเฉพาะคงอังกฤษ (Icon, M.A.I.D.S, Rouge Land, Fiend, Miasma)
- เว็บ **static ล้วน** — ข้อมูลเกมจาก `src/data/game.json` (`npm run web:data` ที่ root)
- **ไม่แสดงค่าพลัง/ตัวเลขเกม** ในหน้าแรกและ `/create`
- ป้าย **18+ / CW** ในส่วนต้อนรับและแนวทางออกแบบ

## 8. Checklist เพิ่ม section ใหม่

1. หัวข้อใช้ `<SectionHead en th />`
2. กล่องใช้ `.card` (กรอบเส้นเดียว, hover กรอบใน) — ไม่ตัดมุม ไม่ใส่ลายเฉียง
3. ประดับเลือก 1 อย่างต่อกลุ่ม: เส้นเรียว / ◆ / เส้นบางขนาบ / กรอบคู่
4. พื้นหลังใช้ลายจุดหรือแสงแดงจาง ๆ (radial) — ไม่ใช้ตาราง/แผ่นเฉียง
5. ห่อด้วย `<Reveal>` / `<RevealGroup>`
6. ตรวจมือถือ (≤700px): หัวข้อ EN `9.5vw`, คอลัมน์เดียว
