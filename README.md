# FleshFall Discord Bot

RPG bot for the FleshFall (เมดเนื้อ) horror ARG world. TypeScript + discord.js v14.

- **Players:** [docs/how-to-play.md](docs/how-to-play.md) (Thai)
- **Lore & design notes:** `.claude/lore.md`, `.claude/game-design.md`
- **Dev conventions:** [CLAUDE.md](CLAUDE.md)

## Setup

1. https://discord.com/developers/applications → New Application → **Bot** → Reset Token → copy.
2. OAuth2 → URL Generator → scopes `bot` + `applications.commands` → permissions `Send Messages`, `Embed Links` → invite.
3. `cp .env.example .env`, fill `DISCORD_TOKEN`, `CLIENT_ID` (General Information → Application ID), `GUILD_ID` (Developer Mode → right-click server → Copy Server ID).
4. Run:

```bash
npm install
npm run deploy   # register slash commands (rerun when command definitions change)
npm run dev      # hot reload
npm run build && npm start   # production
```

## Commands

`/start` `/profile` `/inventory` `/use` `/equip` `/explore` `/travel` `/rest` `/pray` `/shop` `/buy` `/sell` `/cook` `/icons` `/roles` `/world` · admin: `/moon on|off|auto`, `/panel type:butchery|cafe|bar|paris` (posts a button menu in the current channel and locks it so players can only click; images in `assets/panels/`)

## Adding content

- Events: `src/game/events/{oldRealm,cypress,rougeLand,dungeons}.ts` — `resolve()` returns an `Outcome` (`hp, stamina, flesh, xp, humanity, sanity, miasma, items, mutation, enterDungeon, travel, unlockRougeLand`). Use `check('str'|'agi'|'int', dc)` and print `r.tag`.
- Items: `src/game/items.ts` · Roles: `src/game/roles.ts` · Icons: `src/game/icons.ts` · Balance: `src/config.ts`, `src/game/world.ts`
- Run `npm run typecheck` after changes.
