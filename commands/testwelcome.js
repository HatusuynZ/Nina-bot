import { PermissionFlagsBits } from 'discord.js';
import { sendWelcome } from '../welcome.js';

export default {
  name: 'testwelcome',
  aliases: ['testarboasvindas'],
  category: 'Servidor',
  description: 'testa a mensagem de boas-vindas no canal atual',
  usage: '!testwelcome [@user]',
  permission: PermissionFlagsBits.ManageChannels,

  async execute({ message }) {
    const target = message.mentions.members.first() ?? message.member;
    // manda no canal atual de proposito, pra nao sujar o de boas-vindas real
    const sent = await sendWelcome(target, message.channel);
    if (!sent) {
      await message.reply('Nao consegui postar. Olha o console pra ver o motivo.');
    }
  },
};
