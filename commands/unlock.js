import { PermissionFlagsBits } from 'discord.js';
import { logModeration } from '../lib/logger.js';

export default {
  name: 'unlock',
  category: 'Moderation',
  description: 'Unlock a channel that was locked',
  usage: '/unlock [channel]',
  permission: PermissionFlagsBits.ManageChannels,
  options: [{ name: 'channel', type: 'channel', description: 'Which channel (default: here)' }],

  async execute(ctx) {
    const channel = ctx.getChannel('channel') ?? ctx.channel;
    if (!channel?.isTextBased?.()) {
      await ctx.replyPrivate('That is not a text channel.');
      return;
    }

    // null volta pro neutro: o canal herda de novo o padrao do @everyone.
    await channel.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: null });

    await ctx.reply(`🔓 Unlocked ${channel}.`);
    await logModeration(ctx.guild, {
      action: '🔓 Channel unlocked',
      moderator: ctx.author.tag,
      extra: [{ name: 'Channel', value: `${channel}`, inline: true }],
    });
  },
};
