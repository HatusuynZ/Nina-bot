import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'say',
  category: 'General',
  description: 'Nina speaks for you',
  usage: '!say <text>',
  permission: PermissionFlagsBits.ManageMessages,
  options: [{ name: 'text', type: 'string', description: 'What she says', required: true }],

  async execute(ctx) {
    const text = ctx.getString('text');
    if (!text) {
      await ctx.replyPrivate('Usage: `!say <text>`');
      return;
    }

    // parse: [] stops "!say @everyone" from actually pinging everyone
    const payload = { content: text, allowedMentions: { parse: [] } };

    if (ctx.isSlash) {
      // confirm only to the caller, so it looks like Nina spoke on her own
      await ctx.replyPrivate('Done.');
      await ctx.channel.send(payload);
    } else {
      await ctx.deleteInvocation();
      await ctx.channel.send(payload);
    }
  },
};
