import { PermissionFlagsBits } from 'discord.js';
import { getDb, isDbReady } from '../lib/db.js';
import { invalidateGuildCaches } from '../lib/leveling.js';

export default {
  name: 'levelconfig',
  category: 'Levels',
  description: 'Where level-up messages go: a channel, here, or off',
  usage: '/levelconfig <here|off|channel> [channel]',
  permission: PermissionFlagsBits.ManageGuild,
  options: [
    { name: 'mode', type: 'string', description: 'here, off, or channel', required: true },
    { name: 'channel', type: 'channel', description: 'Channel (when mode = channel)' },
  ],

  async execute(ctx) {
    if (!isDbReady()) {
      await ctx.replyPrivate('Leveling is off right now (database not connected).');
      return;
    }

    const mode = (ctx.getString('mode') ?? '').toLowerCase();
    const col = getDb().collection('guildconfig');
    const guildId = ctx.guild.id;

    if (mode === 'off') {
      await col.updateOne(
        { _id: guildId },
        { $set: { levelUpEnabled: false } },
        { upsert: true }
      );
      invalidateGuildCaches(guildId);
      await ctx.reply('Level-up messages are now **off**.');
      return;
    }

    if (mode === 'here') {
      await col.updateOne(
        { _id: guildId },
        { $set: { levelUpEnabled: true, levelUpChannelId: null } },
        { upsert: true }
      );
      invalidateGuildCaches(guildId);
      await ctx.reply('Level-up messages will show **in the channel where the person leveled**.');
      return;
    }

    if (mode === 'channel') {
      const channel = ctx.getChannel('channel');
      if (!channel?.isTextBased?.()) {
        await ctx.replyPrivate('Usage: `/levelconfig channel #channel`');
        return;
      }
      await col.updateOne(
        { _id: guildId },
        { $set: { levelUpEnabled: true, levelUpChannelId: channel.id } },
        { upsert: true }
      );
      invalidateGuildCaches(guildId);
      await ctx.reply(`Level-up messages will all go to ${channel}.`);
      return;
    }

    await ctx.replyPrivate('Mode must be `here`, `off` or `channel`.');
  },
};
