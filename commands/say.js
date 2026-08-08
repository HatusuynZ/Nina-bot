import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'say',
  aliases: ['falar'],
  category: 'Geral',
  description: 'a Nina fala por voce e apaga o seu comando',
  usage: '!say <texto>',
  permission: PermissionFlagsBits.ManageMessages,

  async execute({ message, args }) {
    const text = args.join(' ');
    if (!text) {
      await message.reply('Uso: `!say <texto>`');
      return;
    }

    await message.delete().catch(() => {});
    // parse: [] impede que "!say @everyone" marque o servidor inteiro
    await message.channel.send({ content: text, allowedMentions: { parse: [] } });
  },
};
