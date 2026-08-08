import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'clear',
  aliases: ['limpar', 'purge'],
  category: 'Moderação',
  description: 'apaga as ultimas N mensagens do canal',
  usage: '!clear <1-100>',
  permission: PermissionFlagsBits.ManageMessages,

  async execute({ message, args }) {
    const amount = Number.parseInt(args[0], 10);
    if (Number.isNaN(amount) || amount < 1 || amount > 100) {
      await message.reply('Uso: `!clear <numero de 1 a 100>`');
      return;
    }

    try {
      // +1 pra incluir o proprio comando. O 'true' pula mensagens com mais de
      // 14 dias, que a API do Discord se recusa a apagar em massa.
      const deleted = await message.channel.bulkDelete(amount + 1, true);
      const info = await message.channel.send(`Apaguei ${deleted.size - 1} mensagem(ns).`);
      setTimeout(() => info.delete().catch(() => {}), 4000);
    } catch {
      await message.reply(
        'Falhou. Mensagens com mais de 14 dias nao podem ser apagadas em massa pelo Discord.'
      );
    }
  },
};
