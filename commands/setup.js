import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { SERVER_TEMPLATE, createChannel } from '../lib/serverTemplate.js';

export default {
  name: 'setup',
  category: 'Servidor',
  description: 'cria a estrutura de canais (pula o que ja existe, nao apaga nada)',
  usage: '!setup',
  permission: PermissionFlagsBits.ManageChannels,

  async execute({ message }) {
    const guild = message.guild;
    const me = await guild.members.fetchMe();
    if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await message.reply('Eu nao tenho a permissao **Gerenciar Canais**.');
      return;
    }

    const status = await message.channel.send('Criando a estrutura do servidor...');
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

    await status.edit(`Pronto. Criei ${created} item(ns) e pulei ${skipped} que ja existiam.`);
  },
};
