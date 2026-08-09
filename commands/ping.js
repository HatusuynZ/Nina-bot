export default {
  name: 'ping',
  category: 'General',
  description: "Check if Nina is online and show latency",
  usage: '/ping',
  permission: null,

  async execute(ctx) {
    const sent = await ctx.reply('pong');
    const gateway = Math.round(ctx.client.ws.ping);

    // In slash, reply() doesn't return the message: fetch it to measure time.
    const msg = ctx.isSlash ? await ctx.interaction.fetchReply() : sent;
    const origin = ctx.isSlash ? ctx.interaction.createdTimestamp : ctx.message.createdTimestamp;
    const roundTrip = msg.createdTimestamp - origin;

    const text = `pong — ${roundTrip}ms round trip, ${gateway}ms to Discord.`;
    if (ctx.isSlash) await ctx.interaction.editReply(text);
    else await sent.edit(text);
  },
};
