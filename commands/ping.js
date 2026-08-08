export default {
  name: 'ping',
  category: 'Geral',
  description: 'testa se a Nina esta online e mostra a latencia',
  usage: '!ping',
  permission: null,

  async execute({ message, client }) {
    const sent = await message.reply('pong');
    const roundTrip = sent.createdTimestamp - message.createdTimestamp;
    await sent.edit(
      `pong — ${roundTrip}ms de ida e volta, ${Math.round(client.ws.ping)}ms ate o Discord.`
    );
  },
};
