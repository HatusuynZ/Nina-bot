import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ApplicationCommandOptionType } from 'discord.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMMANDS_DIR = join(__dirname, '..', 'commands');

/**
 * Contrato de um comando (arquivo em commands/):
 *
 *   export default {
 *     name: 'ban',                   // minusculo, sem espaco (regra do Discord)
 *     aliases: ['banir'],            // so valem no prefixo, nao viram slash
 *     category: 'Moderação',
 *     description: 'bane um membro', // aparece na UI do Discord (max 100 chars)
 *     usage: '!ban @user [motivo]',
 *     permission: PermissionFlagsBits.BanMembers,   // null = livre
 *     slash: true,                   // padrao true; false = so prefixo
 *     options: [                     // ORDEM importa: e a posicao no modo texto
 *       { name: 'user', type: 'user', description: 'quem', required: true },
 *       { name: 'motivo', type: 'string', description: 'por que' },
 *     ],
 *     async execute(ctx) {}          // ctx normaliza mensagem e interacao
 *   }
 *
 * O loader cuida de: achar o arquivo, montar o slash, checar permissao,
 * capturar erro. O comando so escreve o que faz.
 */

const OPTION_TYPES = {
  string: ApplicationCommandOptionType.String,
  integer: ApplicationCommandOptionType.Integer,
  boolean: ApplicationCommandOptionType.Boolean,
  user: ApplicationCommandOptionType.User,
  channel: ApplicationCommandOptionType.Channel,
  role: ApplicationCommandOptionType.Role,
};

export const commands = new Map(); // name + aliases -> comando
export const commandList = []; // cada comando uma vez so

export async function loadCommands() {
  commands.clear();
  commandList.length = 0;

  let files;
  try {
    files = readdirSync(COMMANDS_DIR).filter((f) => f.endsWith('.js'));
  } catch (err) {
    console.error('[loader] nao consegui ler commands/:', err.message);
    return;
  }

  for (const file of files) {
    try {
      // pathToFileURL: no Windows, import() de caminho absoluto sem file:// quebra
      const mod = await import(pathToFileURL(join(COMMANDS_DIR, file)).href);
      const command = mod.default;

      if (!command?.name || typeof command.execute !== 'function') {
        console.error(`[loader] ${file} ignorado: falta 'name' ou 'execute'.`);
        continue;
      }
      if (commands.has(command.name)) {
        console.error(`[loader] ${file} ignorado: nome "${command.name}" duplicado.`);
        continue;
      }

      commands.set(command.name, command);
      for (const alias of command.aliases ?? []) {
        if (commands.has(alias)) {
          console.error(`[loader] alias "${alias}" de ${file} ja existe, pulei.`);
          continue;
        }
        commands.set(alias, command);
      }
      commandList.push(command);
    } catch (err) {
      console.error(`[loader] falhou ao carregar ${file}:`, err.message);
    }
  }

  console.log(`comandos carregados: ${commandList.length}`);
}

// Converte a definicao do comando no formato que a API do Discord espera.
function toSlashData(command) {
  return {
    name: command.name,
    description: (command.description ?? 'Sem descricao.').slice(0, 100),
    // Opcao obrigatoria tem que vir antes das opcionais, senao a API recusa.
    options: [...(command.options ?? [])]
      .sort((a, b) => Number(Boolean(b.required)) - Number(Boolean(a.required)))
      .map((o) => ({
        name: o.name,
        description: (o.description ?? o.name).slice(0, 100),
        type: OPTION_TYPES[o.type] ?? ApplicationCommandOptionType.String,
        required: Boolean(o.required),
      })),
    // null = so quem tem a permissao ve o comando na UI
    default_member_permissions: command.permission ? String(command.permission) : undefined,
    dm_permission: false,
  };
}

// Publica os slash commands. Sem guildId, publica global (demora ate 1h pra
// aparecer). Com guildId, e instantaneo — use em desenvolvimento.
export async function registerSlashCommands(client, guildId) {
  const data = commandList.filter((c) => c.slash !== false).map(toSlashData);

  try {
    if (guildId) {
      const guild = await client.guilds.fetch(guildId);
      await guild.commands.set(data);
      // Limpa os globais: senao eles convivem com os do servidor e o Discord
      // mostra cada comando DUAS vezes. Guild-only nao aceita duplicata global.
      await client.application.commands.set([]);
      console.log(`slash commands publicados no servidor ${guildId}: ${data.length} (globais limpos)`);
    } else {
      await client.application.commands.set(data);
      console.log(`slash commands publicados globalmente: ${data.length}`);
    }
  } catch (err) {
    console.error('[loader] falhou ao publicar slash commands:', err.message);
  }
}

// Roda o comando: checa permissao e nunca deixa erro subir pro client.
export async function runCommand(command, ctx) {
  if (command.guildOnly !== false && !ctx.guild) {
    await ctx.replyPrivate('Esse comando so funciona dentro de um servidor.').catch(() => {});
    return;
  }

  if (command.permission && !ctx.member?.permissions.has(command.permission)) {
    await ctx.replyPrivate('Voce nao tem permissao pra usar esse comando.').catch(() => {});
    return;
  }

  try {
    await command.execute(ctx);
  } catch (err) {
    console.error(`[cmd:${command.name}] erro:`, err);
    await ctx.replyPrivate('Deu erro ao executar esse comando.').catch(() => {});
  }
}
