import { EmbedBuilder } from 'discord.js';
import { isDbReady } from '../lib/db.js';
import {
  getUserLevel,
  getUserRank,
  totalXpForLevel,
  xpForLevel,
} from '../lib/leveling.js';

// barra de progresso em texto: [█████░░░░░]
function bar(current, needed, size = 12) {
  const filled = Math.max(0, Math.min(size, Math.round((current / needed) * size)));
  return '█'.repeat(filled) + '░'.repeat(size - filled);
}

export default {
  name: 'rank',
  aliases: ['level'],
  category: 'Levels',
  description: 'Show your level and XP (or someone else’s)',
  usage: '/rank [@user]',
  permission: null,
  options: [{ name: 'user', type: 'user', description: 'Whose rank' }],

  async execute(ctx) {
    if (!isDbReady()) {
      await ctx.replyPrivate('Leveling is off right now (database not connected).');
      return;
    }

    const target = (await ctx.getMember('user')) ?? ctx.member;
    if (target.user.bot) {
      await ctx.replyPrivate('Bots don’t earn XP.');
      return;
    }

    const { xp, level } = await getUserLevel(ctx.guild.id, target.id);
    const rank = await getUserRank(ctx.guild.id, target.id, xp);

    const base = totalXpForLevel(level); // XP no inicio deste nivel
    const need = xpForLevel(level); // XP pra chegar no proximo
    const into = xp - base; // quanto ja andou neste nivel

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setAuthor({ name: target.user.tag, iconURL: target.user.displayAvatarURL() })
      .addFields(
        { name: 'Level', value: `${level}`, inline: true },
        { name: 'Rank', value: rank ? `#${rank}` : '—', inline: true },
        { name: 'Total XP', value: `${xp}`, inline: true },
        { name: `Progress — ${into}/${need} XP`, value: `\`${bar(into, need)}\`` }
      );

    await ctx.reply({ embeds: [embed] });
  },
};
