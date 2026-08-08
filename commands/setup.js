import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { SERVER_TEMPLATE, createChannel } from '../lib/serverTemplate.js';

export default {
  name: 'setup',
  category: 'Servidor',
  description: 'Cria a estrutura de canais (pula o que ja existe, nao apaga nada)',
  usage: '!setup',
  permission: PermissionFlagsBits.ManageChannels,

  async execute(ctx) {
    const guild = ctx.guild;
    const me = await guild.members.fetchMe();
    if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await ctx.replyPrivate('Eu nao tenho a permissao **Gerenciar Canais**.');
      return;
    }

    // criar dezenas de canais estoura os 3s de resposta do slash
    await ctx.defer();
    await ctx.reply('Criando a estrutura do servidor...');

    let created = 0;
    let skipped = 0;

    for (const group of SERVER_TEMPLATE) {
      let category = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name === group.category
      );
      if (category) {
        skipped++;
      } else {
        category = await guild.channels.create({
          name: group.category,
          type: ChannelType.GuildCategory,
        });
        created++;
      }

      for (const spec of group.channels) {
        const exists = guild.channels.cache.find(
          (c) => c.name === spec.name && c.parentId === category.id
        );
        if (exists) {
          skipped++;
          continue;
        }
        await createChannel(guild, spec, category.id);
        created++;
      }
    }

    await ctx.reply(`Pronto. Criei ${created} item(ns) e pulei ${skipped} que ja existiam.`);
  },
};
