import { PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { getDb, isDbReady } from '../lib/db.js';
import { invalidateGuildCaches } from '../lib/leveling.js';

export default {
  name: 'levelrole',
  category: 'Levels',
  description: 'Set / remove / list the role given at each level',
  usage: '/levelrole <set|remove|list> [level] [role]',
  permission: PermissionFlagsBits.ManageRoles,
  options: [
    {
      name: 'action',
      type: 'string',
      description: 'set, remove or list',
      required: true,
    },
    { name: 'level', type: 'integer', description: 'Level number' },
    { name: 'role', type: 'role', description: 'Role to grant' },
  ],

  async execute(ctx) {
    if (!isDbReady()) {
      await ctx.replyPrivate('Leveling is off right now (database not connected).');
      return;
    }

    const action = (ctx.getString('action') ?? '').toLowerCase();
    const col = getDb().collection('levelroles');
    const guildId = ctx.guild.id;

    if (action === 'list') {
      const rows = await col.find({ guildId }).sort({ level: 1 }).toArray();
      if (rows.length === 0) {
        await ctx.reply('No level roles set. Use `/levelrole set <level> <role>`.');
        return;
      }
      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('Level roles')
        .setDescription(rows.map((r) => `Level **${r.level}** → <@&${r.roleId}>`).join('\n'));
      await ctx.reply({ embeds: [embed], allowedMentions: { parse: [] } });
      return;
    }

    if (action === 'set') {
      const level = ctx.getInteger('level');
      const role = ctx.getRole('role');
      if (level === null || level < 1 || !role) {
        await ctx.replyPrivate('Usage: `/levelrole set <level> <role>`');
        return;
      }
      // o cargo do bot precisa estar acima do cargo dado
      const me = await ctx.guild.members.fetchMe();
      if (role.comparePositionTo(me.roles.highest) >= 0) {
        await ctx.replyPrivate(
          `I can't grant **${role.name}**: it's above my highest role. Move my role up.`
        );
        return;
      }
      await col.updateOne(
        { guildId, level },
        { $set: { guildId, level, roleId: role.id } },
        { upsert: true }
      );
      invalidateGuildCaches(guildId);
      await ctx.reply(`Level **${level}** now grants ${role}.`);
      return;
    }

    if (action === 'remove') {
      const level = ctx.getInteger('level');
      if (level === null) {
        await ctx.replyPrivate('Usage: `/levelrole remove <level>`');
        return;
      }
      const res = await col.deleteOne({ guildId, level });
      invalidateGuildCaches(guildId);
      await ctx.reply(res.deletedCount ? `Removed the role for level ${level}.` : `Nothing set for level ${level}.`);
      return;
    }

    await ctx.replyPrivate('Action must be `set`, `remove` or `list`.');
  },
};
