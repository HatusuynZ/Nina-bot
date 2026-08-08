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
import {
  loadResponses,
  watchResponses,
  stopWatching,
  handleAutoReply,
} from './lib/autoReply.js';
import { registerTicketHandlers } from './tickets.js';
import { registerWelcome } from './welcome.js';

// ---- knobs ----
const PREFIX = '!';
// Servidor onde os slash commands aparecem na hora. Vazio = publica global
// (correto em producao, mas leva ate 1h pra propagar).
const DEV_GUILD_ID = process.env.DEV_GUILD_ID ?? '';
// ---------------

// Blindagem: um erro solto nao pode derrubar o bot inteiro.
process.on('unhandledRejection', (reason) => {
  console.error('[guard] promise rejeitada sem tratamento:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[guard] excecao nao capturada:', err);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers, // exige SERVER MEMBERS INTENT no portal
  ],
});

const extras = { client, commands, commandList, prefix: PREFIX };

client.once('clientReady', async () => {
  console.log(`Bot online como ${client.user.tag}`);
  await registerSlashCommands(client, DEV_GUILD_ID);
});

// --- comandos por texto (!ban) ---
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  // Sem prefixo e conversa: a Nina decide se responde (e se tem paciencia).
  if (!message.content.startsWith(PREFIX)) {
    handleAutoReply(message);
    return;
  }

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const name = args.shift()?.toLowerCase();
  if (!name) return;

  const command = commands.get(name);
  if (!command) return; // desconhecido: silencio, nao poluir o chat

  await runCommand(command, contextFromMessage(message, args, command, extras));
});

// --- comandos por slash (/ban) ---
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return; // botao/menu: quem trata e o tickets.js

  const command = commands.get(interaction.commandName);
  if (!command) return;

  await runCommand(command, contextFromInteraction(interaction, command, extras));
});

registerTicketHandlers(client);
registerWelcome(client);

const token = process.env.DISCORD_TOKEN;
if (!token || token === 'COLE_O_TOKEN_AQUI') {
  console.error(
    'ERRO: DISCORD_TOKEN nao configurado.\n' +
      '  - Na Discloud: painel da aplicacao > Variaveis > DISCORD_TOKEN > salvar > REINICIAR.\n' +
      '  - No PC local: coloque DISCORD_TOKEN=<token> no arquivo .env.'
  );
  process.exit(1);
}

loadResponses();
watchResponses();
await loadCommands();

// Erro no login e fatal: precisa matar o processo, e nao ser engolido pela
// blindagem la em cima. Se ficar vivo, a aplicacao parece "rodando" com o bot
// morto — e o AUTORESTART nunca entra.
try {
  await client.login(token);
} catch (err) {
  console.error('ERRO FATAL: nao consegui logar no Discord:', err.message);
  stopWatching();
  await client.destroy().catch(() => {});
  process.exit(1);
}
