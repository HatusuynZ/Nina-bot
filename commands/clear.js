import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'clear',
  aliases: ['limpar', 'purge'],
  category: 'Moderação',
  description: 'Apaga as ultimas N mensagens do canal',
  usage: '!clear <1-100>',
  permission: PermissionFlagsBits.ManageMessages,
  options: [
    {
      name: 'quantidade',
      type: 'integer',
      description: 'Quantas mensagens apagar (1 a 100)',
      required: true,
    },
  ],

  async execute(ctx) {
    const amount = ctx.getInteger('quantidade');
    if (amount === null || amount < 1 || amount > 100) {
      await ctx.replyPrivate('Uso: `!clear <numero de 1 a 100>`');
      return;
    }

    try {
      // No modo texto, +1 pra incluir o proprio comando (no slash nao ha o que
      // incluir). O 'true' pula mensagens com mais de 14 dias, que a API do
      // Discord se recusa a apagar em massa.
      const extra = ctx.isSlash ? 0 : 1;
      const deleted = await ctx.channel.bulkDelete(amount + extra, true);
      const count = deleted.size - extra;

      if (ctx.isSlash) {
        await ctx.replyPrivate(`Apaguei ${count} mensagem(ns).`);
      } else {
        const info = await ctx.channel.send(`Apaguei ${count} mensagem(ns).`);
        setTimeout(() => info.delete().catch(() => {}), 4000);
      }
    } catch {
      await ctx.replyPrivate(
        'Falhou. Mensagens com mais de 14 dias nao podem ser apagadas em massa pelo Discord.'
      );
    }
  },
};
