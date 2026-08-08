import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'say',
  aliases: ['falar'],
  category: 'Geral',
  description: 'A Nina fala por voce',
  usage: '!say <texto>',
  permission: PermissionFlagsBits.ManageMessages,
  options: [{ name: 'texto', type: 'string', description: 'O que ela vai dizer', required: true }],

  async execute(ctx) {
    const text = ctx.getString('texto');
    if (!text) {
      await ctx.replyPrivate('Uso: `!say <texto>`');
      return;
    }

    // parse: [] impede que "!say @everyone" marque o servidor inteiro
    const payload = { content: text, allowedMentions: { parse: [] } };

    if (ctx.isSlash) {
      // confirma so pra quem chamou, pra parecer que a Nina falou sozinha
      await ctx.replyPrivate('Falei.');
      await ctx.channel.send(payload);
    } else {
      await ctx.deleteInvocation();
      await ctx.channel.send(payload);
    }
  },
};
