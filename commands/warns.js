import { EmbedBuilder } from 'discord.js';
import { getWarns } from '../lib/warns.js';

export default {
  name: 'warns',
  aliases: ['avisos'],
  category: 'Moderação',
  description: 'lista os warns de alguem (sem marcar ninguem, mostra os seus)',
  usage: '!warns [@user]',
  permission: null,

  async execute({ message }) {
    const target = message.mentions.members.first() ?? message.member;
    const list = getWarns(message.guild.id, target.id);

    if (list.length === 0) {
      await message.channel.send(`**${target.user.tag}** nao tem nenhum warn.`);
      return;
    }

    const lines = list
      .map((w, i) => {
        const when = new Date(w.date);
        const data = isNaN(when) ? '' : ` · ${when.toLocaleDateString('pt-BR')}`;
        return `**${i + 1}.** ${w.reason} — por ${w.mod}${data}`;
      })
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xb3261e)
      .setTitle(`Warns de ${target.user.tag}`)
      .setDescription(lines)
      .setFooter({ text: `Total: ${list.length}` });

    await message.channel.send({ embeds: [embed] });
  },
};
