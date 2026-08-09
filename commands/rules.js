import { AttachmentBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, '..', 'assets');

// ---- knobs ----
const RULES_TITLE = '📜 RULES';
// A regra unica do servidor. Edite so aqui.
const RULES_TEXT =
  "1. This is a 16+ community. No NSFW, no gore, nothing that crosses Discord's line. Keep it that way.";
const RULES_IMAGE = 'rules.png'; // dentro de assets/
const RULES_COLOR = 0x8b0000;
const RULES_CHANNEL_KEYWORDS = ['rules', 'regras'];
// ---------------

export default {
  name: 'rules',
  category: 'Server',
  description: 'Post the rules board in the rules channel',
  usage: '/rules',
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
      .setDescription(RULES_TEXT);

    const files = [];
    const imgPath = join(ASSETS_DIR, RULES_IMAGE);
    if (existsSync(imgPath)) {
      files.push(new AttachmentBuilder(imgPath, { name: RULES_IMAGE }));
      embed.setImage(`attachment://${RULES_IMAGE}`);
    }

    await target.send({ embeds: [embed], files });

    const note =
      files.length === 0
        ? `Rules posted in ${target}. (No image: \`${RULES_IMAGE}\` missing from \`assets\`.)`
        : `Rules posted in ${target}.`;
    await ctx.replyPrivate(note);
  },
};
