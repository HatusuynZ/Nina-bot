import { PermissionFlagsBits } from 'discord.js';
import { logModeration } from '../lib/logger.js';

export default {
  name: 'ban',
  aliases: ['banir'],
  category: 'Moderação',
  description: 'Bane um membro do servidor',
  usage: '!ban @user [motivo]',
  permission: PermissionFlagsBits.BanMembers,
  options: [
    { name: 'user', type: 'user', description: 'Quem vai ser banido', required: true },
    { name: 'motivo', type: 'string', description: 'Por que' },
  ],

  async execute(ctx) {
    const target = await ctx.getMember('user');
    if (!target) {
      await ctx.replyPrivate('Uso: `!ban @usuario [motivo]`');
      return;
    }
    if (target.id === ctx.author.id) {
      await ctx.replyPrivate('Voce nao pode se banir.');
      return;
    }
    if (!target.bannable) {
      await ctx.replyPrivate(
        'Nao consigo banir: o cargo dele e maior ou igual ao meu, ou ele e o dono do servidor.'
      );
      return;
    }

    const reason = ctx.getString('motivo') || 'Sem motivo informado';
    await target.ban({ reason });
    await ctx.reply(`Banido: **${target.user.tag}**. Motivo: ${reason}`);

    await logModeration(ctx.guild, {
      action: '🔨 Banimento',
      target: `${target.user.tag} (${target.id})`,
      moderator: ctx.author.tag,
      reason,
    });
  },
};
