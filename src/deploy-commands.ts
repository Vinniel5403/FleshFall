import { REST, Routes } from 'discord.js';
import { commands } from './commands/index.js';
import { config } from './config.js';

const rest = new REST().setToken(config.token());
const body = commands.map((c) => c.data.toJSON());

const route = config.guildId
  ? Routes.applicationGuildCommands(config.clientId(), config.guildId)
  : Routes.applicationCommands(config.clientId());

await rest.put(route, { body });
console.log(`Registered ${body.length} commands ${config.guildId ? `to guild ${config.guildId}` : 'globally'}.`);
