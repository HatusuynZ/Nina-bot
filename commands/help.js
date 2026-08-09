import { EmbedBuilder } from 'discord.js';

// Category order in the embed. Anything not listed goes last.
const CATEGORY_ORDER = ['Moderation', 'Server', 'Roleplay', 'General'];

export default {
  name: 'help',
  aliases: ['commands'],
  category: 'General',
  description: 'Show all commands',
  usage: '!help [command]',
  permission: null,
  options: [{ name: 'command', type: 'string', description: 'Details for one command' }],

  async execute(ctx) {
    const { commands, commandList, prefix } = ctx;
    const wanted = ctx.getString('command');

    // details for a single command
    if (wanted) {
      const found = commands.get(wanted.toLowerCase());
      if (!found) {
        await ctx.replyPrivate(`No command \`${wanted}\`. Use \`${prefix}help\`.`);
        return;
      }
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`${prefix}${found.name}`)
        .setDescription(found.description ?? 'No description.')
        .addFields({ name: 'Usage', value: `\`${found.usage ?? prefix + found.name}\`` });

      if (found.options?.length) {
        embed.addFields({
          name: 'Arguments',
          value: found.options
            .map((o) => `\`${o.name}\`${o.required ? ' (required)' : ''} — ${o.description}`)
            .join('\n'),
        });
      }
      if (found.aliases?.length) {
        embed.addFields({
          name: 'Also responds to',
          value: found.aliases.map((a) => `\`${prefix}${a}\``).join(', '),
        });
      }
      if (found.permission) {
        embed.setFooter({ text: 'Requires a moderation permission in Discord.' });
      }
      await ctx.reply({ embeds: [embed] });
      return;
    }

    // Full list. Built from the loaded files — no hand-written list to drift.
    const byCategory = new Map();
    for (const command of commandList) {
      const category = command.category ?? 'Other';
      if (!byCategory.has(category)) byCategory.set(category, []);
      byCategory.get(category).push(command);
    }

    const sorted = [...byCategory.keys()].sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a);
      const ib = CATEGORY_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📖 Nina Commands')
      .setDescription(
        `Works with \`/\` or \`${prefix}\` · details on one: \`${prefix}help <command>\``
      );

    for (const category of sorted) {
      const lines = byCategory
        .get(category)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => `\`${c.usage ?? prefix + c.name}\` — ${c.description ?? ''}`)
        .join('\n');
      embed.addFields({ name: category, value: lines });
    }

    embed.setFooter({ text: 'Moderation commands require the matching permission in Discord.' });
    await ctx.reply({ embeds: [embed] });
  },
};
