import { EmbedBuilder } from 'discord.js';

// ---- knobs (afine os valores aqui) ----
const GAME_NAME = 'the game'; // troque pelo nome publico do jogo
const CREATOR_ROLE = 'Content Creator'; // nome (ou @mencao) do cargo dado
const REVIEWER = 'the staff'; // pra quem mandar o link (ex.: '@kaiserflows')
const EMBED_COLOR = 0x8b0000;

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
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle('🎬 Content Creator Requirements')
      .setDescription(
        `Meet the requirements for **one** platform below and you can get the ` +
          `**${CREATOR_ROLE}** role.`
      )
      .addFields({
        name: '📋 Before you apply',
        value: BASE_REQUIREMENTS.map((r) => `• ${r}`).join('\n'),
      });

    for (const p of PLATFORMS) {
      embed.addFields({
        name: `${p.emoji} ${p.name}`,
        value: p.reqs.map((r) => `• ${r}`).join('\n'),
        inline: true,
      });
    }

    embed.addFields(
      { name: '✨ Alternative path', value: ALTERNATIVE },
      {
        name: '📨 How to apply',
        value:
          `Send a link to the channel that meets the requirements to ${REVIEWER} ` +
          `and wait for the review.`,
      }
    );

    embed.setFooter({ text: 'Numbers must be real. Botted stats get you denied. 🖤' });

    await ctx.reply({ embeds: [embed] });
  },
};
