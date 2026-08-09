import { PermissionFlagsBits } from 'discord.js';
import { logModeration } from '../lib/logger.js';

export default {
  name: 'unban',
  category: 'Moderation',
  description: 'Unban someone by their ID',
  usage: '/unban <id>',
  permission: PermissionFlagsBits.BanMembers,
  options: [{ name: 'id', type: 'string', description: 'ID of the banned user', required: true }],

  async execute(ctx) {
    // A banned user isn't in the server, so you can't mention them: use the ID.
    const userId = (ctx.getString('id') ?? '').replace(/[<@!>]/g, '');
    if (!/^\d{17,20}$/.test(userId)) {
      await ctx.replyPrivate('Usage: `/unban <ID>`. Get the ID in Server Settings > Bans.');
      return;
    }

    try {
      await ctx.guild.bans.remove(userId);
      await ctx.reply(`Unbanned: \`${userId}\`.`);

      await logModeration(ctx.guild, {
        action: '🕊️ Unban',
        target: userId,
        moderator: ctx.author.tag,
      });
    } catch {
      await ctx.replyPrivate("Failed. Check the ID is right and that they were actually banned.");
    }
  },
};
