import { EmbedBuilder } from 'discord.js';

// Ordem das categorias no embed. Categoria fora da lista vai pro fim.
const CATEGORY_ORDER = ['Moderação', 'Servidor', 'Geral'];

export default {
  name: 'help',
  aliases: ['comandos', 'ajuda'],
  category: 'Geral',
  description: 'Mostra todos os comandos',
  usage: '!help [comando]',
  permission: null,
  options: [{ name: 'comando', type: 'string', description: 'Detalhe de um comando so' }],

  async execute(ctx) {
    const { commands, commandList, prefix } = ctx;
    const wanted = ctx.getString('comando');

    // detalhe de um comando
    if (wanted) {
      const found = commands.get(wanted.toLowerCase());
      if (!found) {
        await ctx.replyPrivate(`Nao existe comando \`${wanted}\`. Use \`${prefix}help\`.`);
        return;
      }
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`${prefix}${found.name}`)
        .setDescription(found.description ?? 'Sem descricao.')
        .addFields({ name: 'Como usar', value: `\`${found.usage ?? prefix + found.name}\`` });

      if (found.options?.length) {
        embed.addFields({
          name: 'Argumentos',
          value: found.options
            .map((o) => `\`${o.name}\`${o.required ? ' (obrigatorio)' : ''} — ${o.description}`)
            .join('\n'),
        });
      }
      if (found.aliases?.length) {
        embed.addFields({
          name: 'Tambem responde por',
          value: found.aliases.map((a) => `\`${prefix}${a}\``).join(', '),
        });
      }
      if (found.permission) {
        embed.setFooter({ text: 'Exige permissao de moderacao no Discord.' });
      }
      await ctx.reply({ embeds: [embed] });
      return;
    }

    // Lista completa. Monta a partir dos arquivos carregados — nao existe
    // lista escrita na mao pra desatualizar.
    const byCategory = new Map();
    for (const command of commandList) {
      const category = command.category ?? 'Outros';
      if (!byCategory.has(category)) byCategory.set(category, []);
      byCategory.get(category).push(command);
    }

    const sorted = [...byCategory.keys()].sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a);
      const ib = CATEGORY_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📖 Comandos da Nina')
      .setDescription(
        `Funciona com \`/\` ou com \`${prefix}\` · detalhe de um: \`${prefix}help <comando>\``
      );

    for (const category of sorted) {
      const lines = byCategory
        .get(category)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => `\`${c.usage ?? prefix + c.name}\` — ${c.description ?? ''}`)
        .join('\n');
      embed.addFields({ name: category, value: lines });
    }

    embed.setFooter({ text: 'Comandos de moderacao exigem a permissao equivalente no Discord.' });
    await ctx.reply({ embeds: [embed] });
  },
};
