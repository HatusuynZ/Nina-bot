import { AttachmentBuilder } from 'discord.js';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(__dirname, '..', 'images');

export default {
  name: 'photo',
  aliases: ['pic'],
  category: 'General',
  description: 'Send an image from the images folder',
  usage: '/photo [name]',
  permission: null,
  options: [{ name: 'name', type: 'string', description: 'File name (without extension)' }],

  async execute(ctx) {
    let files;
    try {
      files = readdirSync(IMAGES_DIR).filter((f) => /\.(png|jpe?g|gif|webp)$/i.test(f));
    } catch {
      await ctx.replyPrivate("The `images` folder doesn't exist.");
      return;
    }

    if (files.length === 0) {
      await ctx.replyPrivate('The `images` folder is empty.');
      return;
    }

    const requested = (ctx.getString('name') ?? '').toLowerCase();
    let chosen;
    if (requested) {
      chosen = files.find((f) => f.toLowerCase().startsWith(requested));
      if (!chosen) {
        await ctx.replyPrivate(`No image named "${requested}".`);
        return;
      }
    } else {
      chosen = files[Math.floor(Math.random() * files.length)];
    }

    await ctx.reply({ files: [new AttachmentBuilder(join(IMAGES_DIR, chosen))] });
  },
};
