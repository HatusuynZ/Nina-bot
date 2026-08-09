import { PermissionFlagsBits } from 'discord.js';
import { logModeration } from '../lib/logger.js';

export default {
  name: 'unmute',
  aliases: ['untimeout'],
  category: 'Moderation',
  description: 'Remove a member timeout early',
  usage: '!unmute @user',
  permission: PermissionFlagsBits.ModerateMembers,
  options: [{ name: 'user', type: 'user', description: 'Who to unmute', required: true }],

  async execute(ctx) {
    const target = await ctx.getMember('user');
    if (!target) {
      await ctx.replyPrivate('Usage: `!unmute @user`');
      return;
    }
    if (!target.isCommunicationDisabled()) {
      await ctx.replyPrivate(`**${target.user.tag}** is not muted.`);
      return;
    }

    // null limpa o timeout
    await target.timeout(null, `Unmuted by ${ctx.author.tag}`);
    await ctx.reply(`Unmuted **${target.user.tag}**.`);

    await logModeration(ctx.guild, {
      action: '🔊 Unmute',
      target: `${target.user.tag} (${target.id})`,
      moderator: ctx.author.tag,
    });
  },
};
