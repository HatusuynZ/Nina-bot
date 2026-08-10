import { EmbedBuilder } from 'discord.js';

// ---- knobs (afine os valores aqui) ----
const GAME_NAME = 'the game'; // troque pelo nome publico do jogo
const CREATOR_ROLE = 'Content Creator'; // nome (ou @mencao) do cargo dado
const EMBED_COLOR = 0x8b0000;
// Canal onde fica o painel de tickets (busca por nome). Se achar, o "How to
// apply" aponta pra la. Se nao achar, cai num texto generico.
const TICKETS_CHANNEL_KEYWORDS = ['ticket'];

// Precisa bater os requisitos de UMA plataforma. Edite a vontade.
const PLATFORMS = [
  {
    emoji: '▶️',
    name: 'YouTube',
    reqs: ['5,000 subscribers', '2,000 average views'],
  },
  {
    emoji: '🎵',
    name: 'TikTok',
    reqs: ['10,000 followers', 'consistent posting schedule'],
  },
  {
    emoji: '🔴',
    name: 'TikTok Live',
    reqs: ['5,000 followers', '150+ average live viewers (non-botted)'],
  },
  {
    emoji: '💜',
    name: 'Twitch',
    reqs: ['2,000 followers', '30+ average live viewers'],
  },
  {
    emoji: '📸',
    name: 'Instagram',
    reqs: ['8,000 followers', 'semi-strict posting schedule'],
  },
];

// Caminho alternativo pra quem nao bate nenhuma plataforma cheia.
const ALTERNATIVE = '1,000 TikTok followers **and** 500k+ total views on ' + GAME_NAME + ' content';

// Requisitos que valem pra todo mundo, antes de aplicar.
const BASE_REQUIREMENTS = [
  `At least **3 videos** featuring ${GAME_NAME}`,
  'Your channel must be **linked to your Discord profile**',
];
// ---------------------------------------

export default {
  name: 'requirements',
  aliases: ['creator', 'ccreqs'],
  category: 'Info',
  description: 'Content Creator role requirements',
  usage: '/requirements',
  permission: null,

  async execute(ctx) {
    // Acha o cargo pra marcar com a cor dele. Se CREATOR_ROLE ja for uma
    // mencao (<@&id>), usa direto; senao procura pelo nome.
    let roleMention = CREATOR_ROLE;
    if (!/^<@&\d+>$/.test(CREATOR_ROLE)) {
      const role = ctx.guild.roles.cache.find(
        (r) => r.name.toLowerCase() === CREATOR_ROLE.toLowerCase()
      );
      roleMention = role ? `<@&${role.id}>` : `**${CREATOR_ROLE}**`;
    }

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle('🎬 Content Creator Requirements')
      .setDescription(
        `# ${roleMention}\n` +
          `Meet the requirements for **one** platform below and this **ROLE** is yours.`
      )
      .addFields({
        name: '📋 Before you apply',
        value: BASE_REQUIREMENTS.map((r) => `• ${r}`).join('\n'),
      });

    // Plataformas em grade de 3 por linha (inline). Sem preenchimento vazio:
    // o Discord ja alinha, e campo vazio so cria buraco.
    for (const p of PLATFORMS) {
      embed.addFields({
        name: `${p.emoji} ${p.name}`,
        value: p.reqs.map((r) => `• ${r}`).join('\n'),
        inline: true,
      });
    }

    // Pra onde aplicar: aponta pro canal de tickets se ele existir.
    const ticketsChannel = ctx.guild.channels.cache.find(
      (c) =>
        c.isTextBased?.() &&
        TICKETS_CHANNEL_KEYWORDS.some((k) => c.name.toLowerCase().includes(k))
    );
    const applyLine = ticketsChannel
      ? `Open a **Content Creator** ticket in ${ticketsChannel} and send the link ` +
        `to your channel. The staff reviews it there.`
      : `Open a **Content Creator** ticket and send the link to your channel. ` +
        `The staff reviews it there.`;

    embed.addFields(
      { name: '✨ Alternative path', value: ALTERNATIVE },
      { name: '📨 How to apply', value: applyLine }
    );

    embed.setFooter({ text: 'Numbers must be real. Botted stats get you denied. No exceptions.' });

    // parse: [] mostra o cargo com a cor, mas NAO pinga ninguem
    await ctx.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
