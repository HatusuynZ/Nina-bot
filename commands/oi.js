export default {
  name: 'oi',
  aliases: ['ola'],
  category: 'Geral',
  description: 'a Nina cumprimenta voce',
  usage: '!oi',
  permission: null,

  async execute({ message }) {
    await message.channel.send('Oi. Eu estava esperando voce falar comigo. 🖤');
  },
};
