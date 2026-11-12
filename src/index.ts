import { Client, Events, GatewayIntentBits, MessageFlags, PermissionFlagsBits, type Interaction } from 'discord.js';
import { commandMap } from './commands/index.js';
import { config } from './config.js';
import { setDev } from './game/dev.js';
import { startZoneSync, syncMember } from './zoneRoles.js';
import { db } from './db/index.js';
import { startApi } from './web/server.js';
import type { GuildGate } from './web/account.js';
import { loadCharacter } from './game/character.js';
import { handleDungeonButton, handleEventButton } from './interactions/buttons.js';
import { handleHuntButton } from './interactions/hunt.js';
import { handlePanelButton, handlePanelSelect } from './interactions/panels.js';

/** Kick members who join without a website character (needs the privileged Server Members intent). */
const REQUIRE_CHARACTER = process.env.REQUIRE_CHARACTER === '1';
const WEB_URL = process.env.WEB_URL ?? 'https://fleshfall.org';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, ...(REQUIRE_CHARACTER ? [GatewayIntentBits.GuildMembers] : [])],
});

// Characters are created on the website, which adds the player to the guild (OAuth guilds.join).
// Anyone arriving another way without a character gets the link and is removed.
client.on(Events.GuildMemberAdd, async (m) => {
  if (!REQUIRE_CHARACTER || m.user.bot || m.guild.id !== config.guildId) return;
  if (loadCharacter(m.id) || m.permissions.has(PermissionFlagsBits.Administrator)) return;
  await m.send(`🩸 FleshFall ต้องสร้างตัวละครบนเว็บก่อนเข้าเซิร์ฟ → ${WEB_URL}/create`).catch(() => {});
  await m.kick('no FleshFall character').catch((e) => console.warn('kick failed', (e as Error).message));
});

client.once(Events.ClientReady, (c) => {
  console.log(`🩸 FleshFall online as ${c.user.tag}`);
  void startZoneSync(c);
});

/** Role name that grants god mode (env GOD_ROLE, default "Dev"). */
const GOD_ROLE = process.env.GOD_ROLE ?? 'Dev';

/** Mirror the member's God role into game state before handling. */
function refreshGod(i: Interaction): void {
  if (!i.inCachedGuild()) return;
  const god = i.guild.roles.cache.find((r) => r.name === GOD_ROLE);
  setDev(i.user.id, !!god && i.member.roles.cache.has(god.id));
}

client.on(Events.InteractionCreate, async (i: Interaction) => {
  try {
    refreshGod(i);
    if (i.isChatInputCommand()) {
      await commandMap.get(i.commandName)?.execute(i);
    } else if (i.isAutocomplete()) {
      await commandMap.get(i.commandName)?.autocomplete?.(i);
    } else if (i.isButton()) {
      if (i.customId.startsWith('ev:')) await handleEventButton(i);
      else if (i.customId.startsWith('dg:')) await handleDungeonButton(i);
      else if (i.customId.startsWith('pn:')) await handlePanelButton(i);
      else if (i.customId.startsWith('hn:')) await handleHuntButton(i);
    } else if (i.isStringSelectMenu()) {
      if (i.customId.startsWith('pns:')) await handlePanelSelect(i);
    }
    if (!i.isAutocomplete()) void syncMember(i.user.id).catch(() => {});
  } catch (err) {
    console.error('Interaction error:', err);
    if (i.isRepliable()) {
      const msg = { content: '💀 Something went wrong.', flags: MessageFlags.Ephemeral } as const;
      if (i.replied || i.deferred) await i.followUp(msg).catch(() => {});
      else await i.reply(msg).catch(() => {});
    }
  }
});

// Web API runs inside the bot when API_PORT is set (live data). Otherwise use `npm run api`.
// /api/account/* (website character creation) needs API_SECRET + GUILD_ID.
if (process.env.API_PORT) {
  const guildId = config.guildId;
  const gate: GuildGate | undefined = guildId
    ? {
        guildId,
        async join(userId, accessToken, nick) {
          const guild = await client.guilds.fetch(guildId);
          await guild.members.add(userId, { accessToken, nick });
          void syncMember(userId).catch(() => {});
        },
        async isMember(userId) {
          const guild = await client.guilds.fetch(guildId);
          return guild.members.fetch(userId).then(() => true, () => false);
        },
      }
    : undefined;
  if (process.env.API_SECRET && !gate) console.warn('API_SECRET set but GUILD_ID missing — account api disabled');
  startApi(Number(process.env.API_PORT), { players: () => db.allCharacters(), gate, secret: process.env.API_SECRET });
}

client.login(config.token());
