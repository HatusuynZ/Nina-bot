import { PermissionFlagsBits } from 'discord.js';
import { sendWelcome } from '../welcome.js';

export default {
  name: 'testwelcome',
  aliases: ['testarboasvindas'],
  category: 'Servidor',
  description: 'Testa a mensagem de boas-vindas no canal atual',
  usage: '!testwelcome [@user]',
  permission: PermissionFlagsBits.ManageChannels,
  options: [{ name: 'user', type: 'user', description: 'Fingir que essa pessoa entrou' }],

  async execute(ctx) {
    const target = (await ctx.getMember('user')) ?? ctx.member;
    // manda no canal atual de proposito, pra nao sujar o de boas-vindas real
    const sent = await sendWelcome(target, ctx.channel);

    if (!sent) {
      await ctx.replyPrivate('Nao consegui postar. Olha o console pra ver o motivo.');
    } else if (ctx.isSlash) {
      await ctx.replyPrivate('Postei o teste acima.');
    }
  },
};
