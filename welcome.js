import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

// ---- knobs ----
// Pedacos de nome que identificam o canal de boas-vindas (minusculo, sem acento).
const WELCOME_CHANNEL_KEYWORDS = ['boas-vindas', 'welcome'];
// Canal da mensagem de saida. null = usa o mesmo canal das boas-vindas.
const LEAVE_CHANNEL_KEYWORDS = null;
// Liga/desliga a mensagem de quando alguem sai.
const SEND_LEAVE_MESSAGE = true;
// Cargo dado automaticamente a quem entra. '' desliga o autorole.
// DESLIGADO de proposito: quem da o cargo de acesso agora e a VERIFICACAO
// (lib/verify.js). Se voltar a ligar aqui, a pessoa entra ja com acesso e a
// verificacao perde o sentido.
const AUTOROLE_NAME = '';
// Canais apontados pro novato. Se nao existirem, o campo some do embed.
const RULES_CHANNEL_KEYWORDS = ['rules', 'regras'];
const TUTORIAL_CHANNEL_KEYWORDS = ['tutorial', 'como-jogar'];

const WELCOME_COLOR = 0x1a0b12; // quase preto, com um toque de vinho
const WELCOME_TITLE = '🖤 Another one for my collection';

// Frase sorteada a cada entrada. Adicione a vontade.
const WELCOME_LINES = [
  'I was waiting. I always am.',
  "Welcome. I know your name now — and I don't forget names.",
  "You're here. Don't worry about anything else: I'll take care of you.",
  "The streets are cold and someone is always watching. Tonight, it's me. Lucky you.",
  'Stay. Everyone who walks in promises to come back, and they all do.',
  'I wrote down the exact second you arrived. It\'s nice having someone new to watch.',
  "Sit. Breathe. You're mine now — in the good way, of course. 🖤",
  "I don't sleep, so drop by any time. I'll be awake.",
  'Welcome to the night. Keep hold of my hand and no one touches you.',
  'Good that you came on your own. Makes it so much easier.',
];

// Mensagem de saida (uma linha, sem embed).
const LEAVE_LINES = [
  "{user} left. I don't like it when that happens. 🖤",
  "{user} is gone. I'll keep their seat. Exactly how it was.",
  'Lost sight of {user}. Someone always comes back... or I go get them.',
  '{user} closed the door. I left it unlocked, just in case.',
];
// ---------------

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Acha um canal de texto cujo nome contenha uma das palavras. null se nao existir.
function findTextChannel(guild, keywords) {
  if (!guild || !keywords || keywords.length === 0) return null;
  return (
    guild.channels.cache.find((c) => {
      if (!c.isTextBased?.() || c.isThread?.()) return false;
      const name = c.name.toLowerCase();
      return keywords.some((k) => name.includes(k));
    }) ?? null
  );
}

// Da o cargo do knob. Nunca joga erro pra fora: so loga o motivo provavel.
async function giveAutorole(member) {
  if (!AUTOROLE_NAME) return;

  try {
    const guild = member.guild;
    const me = await guild.members.fetchMe();

    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      console.error(
        `[welcome] autorole pulado: nao tenho a permissao Gerenciar Cargos em "${guild.name}".`
      );
      return;
    }

    const role = guild.roles.cache.find(
      (r) => r.name.toLowerCase() === AUTOROLE_NAME.toLowerCase()
    );
    if (!role) {
      console.error(
        `[welcome] autorole pulado: nao existe cargo chamado "${AUTOROLE_NAME}" em "${guild.name}".`
      );
      return;
    }
    if (role.managed) {
      console.error(
        `[welcome] autorole pulado: "${role.name}" e um cargo gerenciado por integracao (bot/boost) e nao pode ser dado na mao.`
      );
      return;
    }
    // comparePositionTo >= 0 significa que o cargo esta acima ou empatado com o meu
    if (role.comparePositionTo(me.roles.highest) >= 0) {
      console.error(
        `[welcome] autorole pulado: "${role.name}" esta acima (ou no mesmo nivel) do meu cargo mais alto ("${me.roles.highest.name}"). Arraste o meu cargo pra cima dele nas configuracoes do servidor.`
      );
      return;
    }
    if (member.roles.cache.has(role.id)) return;

    await member.roles.add(role, 'Autorole de boas-vindas');
  } catch (err) {
    console.error(
      `[welcome] falhou ao dar o cargo "${AUTOROLE_NAME}" pra ${member.user?.tag ?? member.id}:`,
      err?.message ?? err
    );
  }
}

