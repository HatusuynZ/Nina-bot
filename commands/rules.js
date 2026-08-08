import { AttachmentBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, '..', 'assets');

// ---- knobs ----
const RULES_TITLE = '📜 RULES';
const RULES_TEXT =
  "1. You're free to do whatever you want, as long as it doesn't take away " +
  "someone else's freedom. I'm not here to tell you what you can or can't do, " +
  'but if you cross the line, you already know what happens.';
const RULES_IMAGE = 'rules.png'; // dentro de assets/
const RULES_COLOR = 0x8b0000;
// Pedacos de nome que identificam o canal de regras.
const RULES_CHANNEL_KEYWORDS = ['rules', 'regras'];
// ---------------

export default {
  name: 'rules',
  aliases: ['regras'],
  category: 'Servidor',
  description: 'posta o quadro de regras no canal de regras',
  usage: '!rules',
  permission: PermissionFlagsBits.ManageMessages,

  async execute({ message }) {
    const target =
      message.guild.channels.cache.find(
        (c) =>
          c.isTextBased?.() &&
          !c.isThread?.() &&
          RULES_CHANNEL_KEYWORDS.some((k) => c.name.toLowerCase().includes(k))
      ) ?? message.channel;

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

    if (target.id !== message.channel.id) {
      await message.reply(`Regras postadas em ${target}.`);
    }
    if (files.length === 0) {
      await message.channel.send(
        `(Sem imagem: coloque \`${RULES_IMAGE}\` na pasta \`assets\` pra ela aparecer.)`
      );
    }
  },
};
