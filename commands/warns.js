import { EmbedBuilder } from 'discord.js';
import { getWarns } from '../lib/warns.js';

export default {
  name: 'warns',
  aliases: ['avisos'],
  category: 'Moderação',
  description: 'Lista os warns de alguem (sem argumento, mostra os seus)',
  usage: '!warns [@user]',
  permission: null,
  options: [{ name: 'user', type: 'user', description: 'De quem' }],

  async execute(ctx) {
    const target = (await ctx.getMember('user')) ?? ctx.member;
    const list = getWarns(ctx.guild.id, target.id);

    if (list.length === 0) {
      await ctx.reply(`**${target.user.tag}** nao tem nenhum warn.`);
      return;
    }

    const lines = list
      .map((w, i) => {
        const when = new Date(w.date);
        const data = Number.isNaN(when.getTime()) ? '' : ` · ${when.toLocaleDateString('pt-BR')}`;
        return `**${i + 1}.** ${w.reason} — por ${w.mod}${data}`;
      })
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xb3261e)
      .setTitle(`Warns de ${target.user.tag}`)
      .setDescription(lines)
      .setFooter({ text: `Total: ${list.length}` });

    await ctx.reply({ embeds: [embed] });
  },
};
