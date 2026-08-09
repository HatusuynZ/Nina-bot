import { EmbedBuilder } from 'discord.js';
import { getWarns } from '../lib/warns.js';

export default {
  name: 'warns',
  category: 'Moderation',
  description: "List someone's warns (no argument = your own)",
  usage: '!warns [@user]',
  permission: null,
  options: [{ name: 'user', type: 'user', description: 'Whose warns' }],

  async execute(ctx) {
    const target = (await ctx.getMember('user')) ?? ctx.member;
    const list = getWarns(ctx.guild.id, target.id);

    if (list.length === 0) {
      await ctx.reply(`**${target.user.tag}** has no warns.`);
      return;
    }

    const lines = list
      .map((w, i) => {
        const when = new Date(w.date);
        const date = Number.isNaN(when.getTime()) ? '' : ` · ${when.toLocaleDateString('en-GB')}`;
        return `**${i + 1}.** ${w.reason} — by ${w.mod}${date}`;
      })
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xb3261e)
      .setTitle(`Warns for ${target.user.tag}`)
      .setDescription(lines)
      .setFooter({ text: `Total: ${list.length}` });

    await ctx.reply({ embeds: [embed] });
  },
};
