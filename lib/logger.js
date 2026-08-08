import { EmbedBuilder, AuditLogEvent } from 'discord.js';

// ---- knobs ----
// Nome do canal de log. Pode ser so um pedaco: 'logs' acha 'mod-logs' tambem.
// Da pra fixar por ID na variavel de ambiente LOG_CHANNEL_ID (mais confiavel).
const LOG_CHANNEL_KEYWORDS = ['logs', 'log'];
// O que registrar. Desligue o que virar barulho.
const LOG = {
  moderation: true, // ban, unban, warn, clear
  memberJoin: true,
  memberLeave: true,
  messageDelete: true,
  messageEdit: true,
  tickets: true,
};
// Nao logar mensagem apagada nestes canais (evita loop e ruido).
const IGNORED_CHANNEL_KEYWORDS = ['logs', 'log'];
// Corta o conteudo citado, pra um textao nao virar um embed gigante.
const MAX_CONTENT = 900;
// ---------------

export const COLORS = {
  bad: 0xb3261e, // punicao, apagou
  warn: 0xe8a33d, // aviso, editou
  good: 0x3ba55d, // entrou, resolveu
  neutral: 0x5865f2, // informativo
};

let client = null;
// guildId -> channel. Evita varrer o cache a cada evento.
const channelCache = new Map();

function findLogChannel(guild) {
  if (!guild) return null;

  const fixedId = process.env.LOG_CHANNEL_ID;
  if (fixedId) {
    const byId = guild.channels.cache.get(fixedId);
    if (byId) return byId;
  }

  if (channelCache.has(guild.id)) {
    const cached = channelCache.get(guild.id);
    // o canal pode ter sido apagado desde a ultima vez
    if (cached && guild.channels.cache.has(cached.id)) return cached;
    channelCache.delete(guild.id);
  }

  const found =
    guild.channels.cache.find((c) => {
      if (!c.isTextBased?.() || c.isThread?.()) return false;
      const name = c.name.toLowerCase();
      return LOG_CHANNEL_KEYWORDS.some((k) => name.includes(k));
    }) ?? null;

  if (found) channelCache.set(guild.id, found);
  return found;
}

function trim(text) {
  if (!text) return '*(vazio)*';
  return text.length > MAX_CONTENT ? `${text.slice(0, MAX_CONTENT)}…` : text;
}

/**
 * Escreve uma entrada no canal de log. Nunca joga erro pra fora: log que
 * derruba o bot e pior que log nenhum.
 */
export async function logEvent(guild, { title, description, color, fields, footer }) {
  try {
    const channel = findLogChannel(guild);
    if (!channel) return; // sem canal de log configurado: silencio

    const embed = new EmbedBuilder()
      .setColor(color ?? COLORS.neutral)
      .setTitle(title)
      .setTimestamp();

    if (description) embed.setDescription(description);
    if (fields?.length) embed.addFields(fields);
    if (footer) embed.setFooter({ text: footer });

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('[logger] falhou ao escrever no canal de log:', err.message);
  }
}

/** Acao de moderacao feita pela Nina (chamado pelos comandos). */
export async function logModeration(guild, { action, target, moderator, reason, extra }) {
  if (!LOG.moderation) return;

  const fields = [];
  if (target) fields.push({ name: 'Alvo', value: target, inline: true });
  if (moderator) fields.push({ name: 'Moderador', value: moderator, inline: true });
  if (reason) fields.push({ name: 'Motivo', value: reason });
  if (extra) fields.push(...extra);

  await logEvent(guild, { title: action, color: COLORS.bad, fields });
}

