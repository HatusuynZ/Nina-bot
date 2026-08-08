import { EmbedBuilder } from 'discord.js';

// Ordem em que as categorias aparecem. Categoria nao listada vai pro fim.
const CATEGORY_ORDER = ['Moderação', 'Servidor', 'Geral'];

export default {
  name: 'help',
  aliases: ['comandos', 'ajuda'],
  category: 'Geral',
  description: 'mostra todos os comandos',
  usage: '!help [comando]',
  permission: null,

  async execute({ message, args, commands, commandList, prefix }) {
    // !help <comando> -> detalhe de um comando so
    if (args[0]) {
      const found = commands.get(args[0].toLowerCase());
      if (!found) {
        await message.reply(`Nao existe comando \`${args[0]}\`. Use \`${prefix}help\`.`);
        return;
      }
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`${prefix}${found.name}`)
        .setDescription(found.description ?? 'Sem descricao.')
        .addFields({ name: 'Como usar', value: `\`${found.usage ?? prefix + found.name}\`` });
      if (found.aliases?.length) {
        embed.addFields({
          name: 'Tambem responde por',
          value: found.aliases.map((a) => `\`${prefix}${a}\``).join(', '),
        });
      }
      if (found.permission) {
        embed.setFooter({ text: 'Exige permissao de moderacao no Discord.' });
      }
      await message.channel.send({ embeds: [embed] });
      return;
    }

    // Lista completa, agrupada por categoria. Monta sozinha a partir dos
    // arquivos em commands/ — nao existe lista escrita na mao pra desatualizar.
    const byCategory = new Map();
    for (const command of commandList) {
      const category = command.category ?? 'Outros';
      if (!byCategory.has(category)) byCategory.set(category, []);
      byCategory.get(category).push(command);
    }

    const sortedCategories = [...byCategory.keys()].sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a);
      const ib = CATEGORY_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📖 Comandos da Nina')
      .setDescription(`Prefixo: \`${prefix}\` · detalhe de um: \`${prefix}help <comando>\``);

    for (const category of sortedCategories) {
      const lines = byCategory
        .get(category)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => `\`${c.usage ?? prefix + c.name}\` — ${c.description ?? ''}`)
        .join('\n');
      embed.addFields({ name: category, value: lines });
    }

    embed.setFooter({ text: 'Comandos de moderacao exigem a permissao equivalente no Discord.' });
    await message.channel.send({ embeds: [embed] });
  },
};
