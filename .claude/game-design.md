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
Door discovery events in Old Realm → `run {door, depth, maxDepth, stage}`. Most explores find nothing: 80% overall (`balance.exploreEmptyChance`, stamina still spent — was 0% and players spammed explore for loot). Doors are rare: an explore finds a door 1% of the time (`balance.exploreDoorChance`, own roll — was 8%, and ~45% before that when doors shared the event weights); the red door counts as one of them and every colour is equally likely (≈0.13% each at Lv 3+, 0.2% at Lv 1–2 where white/blue/purple are still hidden; hunts are the main way to find doors). A hunt win shows an Icon door 20% (`huntDoorChance`). Each room: 1 stamina (or 3 hp if exhausted); white door +3 hp/room. The door's guardian (boss room) waits in the last room of only 20% of runs (`balance.dungeonBossChance`, rolled on entry into `run.boss`); otherwise the last room is one more ordinary room. A run never shows the same room twice (`run.seen`). Each door has 5–6 ordinary rooms + 1 guardian. Then exit: black (→Old Realm), red (→Cypress), and — Icon dungeons only — the door Icon's shrine (big humanity/sanity/xp + a blessing tier, see Feedback pass).
Retreat rules per door (`DUNGEON_RULES` in `src/game/world.ts`): yellow/white locked, orange must feed flesh, gray time loss, others free.

## Icons → mods (`src/game/icons.ts`)
Beelzebub regen x2 + flesh feast, humanity loss x1.5 · Hastur AGI+2 + hints, sanity loss x1.5 · Loki 35% reroll failed checks, -2 humanity each · Belphegor +4 checks under 30% HP, -3 max HP per death · Sophia HP regen, keep flesh on death, mutation per level · Thanatos Miasma immune, STR+2, rest gives no HP · Wendigo -2 dmg, sanity loss x0.5, items x1.5, max stamina -2, rest x0.5.

## Roles → perks (`src/game/roles.ts`)
Maid: sell +50%, flesh-eating humanity loss halved, Grade D→A by level (5/10/15). Hound: STR+1 outside Rouge Land, hunt flesh +25%. Bar: `/cook` never fails + bonus portion, Closing Shift 1 hour/day (hash of userId, Bangkok time). Patron: 120 flesh, buy -25%. Outsider: humanity 100, vintage items. Survivor: sees hints, Miasma halved.

## Crimson Moon
Every 5th day 21:00–02:59 Bangkok. Crimson-only events; sanity loss x1.5 outside Rouge Land. Override: env `CRIMSON_MOON=on|off|auto` or admin `/moon` (runtime, resets to env on restart).

## Expedition (extraction) — 2026-11-13
One inventory. Loot found on an expedition round (leave Rouge Land → return) is pending and only handed over at home; die before that and you get nothing from that round (inventory is never touched). Each hunt won on the trip = +1 depth: loot +15%/step (cap 8), rare drops +3%/step, but Miasma 2×(depth−1) per new hunt and monster dmg +depth/2. Choice every hunt: ล่าต่อ or 🏠 กลับ. Field merchants pay 70%. Outsiders who haven't reached Rouge Land carry loot directly (no home).

## Levels, cities & hunt scaling — 2026-11-20
Level is relative to the place. Each city has a level (easy 1–3, normal 4–6, hard 8–10, epic 12, Australia 14, Antarctica 16) and every monster hunted there is that level; the hunter's own level never changes them, so out-levelling a city makes it trivial (that is the point of levelling) and walking into a higher one is a real risk (warning only, never locked).
- To-hit both ways = `levelDC`: d20 + mod > 10 + log1.2(defender lv / attacker lv). Player mod = half STR (rounded up); monsters roll a plain d20 against that + half AGI (max 5).
- Monster numbers are written at Lv 1 and grow per city level: hp +20%, dmg +15%, xp +25%, meat/supplies +15% (was +10% until 2026-11-21).
- Player damage = d6 + level/2 + weapon + STR/2. Level-up still gives +4 max HP and +1 main stat.
- XP: a monster 3+ levels below you pays half, 6+ pays a fifth; above you +10% per level (max +50%). At-level ≈ 2.5–3.5 hunts per level all the way up.
- Measured with the real code (typical gear, no healing, no streak): at-level 85–100% wins losing 20–55% HP; one level under 40–85%; two under 0–65%; over by 4 loses under 20% HP. Lv 1 starters in a Lv 1 city: Survivor/Hound/Maid ~98–100%, Patron 90%, Bar 78%, Outsider 69% — Lv 2 fixes it.