/** Liga os eventos que o proprio Discord dispara. */
export function initLogger(discordClient) {
  client = discordClient;

  if (LOG.messageDelete) {
    client.on('messageDelete', async (message) => {
      try {
        if (!message.guild) return;
        if (message.author?.bot) return;
        // nao logar o proprio canal de log
        const name = message.channel?.name?.toLowerCase() ?? '';
        if (IGNORED_CHANNEL_KEYWORDS.some((k) => name.includes(k))) return;

        // Mensagem fora do cache vem parcial: sem autor e sem conteudo.
        // Vale registrar mesmo assim — some do chat de qualquer jeito.
        const autor = message.author ? `${message.author.tag}` : 'desconhecido (fora do cache)';

        // Quem apagou? So o registro de auditoria sabe, e so quando foi outra
        // pessoa. Apagou a propria mensagem nao gera entrada de auditoria.
        let quemApagou = null;
        try {
          const logs = await message.guild.fetchAuditLogs({
            type: AuditLogEvent.MessageDelete,
            limit: 1,
          });
          const entry = logs.entries.first();
          // entrada velha ou de outro alvo nao serve
          if (
            entry &&
            Date.now() - entry.createdTimestamp < 5000 &&
            entry.target?.id === message.author?.id
          ) {
            quemApagou = entry.executor?.tag ?? null;
          }
        } catch {
          // sem permissao Ver Registro de Auditoria: segue sem esse campo
        }

        const fields = [
          { name: 'Autor', value: autor, inline: true },
          { name: 'Canal', value: `${message.channel}`, inline: true },
        ];
        if (quemApagou) fields.push({ name: 'Apagada por', value: quemApagou, inline: true });
        fields.push({ name: 'Conteudo', value: trim(message.content) });

        await logEvent(message.guild, {
          title: '🗑️ Mensagem apagada',
          color: COLORS.bad,
          fields,
        });
      } catch (err) {
        console.error('[logger] messageDelete:', err.message);
      }
    });
  }

  if (LOG.messageEdit) {
    client.on('messageUpdate', async (before, after) => {
      try {
        if (!after.guild) return;
        if (after.author?.bot) return;
        if (before.content === after.content) return; // embed carregando nao e edicao
        const name = after.channel?.name?.toLowerCase() ?? '';
        if (IGNORED_CHANNEL_KEYWORDS.some((k) => name.includes(k))) return;

        await logEvent(after.guild, {
          title: '✏️ Mensagem editada',
          color: COLORS.warn,
          description: `[Ir para a mensagem](${after.url})`,
          fields: [
            { name: 'Autor', value: after.author?.tag ?? 'desconhecido', inline: true },
            { name: 'Canal', value: `${after.channel}`, inline: true },
            { name: 'Antes', value: trim(before.content) },
            { name: 'Depois', value: trim(after.content) },
          ],
        });
      } catch (err) {
        console.error('[logger] messageUpdate:', err.message);
      }
    });
  }

  if (LOG.memberJoin) {
    client.on('guildMemberAdd', async (member) => {
      try {
        const idade = Date.now() - member.user.createdTimestamp;
        const dias = Math.floor(idade / 86_400_000);
        await logEvent(member.guild, {
          title: '📥 Entrou no servidor',
          color: COLORS.good,
          fields: [
            { name: 'Membro', value: `${member.user.tag} (${member.id})` },
            // conta recem-criada e o sinal classico de raid/alt
            { name: 'Conta criada ha', value: `${dias} dia(s)`, inline: true },
            { name: 'Total agora', value: `${member.guild.memberCount}`, inline: true },
          ],
        });
      } catch (err) {
        console.error('[logger] guildMemberAdd:', err.message);
      }
    });
  }

  if (LOG.memberLeave) {
    client.on('guildMemberRemove', async (member) => {
      try {
        await logEvent(member.guild, {
          title: '📤 Saiu do servidor',
          color: COLORS.warn,
          fields: [
            { name: 'Membro', value: `${member.user?.tag ?? member.id} (${member.id})` },
            { name: 'Total agora', value: `${member.guild.memberCount}`, inline: true },
          ],
        });
      } catch (err) {
        console.error('[logger] guildMemberRemove:', err.message);
      }
    });
  }

  console.log('logger ligado');
}
