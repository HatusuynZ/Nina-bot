import { PermissionFlagsBits } from 'discord.js';
import { logModeration } from '../lib/logger.js';

const MAX = 21600; // 6h — teto do Discord

export default {
  name: 'slowmode',
  category: 'Moderation',
  description: 'Set channel slowmode in seconds (0 = off)',
  usage: '/slowmode <seconds> [channel]',
  permission: PermissionFlagsBits.ManageChannels,
  options: [
    { name: 'seconds', type: 'integer', description: '0 to 21600 (0 turns it off)', required: true },
    { name: 'channel', type: 'channel', description: 'Which channel (default: here)' },
  ],

  async execute(ctx) {
    const seconds = ctx.getInteger('seconds');
    if (seconds === null || seconds < 0 || seconds > MAX) {
      await ctx.replyPrivate(`Usage: \`/slowmode <0-${MAX}> [channel]\``);
      return;
    }

    const channel = ctx.getChannel('channel') ?? ctx.channel;
    if (!channel?.isTextBased?.()) {
      await ctx.replyPrivate('That is not a text channel.');
      return;
    }

    await channel.setRateLimitPerUser(seconds, `Slowmode by ${ctx.author.tag}`);

    await ctx.reply(
      seconds === 0 ? `Slowmode off in ${channel}.` : `Slowmode set to ${seconds}s in ${channel}.`
    );
    await logModeration(ctx.guild, {
      action: '🐌 Slowmode',
      moderator: ctx.author.tag,
      extra: [
        { name: 'Channel', value: `${channel}`, inline: true },
        { name: 'Seconds', value: `${seconds}`, inline: true },
      ],
    });
  },
};
