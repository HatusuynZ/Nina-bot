import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMMANDS_DIR = join(__dirname, '..', 'commands');

/**
 * Contrato de um comando (arquivo em commands/):
 *
 *   export default {
 *     name: 'ban',                        // sem o prefixo
 *     aliases: ['banir'],                 // opcional
 *     category: 'Moderação',              // agrupa no !help
 *     description: 'bane um membro',      // linha do !help
 *     usage: '!ban @user [motivo]',       // mostrado no !help e no erro de uso
 *     permission: PermissionFlagsBits.BanMembers,  // null = qualquer um usa
 *     guildOnly: true,                    // padrao true
 *     async execute(ctx) {}               // ctx = { message, args, client, commands }
 *   }
 *
 * O loader cuida de: achar o arquivo, checar a permissao, e capturar erro.
 * O comando so escreve o que ele faz de fato.
 */

// name/alias -> comando. O mesmo objeto aparece sob varios nomes.
export const commands = new Map();
// so os comandos, uma vez cada (pro !help nao listar alias como se fosse comando)
export const commandList = [];

export async function loadCommands() {
  commands.clear();
  commandList.length = 0;

  let files;
  try {
    files = readdirSync(COMMANDS_DIR).filter((f) => f.endsWith('.js'));
  } catch (err) {
    console.error('[loader] nao consegui ler a pasta commands/:', err.message);
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
        console.error(`[loader] ${file} ignorado: o nome "${command.name}" ja existe.`);
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

// Roda o comando: checa permissao e nunca deixa um erro subir pro client.
export async function runCommand(command, ctx) {
  const { message } = ctx;

  if (command.guildOnly !== false && !message.guild) {
    message.reply('Esse comando so funciona dentro de um servidor.').catch(() => {});
    return;
  }

  if (command.permission && !message.member?.permissions.has(command.permission)) {
    message.reply('Voce nao tem permissao pra usar esse comando.').catch(() => {});
    return;
  }

  try {
    await command.execute(ctx);
  } catch (err) {
    console.error(`[cmd:${command.name}] erro:`, err);
    message.reply('Deu erro ao executar esse comando. Olha o console.').catch(() => {});
  }
}
