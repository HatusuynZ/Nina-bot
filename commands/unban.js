import { PermissionFlagsBits } from 'discord.js';
import { logModeration } from '../lib/logger.js';

export default {
  name: 'unban',
  aliases: ['desbanir'],
  category: 'Moderação',
  description: 'Desbane alguem pelo ID',
  usage: '!unban <id>',
  permission: PermissionFlagsBits.BanMembers,
  options: [
    { name: 'id', type: 'string', description: 'ID do usuario banido', required: true },
  ],

  async execute(ctx) {
    // Quem esta banido nao esta no servidor, entao nao da pra marcar: vai por ID.
    const userId = (ctx.getString('id') ?? '').replace(/[<@!>]/g, '');
    if (!/^\d{17,20}$/.test(userId)) {
      await ctx.replyPrivate(
        'Uso: `!unban <ID>`. Pegue o ID em Config. do Servidor > Banimentos.'
      );
      return;
    }

    try {
      await ctx.guild.bans.remove(userId);
      await ctx.reply(`Desbanido: \`${userId}\`.`);

      await logModeration(ctx.guild, {
        action: '🕊️ Desbanimento',
        target: userId,
        moderator: ctx.author.tag,
      });
    } catch {
      await ctx.replyPrivate('Falhou. Confere se o ID esta certo e se a pessoa estava banida.');
    }
  },
};
