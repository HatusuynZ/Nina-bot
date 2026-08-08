import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'unban',
  aliases: ['desbanir'],
  category: 'Moderação',
  description: 'desbane alguem pelo ID',
  usage: '!unban <id>',
  permission: PermissionFlagsBits.BanMembers,

  async execute({ message, args }) {
    // Quem esta banido nao esta no servidor, entao nao da pra marcar: vai por ID.
    const userId = (args[0] ?? '').replace(/[<@!>]/g, '');
    if (!/^\d{17,20}$/.test(userId)) {
      await message.reply(
        'Uso: `!unban <ID do usuario>`. Pegue o ID em Config. do Servidor > Banimentos.'
      );
      return;
    }

    try {
      await message.guild.bans.remove(userId);
      await message.channel.send(`Desbanido: \`${userId}\`.`);
    } catch {
      await message.reply('Falhou. Confere se o ID esta certo e se essa pessoa estava banida.');
    }
  },
};
