import { PermissionFlagsBits } from 'discord.js';
import { postTicketPanel } from '../tickets.js';

export default {
  name: 'ticketpanel',
  aliases: ['painelticket'],
  category: 'Servidor',
  description: 'Posta o painel de abertura de tickets no canal atual',
  usage: '!ticketpanel',
  permission: PermissionFlagsBits.ManageChannels,

  async execute(ctx) {
    await postTicketPanel(ctx.channel);
    await ctx.deleteInvocation();
    if (ctx.isSlash) await ctx.replyPrivate('Painel postado.');
  },
};
