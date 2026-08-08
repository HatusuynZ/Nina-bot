import { AttachmentBuilder } from 'discord.js';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(__dirname, '..', 'images');

export default {
  name: 'foto',
  aliases: ['imagem'],
  category: 'Geral',
  description: 'manda uma imagem da pasta images (aleatoria, ou pelo nome)',
  usage: '!foto [nome]',
  permission: null,

  async execute({ message, args }) {
    let files;
    try {
      files = readdirSync(IMAGES_DIR).filter((f) => /\.(png|jpe?g|gif|webp)$/i.test(f));
    } catch {
      await message.channel.send('A pasta `images` nao existe. Crie ela e coloque imagens dentro.');
      return;
    }

    if (files.length === 0) {
      await message.channel.send('A pasta `images` esta vazia.');
      return;
    }

    const requested = args.join(' ').toLowerCase();
    let chosen;
    if (requested) {
      chosen = files.find((f) => f.toLowerCase().startsWith(requested));
      if (!chosen) {
        await message.channel.send(`Nao achei imagem chamada "${requested}".`);
        return;
      }
    } else {
      chosen = files[Math.floor(Math.random() * files.length)];
    }

    await message.channel.send({ files: [new AttachmentBuilder(join(IMAGES_DIR, chosen))] });
  },
};
