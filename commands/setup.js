import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { SERVER_TEMPLATE, createChannel } from '../lib/serverTemplate.js';

export default {
  name: 'setup',
  category: 'Server',
  description: 'Create the channel structure (skips what exists, deletes nothing)',
  usage: '!setup',
  permission: PermissionFlagsBits.ManageChannels,

  async execute(ctx) {
    const guild = ctx.guild;
    const me = await guild.members.fetchMe();
    if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await ctx.replyPrivate("I don't have the **Manage Channels** permission.");
      return;
    }

    // creating dozens of channels blows past the slash 3s reply window
    await ctx.defer();
    await ctx.reply('Building the server structure...');

    let created = 0;
    let skipped = 0;

    for (const group of SERVER_TEMPLATE) {
      let category = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name === group.category
      );
      if (category) {
        skipped++;
      } else {
        category = await guild.channels.create({
          name: group.category,
          type: ChannelType.GuildCategory,
        });
        created++;
      }

      for (const spec of group.channels) {
        const exists = guild.channels.cache.find(
          (c) => c.name === spec.name && c.parentId === category.id
        );
        if (exists) {
          skipped++;
          continue;
        }
        await createChannel(guild, spec, category.id);
        created++;
      }
    }

    await ctx.reply(`Done. Created ${created} item(s) and skipped ${skipped} that already existed.`);
  },
};
