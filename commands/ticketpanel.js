import { PermissionFlagsBits } from 'discord.js';
import { postTicketPanel } from '../tickets.js';

export default {
  name: 'ticketpanel',
  category: 'Server',
  description: 'Post the ticket panel in this channel',
  usage: '!ticketpanel',
  permission: PermissionFlagsBits.ManageChannels,

  async execute(ctx) {
    await postTicketPanel(ctx.channel);
    await ctx.deleteInvocation();
    if (ctx.isSlash) await ctx.replyPrivate('Panel posted.');
  },
};
