import { PermissionFlagsBits } from 'discord.js';
import { addWarn } from '../lib/warns.js';
import { logModeration } from '../lib/logger.js';

// ---- knobs ----
// Ban automatico ao atingir X warns. 0 = desligado.
const AUTO_BAN_AFTER = 0;
// ---------------

export default {
  name: 'warn',
  aliases: ['avisar'],
  category: 'Moderação',
  description: 'Registra um aviso contra alguem',
  usage: '!warn @user [motivo]',
  permission: PermissionFlagsBits.KickMembers,
  options: [
    { name: 'user', type: 'user', description: 'Quem levou o aviso', required: true },
    { name: 'motivo', type: 'string', description: 'Por que' },
  ],

  async execute(ctx) {
    const target = await ctx.getMember('user');
    if (!target) {
      await ctx.replyPrivate('Uso: `!warn @usuario [motivo]`');
      return;
    }
    if (target.user.bot) {
      await ctx.replyPrivate('Nao da pra dar warn em bot.');
      return;
    }
    if (target.id === ctx.author.id) {
      await ctx.replyPrivate('Voce nao pode se avisar.');
      return;
    }

    const reason = ctx.getString('motivo') || 'Sem motivo informado';
    const total = addWarn(ctx.guild.id, target.id, {
      reason,
      mod: ctx.author.tag,
      date: new Date().toISOString(),
    });

    await ctx.reply(`**${target.user.tag}** levou um warn (total: ${total}). Motivo: ${reason}`);

    await logModeration(ctx.guild, {
      action: '⚠️ Warn',
      target: `${target.user.tag} (${target.id})`,
      moderator: ctx.author.tag,
      reason,
      extra: [{ name: 'Total de warns', value: `${total}`, inline: true }],
    });

    if (AUTO_BAN_AFTER > 0 && total >= AUTO_BAN_AFTER && target.bannable) {
      await target.ban({ reason: `Auto-ban: ${AUTO_BAN_AFTER} warns` });
      await ctx.send(`**${target.user.tag}** atingiu ${AUTO_BAN_AFTER} warns e foi banido.`);
    }
  },
};
