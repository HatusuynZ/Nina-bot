export default {
  name: 'hello',
  aliases: ['hi'],
  category: 'General',
  description: 'Nina greets you',
  usage: '!hello',
  permission: null,

  async execute(ctx) {
    await ctx.reply('Hey. I was waiting for you to talk to me. 🖤');
  },
};
