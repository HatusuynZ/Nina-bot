import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';

import {
  commands,
  commandList,
  loadCommands,
  registerSlashCommands,
  runCommand,
} from './lib/commandLoader.js';
import { contextFromMessage, contextFromInteraction } from './lib/context.js';
import { initLogger } from './lib/logger.js';
import { registerTicketHandlers } from './tickets.js';
import { registerWelcome } from './welcome.js';

// ---- knobs ----
const PREFIX = '!';
// Server where slash commands show up instantly. Empty = publish globally
// (correct in production, but takes up to 1h to propagate).
const DEV_GUILD_ID = process.env.DEV_GUILD_ID ?? '';
// ---------------

// Guard: a stray error must not take the whole bot down.
process.on('unhandledRejection', (reason) => {
  console.error('[guard] unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[guard] uncaught exception:', err);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers, // needs SERVER MEMBERS INTENT in the portal
  ],
});

const extras = { client, commands, commandList, prefix: PREFIX };

client.once('clientReady', async () => {
  console.log(`Bot online as ${client.user.tag}`);
  await registerSlashCommands(client, DEV_GUILD_ID);
});

// --- text commands (!ban) ---
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const name = args.shift()?.toLowerCase();
  if (!name) return;

  const command = commands.get(name);
  if (!command) return; // unknown: stay silent, don't spam the chat

  await runCommand(command, contextFromMessage(message, args, command, extras));
});

// --- slash commands (/ban) ---
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return; // buttons/menus handled by tickets.js

  const command = commands.get(interaction.commandName);
  if (!command) return;

  await runCommand(command, contextFromInteraction(interaction, command, extras));
});

initLogger(client);
registerTicketHandlers(client);
registerWelcome(client);

const token = process.env.DISCORD_TOKEN;
if (!token || token === 'COLE_O_TOKEN_AQUI') {
  console.error(
    'ERROR: DISCORD_TOKEN not set.\n' +
      '  - On Discloud: app panel > Variables > DISCORD_TOKEN > save > RESTART.\n' +
      '  - Local: put DISCORD_TOKEN=<token> in the .env file.'
  );
  process.exit(1);
}

await loadCommands();

// A login error is fatal: it must kill the process, not get swallowed by the
// guard above. If it stays alive, the app looks "running" with a dead bot —
// and AUTORESTART never kicks in.
try {
  await client.login(token);
} catch (err) {
  console.error('FATAL: could not log in to Discord:', err.message);
  await client.destroy().catch(() => {});
  process.exit(1);
}
