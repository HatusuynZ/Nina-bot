import { PermissionFlagsBits } from 'discord.js';
import { addWarn } from '../lib/warns.js';
import { logModeration } from '../lib/logger.js';

// ---- knobs ----
// Auto-ban when reaching X warns. 0 = off.
const AUTO_BAN_AFTER = 0;
// ---------------

export default {
  name: 'warn',
  category: 'Moderation',
  description: 'Warn a member',
  usage: '/warn @user [reason]',
  permission: PermissionFlagsBits.KickMembers,
  options: [
    { name: 'user', type: 'user', description: 'Who to warn', required: true },
    { name: 'reason', type: 'string', description: 'Why' },
  ],

  async execute(ctx) {
    const target = await ctx.getMember('user');
    if (!target) {
      await ctx.replyPrivate('Usage: `/warn @user [reason]`');
      return;
    }
    if (target.user.bot) {
      await ctx.replyPrivate("You can't warn a bot.");
      return;
    }
    if (target.id === ctx.author.id) {
      await ctx.replyPrivate("You can't warn yourself.");
      return;
    }

    const reason = ctx.getString('reason') || 'No reason given';
    const total = addWarn(ctx.guild.id, target.id, {
      reason,
      mod: ctx.author.tag,
      date: new Date().toISOString(),
    });

    await ctx.reply(`**${target.user.tag}** was warned (total: ${total}). Reason: ${reason}`);

    await logModeration(ctx.guild, {
      action: '⚠️ Warn',
      target: `${target.user.tag} (${target.id})`,
      moderator: ctx.author.tag,
      reason,
      extra: [{ name: 'Total warns', value: `${total}`, inline: true }],
    });

    if (AUTO_BAN_AFTER > 0 && total >= AUTO_BAN_AFTER && target.bannable) {
      await target.ban({ reason: `Auto-ban: ${AUTO_BAN_AFTER} warns` });
      await ctx.send(`**${target.user.tag}** hit ${AUTO_BAN_AFTER} warns and was banned.`);
    }
  },
};
