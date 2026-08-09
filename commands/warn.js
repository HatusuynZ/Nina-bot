import { PermissionFlagsBits } from 'discord.js';
import { addWarn } from '../lib/warns.js';
import { logModeration } from '../lib/logger.js';
import { parseDuration, formatDuration } from '../lib/duration.js';

// ---- knobs ----
// Auto-punicao escalonada. Ao ATINGIR exatamente X warns, aplica a acao.
// action: 'mute' (precisa de duration), 'kick' ou 'ban'. Ordene por warns.
const WARN_ACTIONS = [
  { warns: 3, action: 'mute', duration: '1h' },
  { warns: 5, action: 'ban' },
];
// ---------------

async function applyAction(ctx, target, rule) {
  const reason = `Reached ${rule.warns} warns`;

  if (rule.action === 'mute' && target.moderatable) {
    const ms = parseDuration(rule.duration ?? '1h') ?? 3_600_000;
    await target.timeout(ms, reason);
    return `muted for ${formatDuration(ms)}`;
  }
  if (rule.action === 'kick' && target.kickable) {
    await target.kick(reason);
    return 'kicked';
  }
  if (rule.action === 'ban' && target.bannable) {
    await target.ban({ reason });
    return 'banned';
  }
  return null; // sem permissao/hierarquia pra aplicar
}

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

    // auto-punicao ao bater um limiar
    const rule = WARN_ACTIONS.find((a) => a.warns === total);
    if (!rule) return;

    const outcome = await applyAction(ctx, target, rule);
    if (outcome) {
      await ctx.send(`**${target.user.tag}** hit ${total} warns and was **${outcome}**.`);
      await logModeration(ctx.guild, {
        action: '⚖️ Auto-punishment',
        target: `${target.user.tag} (${target.id})`,
        moderator: 'Nina (auto)',
        reason: `Reached ${total} warns`,
        extra: [{ name: 'Action', value: outcome, inline: true }],
      });
    } else {
      await ctx.send(
        `**${target.user.tag}** hit ${total} warns, but I couldn't ${rule.action} them ` +
          `(role too high or missing permission).`
      );
    }
  },
};