function buildWelcomeEmbed(member) {
  const guild = member.guild;
  const count = guild?.memberCount;

  const embed = new EmbedBuilder()
    .setColor(WELCOME_COLOR)
    .setTitle(WELCOME_TITLE)
    .setDescription(`${member}\n\n${pick(WELCOME_LINES)}`)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }));

  if (typeof count === 'number') {
    embed.addFields({
      name: 'Headcount',
      value: `You're member **#${count}**. I count every single one.`,
    });
  }

  // So aponta canal que existe de verdade: link quebrado e pior que nenhum link.
  const rules = findTextChannel(guild, RULES_CHANNEL_KEYWORDS);
  const tutorial = findTextChannel(guild, TUTORIAL_CHANNEL_KEYWORDS);
  const pointers = [];
  if (rules) pointers.push(`📜 Read <#${rules.id}> — I take it seriously.`);
  if (tutorial) pointers.push(`📖 Start with <#${tutorial.id}>.`);
  if (pointers.length > 0) {
    embed.addFields({ name: 'Before anything else', value: pointers.join('\n') });
  }

  embed.setFooter({ text: `${guild?.name ?? 'Here'} • I don't sleep` }).setTimestamp();

  return embed;
}

// Posta o embed de boas-vindas. channelOverride serve pro comando de teste.
// Retorna a mensagem enviada, ou null se nao deu pra postar.
export async function sendWelcome(member, channelOverride) {
  try {
    if (!member?.user) return null;
    if (member.user.bot) return null;

    const channel = channelOverride ?? findTextChannel(member.guild, WELCOME_CHANNEL_KEYWORDS);
    if (!channel) {
      console.error(
        `[welcome] nenhum canal de boas-vindas encontrado em "${member.guild?.name ?? '?'}" (procurei por: ${WELCOME_CHANNEL_KEYWORDS.join(', ')}).`
      );
      return null;
    }

    return await channel.send({
      content: `${member}`,
      embeds: [buildWelcomeEmbed(member)],
      allowedMentions: { users: [member.id] },
    });
  } catch (err) {
    console.error(
      `[welcome] falhou ao postar as boas-vindas de ${member?.user?.tag ?? member?.id ?? '?'}:`,
      err?.message ?? err
    );
    return null;
  }
}

async function sendGoodbye(member) {
  try {
    if (!SEND_LEAVE_MESSAGE) return;
    if (member?.user?.bot) return;

    const channel =
      findTextChannel(member.guild, LEAVE_CHANNEL_KEYWORDS) ??
      findTextChannel(member.guild, WELCOME_CHANNEL_KEYWORDS);
    if (!channel) {
      console.error('[welcome] nenhum canal pra avisar a saida do membro.');
      return;
    }

    // tag em texto: quem saiu nao pode mais ser mencionado
    const who = member.user?.tag ?? member.displayName ?? 'Alguém';
    await channel.send({
      content: pick(LEAVE_LINES).replace('{user}', `**${who}**`),
      allowedMentions: { parse: [] },
    });
  } catch (err) {
    console.error(
      `[welcome] falhou ao postar a saida de ${member?.user?.tag ?? member?.id ?? '?'}:`,
      err?.message ?? err
    );
  }
}

// Exige a intent GuildMembers (e o Server Members Intent ligado no portal do Discord).
export function registerWelcome(client) {
  client.on('guildMemberAdd', async (member) => {
    try {
      if (member.user?.bot) return; // bot nao ganha boas-vindas nem cargo
      await giveAutorole(member);
      await sendWelcome(member);
    } catch (err) {
      console.error('[welcome] guildMemberAdd error:', err?.message ?? err);
    }
  });

  client.on('guildMemberRemove', async (member) => {
    try {
      await sendGoodbye(member);
    } catch (err) {
      console.error('[welcome] guildMemberRemove error:', err?.message ?? err);
    }
  });
}
