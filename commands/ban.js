import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'ban',
  aliases: ['banir'],
  category: 'Moderação',
  description: 'bane um membro do servidor',
  usage: '!ban @user [motivo]',
  permission: PermissionFlagsBits.BanMembers,

  async execute({ message, args }) {
    const target = message.mentions.members.first();
    if (!target) {
      await message.reply('Uso: `!ban @usuario [motivo]`');
      return;
    }
    if (target.id === message.author.id) {
      await message.reply('Voce nao pode se banir.');
      return;
    }
    if (!target.bannable) {
      await message.reply(
        'Nao consigo banir esse usuario: o cargo dele e maior ou igual ao meu, ou ele e o dono do servidor.'
      );
      return;
    }

    // args[0] e a mencao; o motivo comeca depois dela
    const reason = args.slice(1).join(' ') || 'Sem motivo informado';

    await target.ban({ reason });
    await message.channel.send(`Banido: **${target.user.tag}**. Motivo: ${reason}`);
  },
};
