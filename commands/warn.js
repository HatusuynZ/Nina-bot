import { PermissionFlagsBits } from 'discord.js';
import { addWarn } from '../lib/warns.js';

// ---- knobs ----
// Ban automatico ao atingir X warns. 0 = desligado.
const AUTO_BAN_AFTER = 0;
// ---------------

export default {
  name: 'warn',
  aliases: ['avisar'],
  category: 'Moderação',
  description: 'registra um aviso contra alguem',
  usage: '!warn @user [motivo]',
  permission: PermissionFlagsBits.KickMembers,

  async execute({ message, args }) {
    const target = message.mentions.members.first();
    if (!target) {
      await message.reply('Uso: `!warn @usuario [motivo]`');
      return;
    }
    if (target.user.bot) {
      await message.reply('Nao da pra dar warn em bot.');
      return;
    }
    if (target.id === message.author.id) {
      await message.reply('Voce nao pode se avisar.');
      return;
    }

    const reason = args.slice(1).join(' ') || 'Sem motivo informado';
    const total = addWarn(message.guild.id, target.id, {
      reason,
      mod: message.author.tag,
      date: new Date().toISOString(),
    });

    await message.channel.send(
      `**${target.user.tag}** levou um warn (total: ${total}). Motivo: ${reason}`
    );

    if (AUTO_BAN_AFTER > 0 && total >= AUTO_BAN_AFTER && target.bannable) {
      await target.ban({ reason: `Auto-ban: ${AUTO_BAN_AFTER} warns` });
      await message.channel.send(
        `**${target.user.tag}** atingiu ${AUTO_BAN_AFTER} warns e foi banido.`
      );
    }
  },
};
