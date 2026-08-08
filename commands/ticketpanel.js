import { PermissionFlagsBits } from 'discord.js';
import { postTicketPanel } from '../tickets.js';

export default {
  name: 'ticketpanel',
  aliases: ['painelticket'],
  category: 'Servidor',
  description: 'posta o painel de abertura de tickets no canal atual',
  usage: '!ticketpanel',
  permission: PermissionFlagsBits.ManageChannels,

  async execute({ message }) {
    await postTicketPanel(message.channel);
    await message.delete().catch(() => {});
  },
};
