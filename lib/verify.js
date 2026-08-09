import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';

/**
 * Verificacao de entrada. O servidor fica fechado pra quem chega; a pessoa
 * clica em "Verify" e ganha o cargo que libera o acesso.
 *
 * Isso barra bot e conta descartavel (nenhum dos dois clica), e o botao e
 * persistente: funciona depois de reiniciar o bot, sem republicar nada.
 *
 * PRE-REQUISITO (config sua no Discord, uma vez so):
 *   - @everyone NAO ve os canais (tira "Ver Canais" do @everyone nas categorias)
 *   - o cargo VERIFIED_ROLE_NAME VE os canais
 *   - so o canal de verificacao fica visivel pro @everyone
 */

// ---- knobs ----
const VERIFIED_ROLE_NAME = 'Member'; // cargo que libera o servidor
const PANEL_COLOR = 0x8b0000;
const PANEL_TITLE = '🔓 Verification';
const PANEL_TEXT =
  "Click the button below to verify you're human and unlock the server.\n" +
  'One click and you\'re in. 🖤';
const BUTTON_LABEL = 'Verify';
// ---------------

export async function postVerifyPanel(channel) {
  const embed = new EmbedBuilder()
    .setColor(PANEL_COLOR)
    .setTitle(PANEL_TITLE)
    .setDescription(PANEL_TEXT);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('verify:go')
      .setLabel(BUTTON_LABEL)
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success)
  );

  await channel.send({ embeds: [embed], components: [row] });
}

async function handleVerify(interaction) {
  const guild = interaction.guild;
  const role = guild.roles.cache.find(
    (r) => r.name.toLowerCase() === VERIFIED_ROLE_NAME.toLowerCase()
  );

  if (!role) {
    await interaction.reply({
      content: `Verification role "${VERIFIED_ROLE_NAME}" doesn't exist. Ping the staff.`,
      ephemeral: true,
    });
    console.error(`[verify] cargo "${VERIFIED_ROLE_NAME}" nao existe.`);
    return;
  }

  if (interaction.member.roles.cache.has(role.id)) {
    await interaction.reply({ content: "You're already verified. 🖤", ephemeral: true });
    return;
  }

  const me = await guild.members.fetchMe();
  if (!me.permissions.has(PermissionFlagsBits.ManageRoles) || role.comparePositionTo(me.roles.highest) >= 0) {
    await interaction.reply({
      content: "I can't hand out that role (missing permission or my role is too low). Ping the staff.",
      ephemeral: true,
    });
    console.error(`[verify] nao consigo dar "${role.name}" (permissao/hierarquia).`);
    return;
  }

  await interaction.member.roles.add(role, 'Verified via button');
  await interaction.reply({ content: "Verified. Welcome in. 🖤", ephemeral: true });
}

export function registerVerifyHandlers(client) {
  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isButton() && interaction.customId === 'verify:go') {
        await handleVerify(interaction);
      }
    } catch (err) {
      console.error('[verify] erro:', err.message);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        interaction
          .reply({ content: 'Something went wrong. Ping the staff.', ephemeral: true })
          .catch(() => {});
      }
    }
  });

  console.log('verify ligado');
}
