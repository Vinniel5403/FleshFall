import { Client, Events, GatewayIntentBits, MessageFlags, type Interaction } from 'discord.js';
import { commandMap } from './commands/index.js';
import { config } from './config.js';
import { setGod } from './game/god.js';
import { startZoneSync, syncMember } from './zoneRoles.js';
import { db } from './db/index.js';
import { startApi } from './web/server.js';
import { handleDungeonButton, handleEventButton } from './interactions/buttons.js';
import { handleHuntButton } from './interactions/hunt.js';
import { handlePanelButton, handlePanelSelect } from './interactions/panels.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

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
  setGod(i.user.id, !!god && i.member.roles.cache.has(god.id));
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
if (process.env.API_PORT) startApi(Number(process.env.API_PORT), () => db.allCharacters());

client.login(config.token());
