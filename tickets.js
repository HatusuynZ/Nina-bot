import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
} from 'discord.js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COUNTER_FILE = join(__dirname, 'tickets.json');

// ---- knobs ----
const CATEGORY_NAME = '🎫 TICKETS';
// Cargo do staff que enxerga os tickets. Se nao existir, cai pra quem tem
// permissao de Gerenciar Canais no servidor.
const STAFF_ROLE_NAME = 'Staff';
// Canal onde o historico do ticket e salvo ao fechar (opcional).
const LOG_CHANNEL_NAME = 'ticket-logs';
const PANEL_COLOR = 0x8b0000;

const TICKET_TYPES = [
  {
    id: 'bug',
    label: 'Report a bug',
    emoji: '🐛',
    description: 'Something is broken in the game',
    intro:
      'Tell me what you did, what you expected, and what actually happened. ' +
      'A screenshot or video helps a lot.',
  },
  {
    id: 'cheating',
    label: 'Report cheating',
    emoji: '🎯',
    description: 'Someone is exploiting or hacking',
    intro:
      'Who is it, what were they doing, and where? Send any proof you have ' +
      '(clip, screenshot, their username).',
  },
  {
    id: 'abuse',
    label: 'Report abuse',
    emoji: '🚨',
    description: 'Harassment, hate, or someone crossing the line',
    intro:
      'Tell me who it was and what happened. Send proof — screenshots, ' +
      'message links, anything. This stays private between you and staff.',
  },
];
// ---------------

function nextTicketNumber() {
  let data = { counter: 0 };
  if (existsSync(COUNTER_FILE)) {
    try {
      data = JSON.parse(readFileSync(COUNTER_FILE, 'utf8'));
    } catch {}
  }
  data.counter = (data.counter ?? 0) + 1;
  writeFileSync(COUNTER_FILE, JSON.stringify(data, null, 2));
  return data.counter;
}

function findStaffRole(guild) {
  return guild.roles.cache.find(
    (r) => r.name.toLowerCase() === STAFF_ROLE_NAME.toLowerCase()
  );
}

// O painel que os membros clicam pra abrir ticket.
export async function postTicketPanel(channel) {
  const embed = new EmbedBuilder()
    .setColor(PANEL_COLOR)
    .setTitle('🎫 Support tickets')
    .setDescription(
      'Need to reach the staff? Pick a reason below.\n' +
        'I open a private channel only you and the staff can see.\n\n' +
        "Don't open a ticket for no reason. I see everything. 🖤"
    );

  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket:open')
    .setPlaceholder('Pick a reason...')
    .addOptions(
      TICKET_TYPES.map((t) => ({
        label: t.label,
        value: t.id,
        description: t.description,
        emoji: t.emoji,
      }))
    );

  await channel.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)],
  });
}

async function openTicket(interaction, typeId) {
  const type = TICKET_TYPES.find((t) => t.id === typeId) ?? TICKET_TYPES[0];
  const guild = interaction.guild;
  const me = await guild.members.fetchMe();

  if (
    !me.permissions.has(PermissionFlagsBits.ManageChannels) ||
    !me.permissions.has(PermissionFlagsBits.ManageRoles)
  ) {
    await interaction.reply({
      content: 'I need **Manage Channels** and **Manage Roles** to create tickets.',
      ephemeral: true,
    });
    return;
  }

  // already has an open ticket?
  const existing = guild.channels.cache.find(
    (c) =>
      c.type === ChannelType.GuildText &&
      c.topic?.includes(`ticket-owner:${interaction.user.id}`)
  );
  if (existing) {
    await interaction.reply({
      content: `You already have an open ticket: ${existing}`,
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  // categoria
  let category = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name === CATEGORY_NAME
  );
  if (!category) {
    category = await guild.channels.create({
      name: CATEGORY_NAME,
      type: ChannelType.GuildCategory,
    });
  }

  const number = String(nextTicketNumber()).padStart(4, '0');
  const staffRole = findStaffRole(guild);

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    {
      id: me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];
  if (staffRole) {
    overwrites.push({
      id: staffRole.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  const channel = await guild.channels.create({
    name: `${type.emoji}｜${type.id}-${number}`,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `ticket-owner:${interaction.user.id} | tipo:${type.id}`,
    permissionOverwrites: overwrites,
  });

  const embed = new EmbedBuilder()
    .setColor(PANEL_COLOR)
    .setTitle(`${type.emoji} Ticket #${number} — ${type.label}`)
    .setDescription(type.intro)
    .addFields({ name: 'Opened by', value: `${interaction.user}`, inline: true })
    .setFooter({ text: 'Staff has been notified. Close the ticket with the button below when done.' });

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket:close')
      .setLabel('Close ticket')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: staffRole ? `${interaction.user} ${staffRole}` : `${interaction.user}`,
    embeds: [embed],
    components: [buttons],
  });

  await interaction.editReply({ content: `Ticket opened: ${channel}` });
}

async function closeTicket(interaction) {
  const channel = interaction.channel;
  const isOwner = channel.topic?.includes(`ticket-owner:${interaction.user.id}`);
  const isStaff = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);

  if (!isOwner && !isStaff) {
    await interaction.reply({
      content: 'Only the person who opened the ticket or staff can close it.',
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({ content: 'Closing this ticket in 5 seconds...' });

  // salva o historico no canal de logs, se existir
  try {
    const logChannel = interaction.guild.channels.cache.find(
      (c) => c.isTextBased?.() && c.name.includes(LOG_CHANNEL_NAME)
    );
    if (logChannel) {
      const messages = await channel.messages.fetch({ limit: 100 });
      const lines = [...messages.values()]
        .reverse()
        .map((m) => `[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag}: ${m.content}`)
        .join('\n');
      const buffer = Buffer.from(lines || 'empty ticket', 'utf8');
      await logChannel.send({
        content: `Ticket \`${channel.name}\` closed by ${interaction.user.tag}.`,
        files: [{ attachment: buffer, name: `${channel.name}.txt` }],
      });
    }
  } catch (err) {
    console.error('transcript error:', err);
  }

  setTimeout(() => {
    channel.delete('Ticket fechado').catch(() => {});
  }, 5000);
}

export function registerTicketHandlers(client) {
  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket:open') {
        await openTicket(interaction, interaction.values[0]);
        return;
      }
      if (interaction.isButton() && interaction.customId === 'ticket:close') {
        await closeTicket(interaction);
        return;
      }
    } catch (err) {
      console.error('ticket interaction error:', err);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        interaction
          .reply({ content: 'Something went wrong. Ping the staff.', ephemeral: true })
          .catch(() => {});
      }
    }
  });
}
