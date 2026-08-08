import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { SERVER_TEMPLATE, createChannel } from '../lib/serverTemplate.js';

export default {
  name: 'reset',
  category: 'Servidor',
  description: 'APAGA todos os canais e recria a estrutura do zero',
  usage: '!reset confirmar',
  permission: PermissionFlagsBits.ManageChannels,
  options: [
    {
      name: 'confirmar',
      type: 'string',
      description: 'Escreva exatamente: confirmar',
      required: true,
    },
  ],

  async execute(ctx) {
    const guild = ctx.guild;
    const me = await guild.members.fetchMe();
    if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await ctx.replyPrivate('Eu nao tenho a permissao **Gerenciar Canais**.');
      return;
    }

    // Trava de confirmacao: isso apaga mensagem de todo mundo, pra sempre.
    if (ctx.getString('confirmar') !== 'confirmar') {
      await ctx.replyPrivate(
        'ATENCAO: isso **apaga todos os canais** do servidor (e todas as mensagens deles) e recria a estrutura do zero. Nao da pra desfazer.\n' +
          'Se tem certeza: `!reset confirmar`'
      );
      return;
    }

    await ctx.defer();
    await ctx.reply('Apagando canais e recriando a estrutura...');

    for (const channel of [...guild.channels.cache.values()]) {
      try {
        await channel.delete('Reset do servidor');
      } catch (err) {
        console.error(`[reset] nao consegui apagar "${channel.name}":`, err.message);
      }
    }

    let firstText = null;
    for (const group of SERVER_TEMPLATE) {
      const category = await guild.channels.create({
        name: group.category,
        type: ChannelType.GuildCategory,
      });
      for (const spec of group.channels) {
        const created = await createChannel(guild, spec, category.id);
        if (!firstText && created?.type !== ChannelType.GuildVoice) firstText = created;
      }
    }

    await firstText?.send('Estrutura recriada do zero.');
  },
};
