import { PermissionFlagsBits } from 'discord.js';
import { logModeration } from '../lib/logger.js';

export default {
  name: 'clear',
  aliases: ['purge'],
  category: 'Moderation',
  description: 'Delete the last N messages in this channel',
  usage: '/clear <1-100>',
  permission: PermissionFlagsBits.ManageMessages,
  options: [
    {
      name: 'amount',
      type: 'integer',
      description: 'How many messages to delete (1 to 100)',
      required: true,
    },
  ],

  async execute(ctx) {
    const amount = ctx.getInteger('amount');
    if (amount === null || amount < 1 || amount > 100) {
      await ctx.replyPrivate('Usage: `/clear <number from 1 to 100>`');
      return;
    }

    try {
      // In text mode, +1 to include the command itself (in slash there's
      // nothing to include). The 'true' skips messages older than 14 days,
      // which Discord's API refuses to bulk-delete.
      const extra = ctx.isSlash ? 0 : 1;
      const deleted = await ctx.channel.bulkDelete(amount + extra, true);
      const count = deleted.size - extra;

      if (ctx.isSlash) {
        await ctx.replyPrivate(`Deleted ${count} message(s).`);
      } else {
        const info = await ctx.channel.send(`Deleted ${count} message(s).`);
        setTimeout(() => info.delete().catch(() => {}), 4000);
      }

      await logModeration(ctx.guild, {
        action: '🧹 Message purge',
        moderator: ctx.author.tag,
        extra: [
          { name: 'Channel', value: `${ctx.channel}`, inline: true },
          { name: 'Deleted', value: `${count}`, inline: true },
        ],
      });
    } catch {
      await ctx.replyPrivate(
        "Failed. Messages older than 14 days can't be bulk-deleted by Discord."
      );
    }
  },
};