## Hunt drops — 2026-11-20
Per kill: the body (meat piles scale with city level + streak; gear/relics always one) · 10% a local good of the continent · 2/3/5/7% gear that fits the tier (hard/epic include drop-only pieces) · 1% the decoration piece that monster kind guards. Per hunt won (searching the place): 8% a small real-world relic, 2/3/4/6% by tier (+1% per streak step) a room-decoration piece — 16 common ones anywhere plus three per continent, each 3× as likely there (local pieces ≈ 36% of finds). Roughly one decoration per 20 hunts in easy cities, one per 11 in epic. Gear ladder: weapons atk 1–8 (24), armor def 1–6 (16); top shop piece atk 5 / def 4, atk 6–8 / def 5–6 drop-only in hard/epic. Decoration pieces are vintage items (sell at full value, tradeable); each becomes placeable room furniture once its art is painted (`assets/rooms-src`) and the item gets its `furniture` id.

## Feedback pass — 2026-11-21
From the first batch of player feedback. Numbers live in `balance` / `TIER_GEAR` / `items.ts` so they can be tuned.
- **Higher cities pay more.** Meat/supply piles +15% per city level (was +10%); tier gear 2/3/5/7% per kill (was 2/2.5/3/3%), and hard/epic tables carry pieces no shop sells: 🪓 butcher_cleaver (atk 6), ⚔️ knight_sword (atk 7), 🥋 fiend_hide (def 5), 🧨 flesh_grenade, 💉 fiend_adrenal. Measured haul (shop value per hunt won): Lv 1 ≈ 58 · Lv 4 ≈ 73 · Lv 6 ≈ 114 · Lv 8 ≈ 151 · Lv 12 ≈ 256; XP 22 → 164. A drop-only piece ≈ every 14 hunts in hard cities, every 7 in epic.
- **Temporary buffs without a cook.** 🍶 rage_tonic (STR +1, 20 min) and 🧴 hide_tonic (damage −1, 20 min), 28 flesh, butchery + some continent shops — half a Bar dish, and a Maid can't serve them (serving is for cooked dishes only). 💉 fiend_adrenal = STR +3 for 30 min at humanity −2, drop-only. Still one buff at a time.
- **Thrown items (AoE).** 💣 bone_bomb 6–10 and 🧨 flesh_grenade 14–20 (+ level/2) to every monster in the hunt, no roll, used from the hunt 🎒 instead of attacking; survivors strike back. A bomb costs more than an easy hunt pays, so it is an emergency button, not a farm tool: two levels under a city it lifts the win rate roughly 80 → 92% (normal) and 8 → 42% (Lv 1 in a Lv 3 city).
- **Dungeons vary.** Guardian 20% of runs (the player asked for 5% — raise/lower `dungeonBossChance`), no repeated room in a run, 22 new rooms (3 per door, 4 for white).
- **Blessings cost an offering.** Icon dungeons stay rare (1.5% home colour / 0.3% elsewhere — the "too easy" report came from a Dev account, where it is forced to 100%). The shrine now takes `shrineSigilPerTier` (1) × current tier 🔯 sigils before raising a tier: first blessing free, 0→5 = 10 sigils (6 for the Icon's own follower, who still gains two tiers per offering). No sigils = the visit still heals and pays XP, the tier just doesn't move. Dev accounts pay too.
- **The sigil has a use.** It is the shrine offering, and can be used on its own for สติ +6 / ความเป็นมนุษย์ +4. Sources: butchery, Asia/Africa shops, heretics (12%), shifting Fiends (20%), hard-tier gear table, two dungeon rooms.
- **Cooking shows what the dish does** everywhere a recipe is listed (`itemEffects`).
- **Selling to NPCs** already existed (Cafe 50%, relics 100%, Maid ×1.5, field merchant 70%, Patron buy orders); the inventory view now carries the sell buttons so it can be found.

## Role economy — 2026-11-13
Hound hunts 🫀 เนื้อล่าสด (raw = humanity −5) → only Bar Staff cook buff dishes (+2 STR/AGI/INT or −2 dmg, 45 min) → Maid `/serve` makes them +1 stronger / 1.5× longer and earns tips (Patron ×2) → Patron posts buy orders on the player market (fillers get +20% tip, 6 order slots). Market lives in Rouge Land, escrowed, 3-day expiry.

## Content rules
- Only the 7 canon Icons. No custom Icons.
- Don't use the doc's "Secret Record" (gestation ritual) in content.
- Event text: Thai, horror tone, short. Check results show `${r.tag}`.
- Add events in `src/game/events/*.ts`; ids must be unique (checked at startup).
