export default {
  name: 'oi',
  aliases: ['ola'],
  category: 'Geral',
  description: 'A Nina cumprimenta voce',
  usage: '!oi',
  permission: null,

  async execute(ctx) {
    await ctx.reply('Oi. Eu estava esperando voce falar comigo. 🖤');
  },
};
