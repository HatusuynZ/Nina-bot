import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { SERVER_TEMPLATE, createChannel } from '../lib/serverTemplate.js';

export default {
  name: 'reset',
  category: 'Server',
  description: 'DELETE every channel and rebuild the structure from scratch',
  usage: '!reset confirm',
  permission: PermissionFlagsBits.ManageChannels,
  options: [
    { name: 'confirm', type: 'string', description: 'Type exactly: confirm', required: true },
  ],

  async execute(ctx) {
    const guild = ctx.guild;
    const me = await guild.members.fetchMe();
    if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await ctx.replyPrivate("I don't have the **Manage Channels** permission.");
      return;
    }

    // Confirmation guard: this deletes everyone's messages, forever.
    if (ctx.getString('confirm') !== 'confirm') {
      await ctx.replyPrivate(
        'WARNING: this **deletes every channel** (and all their messages) and rebuilds the ' +
          "structure from scratch. It can't be undone.\n" +
          'If you are sure: `!reset confirm`'
      );
      return;
    }

    await ctx.defer();
    await ctx.reply('Deleting channels and rebuilding the structure...');

    for (const channel of [...guild.channels.cache.values()]) {
      try {
        await channel.delete('Server reset');
      } catch (err) {
        console.error(`[reset] couldn't delete "${channel.name}":`, err.message);
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

    await firstText?.send('Structure rebuilt from scratch.');
  },
};
