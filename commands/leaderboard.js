import { EmbedBuilder } from 'discord.js';
import { isDbReady } from '../lib/db.js';
import { getLeaderboard } from '../lib/leveling.js';

const MEDALS = ['🥇', '🥈', '🥉'];

export default {
  name: 'leaderboard',
  aliases: ['top'],
  category: 'Levels',
  description: 'Show the server XP leaderboard',
  usage: '/leaderboard',
  permission: null,

  async execute(ctx) {
    if (!isDbReady()) {
      await ctx.replyPrivate('Leveling is off right now (database not connected).');
      return;
    }

    const rows = await getLeaderboard(ctx.guild.id, 10);
    if (rows.length === 0) {
      await ctx.reply('No one has any XP yet. Start talking.');
      return;
    }

    const lines = rows
      .map((row, i) => {
        const rank = MEDALS[i] ?? `**${i + 1}.**`;
        return `${rank} <@${row.userId}> — level ${row.level} · ${row.xp} XP`;
      })
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(`🏆 Leaderboard — ${ctx.guild.name}`)
      .setDescription(lines);

    await ctx.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
