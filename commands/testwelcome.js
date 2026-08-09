import { PermissionFlagsBits } from 'discord.js';
import { sendWelcome } from '../welcome.js';

export default {
  name: 'testwelcome',
  category: 'Server',
  description: 'Test the welcome message in this channel',
  usage: '!testwelcome [@user]',
  permission: PermissionFlagsBits.ManageChannels,
  options: [{ name: 'user', type: 'user', description: 'Pretend this person joined' }],

  async execute(ctx) {
    const target = (await ctx.getMember('user')) ?? ctx.member;
    // posts in the current channel on purpose, so the real welcome channel stays clean
    const sent = await sendWelcome(target, ctx.channel);

    if (!sent) {
      await ctx.replyPrivate("Couldn't post. Check the console for the reason.");
    } else if (ctx.isSlash) {
      await ctx.replyPrivate('Posted the test above.');
    }
  },
};
