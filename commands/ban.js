import { PermissionFlagsBits } from 'discord.js';
import { logModeration } from '../lib/logger.js';

export default {
  name: 'ban',
  category: 'Moderation',
  description: 'Ban a member from the server',
  usage: '!ban @user [reason]',
  permission: PermissionFlagsBits.BanMembers,
  options: [
    { name: 'user', type: 'user', description: 'Who to ban', required: true },
    { name: 'reason', type: 'string', description: 'Why' },
  ],

  async execute(ctx) {
    const target = await ctx.getMember('user');
    if (!target) {
      await ctx.replyPrivate('Usage: `!ban @user [reason]`');
      return;
    }
    if (target.id === ctx.author.id) {
      await ctx.replyPrivate("You can't ban yourself.");
      return;
    }
    if (!target.bannable) {
      await ctx.replyPrivate(
        "I can't ban this user: their role is higher than mine, or they own the server."
      );
      return;
    }

    const reason = ctx.getString('reason') || 'No reason given';
    await target.ban({ reason });
    await ctx.reply(`Banned: **${target.user.tag}**. Reason: ${reason}`);

    await logModeration(ctx.guild, {
      action: '🔨 Ban',
      target: `${target.user.tag} (${target.id})`,
      moderator: ctx.author.tag,
      reason,
    });
  },
};
