export default {
  name: 'ping',
  category: 'Geral',
  description: 'Testa se a Nina esta online e mostra a latencia',
  usage: '!ping',
  permission: null,

  async execute(ctx) {
    const sent = await ctx.reply('pong');
    const gateway = Math.round(ctx.client.ws.ping);

    // Em slash, reply() nao devolve a mensagem: pega ela pra medir o tempo.
    const msg = ctx.isSlash ? await ctx.interaction.fetchReply() : sent;
    const origin = ctx.isSlash ? ctx.interaction.createdTimestamp : ctx.message.createdTimestamp;
    const roundTrip = msg.createdTimestamp - origin;

    const text = `pong — ${roundTrip}ms de ida e volta, ${gateway}ms ate o Discord.`;
    if (ctx.isSlash) await ctx.interaction.editReply(text);
    else await sent.edit(text);
  },
};
