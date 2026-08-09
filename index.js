import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';

import {
  commands,
  commandList,
  loadCommands,
  registerSlashCommands,
  runCommand,
} from './lib/commandLoader.js';
import { contextFromInteraction } from './lib/context.js';
import { initLogger } from './lib/logger.js';
import { initDb } from './lib/db.js';
import { handleXp, startLeveling, stopLeveling } from './lib/leveling.js';
import { registerTicketHandlers } from './tickets.js';
import { registerWelcome } from './welcome.js';

// ---- knobs ----
// Server where slash commands show up instantly. Empty = publish globally
// (correct in production, but takes up to 1h to propagate).
const DEV_GUILD_ID = process.env.DEV_GUILD_ID ?? '';
// Kept only for the /help display; there is no text-prefix dispatch anymore.
const DISPLAY_PREFIX = '/';
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
    GatewayIntentBits.MessageContent, // logger needs content of deleted/edited msgs
    GatewayIntentBits.GuildMembers, // needs SERVER MEMBERS INTENT in the portal
  ],
});

const extras = { client, commands, commandList, prefix: DISPLAY_PREFIX };

client.once('clientReady', async () => {
  console.log(`Bot online as ${client.user.tag}`);
  await registerSlashCommands(client, DEV_GUILD_ID);
});

// Messages are ONLY for XP now — commands come through slash.
client.on('messageCreate', (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  handleXp(message).catch((err) => console.error('[xp]', err.message));
});

// Slash commands (/ban, /rank, ...)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return; // buttons/menus handled by tickets.js

  const command = commands.get(interaction.commandName);
  if (!command) return;

  await runCommand(command, contextFromInteraction(interaction, command, extras));
});

initLogger(client);
registerTicketHandlers(client);
registerWelcome(client);

// Flush level XP and close things cleanly when Discloud restarts the app.
async function shutdown() {
  await stopLeveling();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

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
await initDb(); // no-op if MONGO_URL isn't set; leveling just stays off
startLeveling();

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
