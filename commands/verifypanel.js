import { PermissionFlagsBits } from 'discord.js';
import { postVerifyPanel } from '../lib/verify.js';

export default {
  name: 'verifypanel',
  category: 'Server',
  description: 'Post the verification panel in this channel',
  usage: '/verifypanel',
  permission: PermissionFlagsBits.ManageGuild,

  async execute(ctx) {
    await postVerifyPanel(ctx.channel);
    if (ctx.isSlash) await ctx.replyPrivate('Verification panel posted.');
  },
};
