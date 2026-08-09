import { AttachmentBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, '..', 'assets');

// ---- knobs ----
const RULES_TITLE = '📜 RULES';
// Frase de abertura, acima da lista numerada.
const RULES_INTRO =
  "This is a 16+ community. No NSFW, no gore, nothing that crosses Discord's line. Keep it that way.";
const RULES_IMAGE = 'rules.png'; // dentro de assets/
const RULES_COLOR = 0x8b0000;
const RULES_CHANNEL_KEYWORDS = ['rules', 'regras'];

// A regra 1 e o principio; as outras sao onde a linha esta, sem espaco pra
// interpretacao. Ordem = da mais geral pra mais especifica.
const RULES = [
  {
    title: 'No NSFW or gore',
    text:
      'No sexual content, nudity, or gore. Dark aesthetic is welcome here — ' +
      'real nudity and real blood are not. Any channel, any DM through here.',
  },
  {
    title: "Don't cross the line",
    text:
      "Follow Discord's rules. No hate, no harassment, no doxxing, nothing illegal, " +
      'nothing that gets us shut down. Staff decides where the line is. 🖤',
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
      .setDescription(
        `${RULES_INTRO}\n\n` +
          RULES.map((r, i) => `**${i + 1}. ${r.title}**\n${r.text}`).join('\n\n')
      )
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
