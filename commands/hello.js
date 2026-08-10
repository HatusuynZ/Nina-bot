export default {
  name: 'hello',
  aliases: ['hi'],
  category: 'General',
  description: 'Get Skull to answer',
  usage: '/hello',
  permission: null,

  async execute(ctx) {
    await ctx.reply('You needed something? Make it quick.');
  },
};
