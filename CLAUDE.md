# FleshFall Discord Bot

RPG Discord bot for the FleshFall (เมดเนื้อ) horror ARG world. TypeScript + discord.js v14, ESM (`"type": "module"`, NodeNext → imports use `.js` extensions).

## Read first
- `.claude/lore.md` — canon world summary (source of truth for content)
- `.claude/game-design.md` — how lore maps to mechanics, balance numbers, content rules
- `.claude/lore-source.txt` — full original Google Doc text (large; grep it, don't read whole)

## Commands
```bash
npm run dev        # tsx watch
npm run typecheck  # tsc --noEmit — run after every change
npm run deploy     # register slash commands (needed when command definitions change)
npm run api        # web API alone (http://localhost:3001/api, read-only player data)
npm run web:dev    # Next.js site (web/, http://localhost:3000, proxies /api → 3001)
npm run build && npm start
```
Env in `.env` (see `.env.example`): `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`, `DATA_FILE`.

## Layout
- `src/index.ts` interaction router · `src/deploy-commands.ts`
- `src/commands/` slash commands (register in `commands/index.ts`)
- `src/interactions/buttons.ts` button handlers (`ev:` event choice, `dg:` dungeon nav)
- `src/interactions/panels.ts` menu panels (`pn:` buttons, `pns:` selects; all replies ephemeral) · images `assets/panels/`
- `src/game/zones.ts` zones (city inside a region, e.g. paris ⊂ old_realm), timed travel (`TRAVEL_MINUTES`) · `src/game/hunt.ts` monsters + 3-monster hunts, door drops · `src/interactions/hunt.ts` hunt UI (`hn:`)
- Location channels (one category per continent, "Old Realm - <Continent>"): 50 cities from `CITIES` in zones.ts (7 continents × easy/normal/hard/epic). Discord caps 50 channels per category. Members with `Administrator` (and the server owner) bypass overwrites and see every city. Continent → main door (Europe gray/Loki, Asia orange/Beelzebub, America + South America blue/Belphegor, Africa green/Sophia, Australia yellow/Hastur, Antarctica white/Wendigo). Tier (`TIERS`) scales monster hp/dmg/AC/hit/xp/loot. Rouge Land/Cypress have no channel
- Travel picker = continent dropdown → city dropdown (`pns:travelc` then `pns:travel:<continent>`); `/travel` and `/panel` use autocomplete (>25 choices)
- New city = add a row to `CITIES` → gets a `/panel` entry + a `📍 <Name>` location role automatically (channel itself must be created + panel posted)
- `src/zoneRoles.ts` location roles: member holds only their current zone's role (none while traveling); zone channels visible only to that role. 15s tick resolves travel + syncs; every interaction also syncs
- God mode: Discord role `Dev` (env `GOD_ROLE`) → `src/game/god.ts` `isGod(char)`; refreshed per interaction in `index.ts`. Skips travel time/gates, shop/upgrade/cook costs, cooldowns, stamina, Closing Shift. Combat damage unchanged
- Expedition loop: Butchery 🗺️ ออกสำรวจ → pick city → arrive **instantly** (leaving Rouge Land is instant). City panel: hunt / explore / continent shop (`CONTINENT_STOCK`) / travel (city→city, `TRAVEL_MINUTES`) / 🏠 return to Rouge Land (`TRAVEL_MINUTES`). Hunt end offers ล่าต่อ / door / 🏠
- Rouge Land facilities (cafe/bar buy+sell, cook, drink, upgrade) require being home (`homeError` in actions.ts); continent shop requires standing in a city (`fieldError`). Panels tag field shop ids with `:field`. Profile/inventory/use/equip/rest/pray work anywhere. God bypasses home gate
- Icon dungeons (`src/game/blessings.ts`): each dungeon rolls on entry (`startRun` in engine.ts) — 5% if door = current continent's main color, 1% elsewhere (God 100%). Only Icon dungeons offer the shrine exit, of the DOOR's Icon (not the player's). Shrine = +1 blessing tier of that Icon (+2 for followers, max 5, permanent stat perk `BLESSING_PERK`). Sophia shrine also gives `sophia_rite` → `/revive @user` un-Fiends a friend
- `src/commands/actions.ts` shared actions (use/equip/buy/sell/cook/rest/pray) returning `ActionResult` — reuse from both slash commands and panels
- `src/game/` pure game logic — `types.ts`, `roles.ts`, `icons.ts`, `items.ts`, `world.ts`, `character.ts`, `engine.ts`, `events/`
- Monorepo (npm workspaces): bot = repo root, website = `web/` (`@fleshfall/web`, Next.js 16 App Router, React 19, Cache Components on). **Next 16 differs from training data — read `web/AGENTS.md` + `node_modules/next/dist/docs/` before changing web code.** Pages fetch client-side via `useApi` (`web/src/lib/api.ts`); `next.config.ts` rewrites `/api/*` → `FLESHFALL_API` (default http://localhost:3001). Types for API shapes live in `web/src/lib/types.ts` (keep in sync with `src/web/api.ts`)
- Web API: `src/web/server.ts` (node:http, JSON only) + `src/web/api.ts` (world/icons/roles/items/bestiary/leaderboard/status, read-only). Runs inside the bot when `API_PORT` is set; `src/web/standalone.ts` (`npm run api`) points the store at a temp file and reads the live db fresh (never writes it). Never expose Discord user ids
- Web images: `web/public/{background,asset,icons}` as **webp** with descriptive kebab-case names (≤2560px backgrounds, ≤1800px others). Carousel shows every file in `background/` sorted by name (`01-…`, `02-…`). Art registry: `web/src/lib/art.ts`, Icon art: `IconGallery.tsx`
- Known issue: `eslint` in web/ fails because root TypeScript 7 is hoisted and typescript-eslint rejects it; `next build` type-checks fine (web has its own TS 5)
- `src/db/store.ts` JSON file store (sync, atomic writes). Swap impl, keep API.

## Conventions
- In-game text is **Thai**; proper nouns (Icon names, M.A.I.D.S, Miasma, Rouge Land, Fiend) stay English.
- Game logic stays Discord-free (`src/game/`), so it can be smoke-tested offline with tsx.
- Event `resolve()` returns an `Outcome`; never mutate the character inside events. `applyOutcome` handles death / breakdown / Fiend.
- Never `await` between loading a character and saving it (store relies on sync load→mutate→save).
- Bump `CHAR_VERSION` in `types.ts` when the Character shape changes incompatibly (old saves are discarded).
- Only the 7 canon Icons. Skip the doc's "Secret Record" content.
