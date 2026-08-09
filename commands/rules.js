import { AttachmentBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, '..', 'assets');

// ---- knobs ----
const RULES_TITLE = '📜 RULES';
const RULES_IMAGE = 'rules.png'; // dentro de assets/
const RULES_COLOR = 0x8b0000;
const RULES_CHANNEL_KEYWORDS = ['rules', 'regras'];

// A regra 1 e o principio; as outras sao onde a linha esta, sem espaco pra
// interpretacao. Ordem = da mais geral pra mais especifica.
const RULES = [
  {
    title: 'Freedom, with one limit',
    text:
      "You're free to do whatever you want, as long as it doesn't take away someone " +
      "else's freedom. I'm not here to tell you what you can or can't do — but if you " +
      'cross the line, you already know what happens.',
  },
  {
    title: 'No NSFW',
    text: 'No sexual content, nudity, or suggestive material. Any channel, any DM through here.',
  },
  {
    title: 'No gore',
    text:
      'No real violence, injury, death, or shock content. Dark aesthetic is welcome here. ' +
      'Real blood is not.',
  },
  {
    title: 'No hate',
    text:
      'Racism, homophobia, transphobia, or any attack on who someone is. ' +
      'This one skips the warning.',
  },
  {
    title: 'No harassment',
    text:
      'No threats, stalking, or pile-ons. Lost a fight in game? It stays in game. ' +
      "Don't drag it here.",
  },
  {
    title: 'Keep private things private',
    text:
      "Nobody's address, real name, face, or socials — including your own. " +
      'What you post here, you post forever.',
  },
  {
    title: 'No advertising',
    text: "Don't come here to farm members for your server. Ask staff first if it's a partnership.",
  },
  {
    title: '13+',
    text: "Discord's rule, not mine. Underage accounts get removed.",
  },
];

const RULES_FOOTER =
  "Staff decision is final. You just read these — \"I didn't know\" won't work on me. 🖤";
// ---------------

export default {
  name: 'rules',
  aliases: ['regras'],
  category: 'Servidor',
  description: 'Posta o quadro de regras no canal de regras',
  usage: '!rules',
  permission: PermissionFlagsBits.ManageMessages,

  async execute(ctx) {
    const target =
      ctx.guild.channels.cache.find(
        (c) =>
          c.isTextBased?.() &&
          !c.isThread?.() &&
          RULES_CHANNEL_KEYWORDS.some((k) => c.name.toLowerCase().includes(k))
      ) ?? ctx.channel;

    const embed = new EmbedBuilder()
      .setColor(RULES_COLOR)
      .setTitle(RULES_TITLE)
      .setDescription(RULES.map((r, i) => `**${i + 1}. ${r.title}**\n${r.text}`).join('\n\n'))
      .setFooter({ text: RULES_FOOTER });

    const files = [];
    const imgPath = join(ASSETS_DIR, RULES_IMAGE);
    if (existsSync(imgPath)) {
      files.push(new AttachmentBuilder(imgPath, { name: RULES_IMAGE }));
      embed.setImage(`attachment://${RULES_IMAGE}`);
    }

    await target.send({ embeds: [embed], files });

    const aviso =
      files.length === 0
        ? `Regras postadas em ${target}. (Sem imagem: falta \`${RULES_IMAGE}\` em \`assets\`.)`
        : `Regras postadas em ${target}.`;
    await ctx.replyPrivate(aviso);
  },
};
