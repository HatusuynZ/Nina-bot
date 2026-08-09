import { PermissionFlagsBits } from 'discord.js';
import { logModeration } from '../lib/logger.js';

export default {
  name: 'lock',
  category: 'Moderation',
  description: 'Lock a channel so no one can send messages',
  usage: '/lock [channel]',
  permission: PermissionFlagsBits.ManageChannels,
  options: [{ name: 'channel', type: 'channel', description: 'Which channel (default: here)' }],

  async execute(ctx) {
    const channel = ctx.getChannel('channel') ?? ctx.channel;
    if (!channel?.isTextBased?.()) {
      await ctx.replyPrivate('That is not a text channel.');
      return;
    }

    // Nega SendMessages pro @everyone: quem via o canal para de poder falar.
    await channel.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: false });

    await ctx.reply(`🔒 Locked ${channel}. No one can send until it's unlocked.`);
    await logModeration(ctx.guild, {
      action: '🔒 Channel locked',
      moderator: ctx.author.tag,
      extra: [{ name: 'Channel', value: `${channel}`, inline: true }],
    });
  },
};
