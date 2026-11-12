# FleshFall Bot — Game Design (lore → mechanics)

Decisions (user, 2026-11-09): in-game text **Thai** (proper nouns English: Icon names, M.A.I.D.S, Miasma, Rouge Land…). Character = **Role + Icon**.

## Resources
| Field | Thai | Meaning |
|---|---|---|
| `hp` | เนื้อกาย | body flesh; 0 = death |
| `stamina` | แรง | explore/dungeon cost; regen +1/5min |
| `humanity` | ความเป็นมนุษย์ 0–100 | 0 = **Fiend** (character over, `/start` again) |
| `sanity` | สติ 0–100 | 0 = breakdown (lose an item stack, humanity -5); <30 = -2 all checks |
| `flesh` | เนื้อสด | currency |

Stats: `str` พละ, `agi` ว่องไว, `int` สัมผัส. Check = d20 + stat + floor(level/3) (+weapon on STR) + icon/role bonus vs DC. Nat 20/1 auto.

## Locations
`old_realm` ↔ `cypress` ↔ `rouge_land`.
- Outsider starts Old Realm, `reachedRougeLand=false`. Must find red door (event or dungeon exit) → Cypress → ferryman (visible only humanity ≤ 60; pay vintage item or own flesh) → unlock. 🏠 to Rouge Land is blocked until unlocked; reaching Lv `balance.rougeLandUnlockLevel` (10) also unlocks it.
- Residents (maid/hound/bar/patron) start Rouge Land; survivor starts Old Realm but already unlocked. Unlocked chars `/travel` freely.
- Old Realm explore costs +1 hp (body mass drains). Rest in Old Realm: no HP.

## Dungeons
Door discovery events in Old Realm → `run {door, depth, maxDepth, stage}`. Each room: 1 stamina (or 3 hp if exhausted); white door +3 hp/room. Last room = boss event. Then exit: black (→Old Realm), red (→Cypress), own-Icon colored door (shrine: big humanity/sanity/xp).
Retreat rules per door (`DUNGEON_RULES` in `src/game/world.ts`): yellow/white locked, orange must feed flesh, gray time loss, others free.

## Icons → mods (`src/game/icons.ts`)
Beelzebub regen x2 + flesh feast, humanity loss x1.5 · Hastur AGI+2 + hints, sanity loss x1.5 · Loki 35% reroll failed checks, -2 humanity each · Belphegor +4 checks under 30% HP, -3 max HP per death · Sophia HP regen, keep flesh on death, mutation per level · Thanatos Miasma immune, STR+2, rest gives no HP · Wendigo -2 dmg, sanity loss x0.5, items x1.5, max stamina -2, rest x0.5.

## Roles → perks (`src/game/roles.ts`)
Maid: sell +50%, flesh-eating humanity loss halved, Grade D→A by level (5/10/15). Hound: STR+1 outside Rouge Land, hunt flesh +25%. Bar: `/cook` never fails + bonus portion, Closing Shift 1 hour/day (hash of userId, Bangkok time). Patron: 120 flesh, buy -25%. Outsider: humanity 100, vintage items. Survivor: sees hints, Miasma halved.

## Crimson Moon
Every 5th day 21:00–02:59 Bangkok. Crimson-only events; sanity loss x1.5 outside Rouge Land. Override: env `CRIMSON_MOON=on|off|auto` or admin `/moon` (runtime, resets to env on restart).

## Expedition (extraction) — 2026-11-13
One inventory. Loot found on an expedition round (leave Rouge Land → return) is pending and only handed over at home; die before that and you get nothing from that round (inventory is never touched). Each hunt won on the trip = +1 depth: loot +15%/step (cap 8), rare drops +3%/step, but Miasma 2×(depth−1) per new hunt and monster dmg +depth/2. Choice every hunt: ล่าต่อ or 🏠 กลับ. Field merchants pay 70%. Outsiders who haven't reached Rouge Land carry loot directly (no home).

## Role economy — 2026-11-13
Hound hunts 🫀 เนื้อล่าสด (raw = humanity −5) → only Bar Staff cook buff dishes (+2 STR/AGI/INT or −2 dmg, 45 min) → Maid `/serve` makes them +1 stronger / 1.5× longer and earns tips (Patron ×2) → Patron posts buy orders on the player market (fillers get +20% tip, 6 order slots). Market lives in Rouge Land, escrowed, 3-day expiry.

## Content rules
- Only the 7 canon Icons. No custom Icons.
- Don't use the doc's "Secret Record" (gestation ritual) in content.
- Event text: Thai, horror tone, short. Check results show `${r.tag}`.
- Add events in `src/game/events/*.ts`; ids must be unique (checked at startup).
