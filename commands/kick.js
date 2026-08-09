import { PermissionFlagsBits } from 'discord.js';
import { logModeration } from '../lib/logger.js';

export default {
  name: 'kick',
  category: 'Moderation',
  description: 'Kick a member from the server',
  usage: '/kick @user [reason]',
  permission: PermissionFlagsBits.KickMembers,
  options: [
    { name: 'user', type: 'user', description: 'Who to kick', required: true },
    { name: 'reason', type: 'string', description: 'Why' },
  ],

  async execute(ctx) {
    const target = await ctx.getMember('user');
    if (!target) {
      await ctx.replyPrivate('Usage: `/kick @user [reason]`');
      return;
    }
    if (target.id === ctx.author.id) {
      await ctx.replyPrivate("You can't kick yourself.");
      return;
    }
    if (!target.kickable) {
      await ctx.replyPrivate(
        "I can't kick this user: their role is higher than mine, or they own the server."
      );
      return;
    }

    const reason = ctx.getString('reason') || 'No reason given';
    await target.kick(reason);
    await ctx.reply(`Kicked **${target.user.tag}**. Reason: ${reason}`);

    await logModeration(ctx.guild, {
      action: '👢 Kick',
      target: `${target.user.tag} (${target.id})`,
      moderator: ctx.author.tag,
      reason,
    });
  },
};
