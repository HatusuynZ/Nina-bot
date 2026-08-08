import { ChannelType } from 'discord.js';

// Molde da estrutura criada pelo !setup e pelo !reset. Edite a vontade.
// type: 'text' | 'voice' | 'news' (news = canal de anuncio, com megafone)
export const SERVER_TEMPLATE = [
  {
    category: '╺━ IMPORTANT ━╸',
    channels: [
      { name: '🟥｜rules', type: 'text' },
      { name: '🚨｜announcements', type: 'news' },
      { name: '🎉｜game-updates', type: 'news' },
      { name: '👀｜sneak-peak', type: 'news' },
      { name: '📖｜us-tutorial', type: 'text' },
      { name: '🎁｜server-rewards', type: 'text' },
    ],
  },
  {
    category: '💬 COMUNIDADE',
    channels: [
      { name: '💬｜chat-geral', type: 'text' },
      { name: '🤖｜comandos', type: 'text' },
      { name: '🎨｜clipes-e-prints', type: 'text' },
      { name: '😂｜memes', type: 'text' },
    ],
  },
  {
    category: '🎮 JOGO',
    channels: [
      { name: '🥊｜procura-luta', type: 'text' },
      { name: '🎭｜roleplay', type: 'text' },
      { name: '💡｜sugestões', type: 'text' },
      { name: '🐛｜bugs', type: 'text' },
    ],
  },
  {
    category: '🔊 VOZ',
    channels: [
      { name: 'Geral', type: 'voice' },
      { name: 'Time 1', type: 'voice' },
      { name: 'Time 2', type: 'voice' },
      { name: 'AFK', type: 'voice' },
    ],
  },
];

export function channelTypeOf(type) {
  if (type === 'voice') return ChannelType.GuildVoice;
  if (type === 'news') return ChannelType.GuildAnnouncement;
  return ChannelType.GuildText;
}

// Cria o canal; se 'news' nao for suportado pelo servidor, cai pra texto.
export async function createChannel(guild, spec, parentId) {
  try {
    return await guild.channels.create({
      name: spec.name,
      type: channelTypeOf(spec.type),
      parent: parentId,
    });
  } catch (err) {
    if (spec.type === 'news') {
      return await guild.channels.create({
        name: spec.name,
        type: ChannelType.GuildText,
        parent: parentId,
      });
    }
    throw err;
  }
}
