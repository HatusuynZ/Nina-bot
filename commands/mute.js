import { PermissionFlagsBits } from 'discord.js';
import { logModeration } from '../lib/logger.js';
import { parseDuration, formatDuration } from '../lib/duration.js';

// Discord limita o timeout a 28 dias.
const MAX_MS = 28 * 86_400_000;
const DEFAULT = '10m';

export default {
  name: 'mute',
  aliases: ['timeout'],
  category: 'Moderation',
  description: 'Timeout a member (mute) for a while',
  usage: '/mute @user [10m|1h|2d] [reason]',
  permission: PermissionFlagsBits.ModerateMembers,
  options: [
    { name: 'user', type: 'user', description: 'Who to mute', required: true },
    { name: 'duration', type: 'string', description: 'e.g. 10m, 1h, 2d (default 10m)' },
    { name: 'reason', type: 'string', description: 'Why' },
  ],

  async execute(ctx) {
    const target = await ctx.getMember('user');
    if (!target) {
      await ctx.replyPrivate('Usage: `/mute @user [10m|1h|2d] [reason]`');
      return;
    }
    if (target.id === ctx.author.id) {
      await ctx.replyPrivate("You can't mute yourself.");
      return;
    }
    if (!target.moderatable) {
      await ctx.replyPrivate(
        "I can't mute this user: their role is higher than mine, or they own the server."
      );
      return;
    }

    const ms = parseDuration(ctx.getString('duration') ?? DEFAULT);
    if (ms === null) {
      await ctx.replyPrivate('Bad duration. Use something like `10m`, `1h`, `2d`.');
      return;
    }
    if (ms > MAX_MS) {
      await ctx.replyPrivate("Discord's max timeout is 28 days.");
      return;
    }

    const reason = ctx.getString('reason') || 'No reason given';
    await target.timeout(ms, reason);
    const pretty = formatDuration(ms);

    await ctx.reply(`Muted **${target.user.tag}** for ${pretty}. Reason: ${reason}`);

    await logModeration(ctx.guild, {
      action: '🔇 Mute',
      target: `${target.user.tag} (${target.id})`,
      moderator: ctx.author.tag,
      reason,
      extra: [{ name: 'Duration', value: pretty, inline: true }],
    });
  },
};
