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
  description: 'Manda uma imagem da pasta images',
  usage: '!foto [nome]',
  permission: null,
  options: [{ name: 'nome', type: 'string', description: 'Nome do arquivo (sem extensao)' }],

  async execute(ctx) {
    let files;
    try {
      files = readdirSync(IMAGES_DIR).filter((f) => /\.(png|jpe?g|gif|webp)$/i.test(f));
    } catch {
      await ctx.replyPrivate('A pasta `images` nao existe.');
      return;
    }

    if (files.length === 0) {
      await ctx.replyPrivate('A pasta `images` esta vazia.');
      return;
    }

    const requested = (ctx.getString('nome') ?? '').toLowerCase();
    let chosen;
    if (requested) {
      chosen = files.find((f) => f.toLowerCase().startsWith(requested));
      if (!chosen) {
        await ctx.replyPrivate(`Nao achei imagem chamada "${requested}".`);
        return;
      }
    } else {
      chosen = files[Math.floor(Math.random() * files.length)];
    }

    await ctx.reply({ files: [new AttachmentBuilder(join(IMAGES_DIR, chosen))] });
  },
};
