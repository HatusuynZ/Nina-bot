import { AuditLogEvent, PermissionFlagsBits } from 'discord.js';
import { logEvent, COLORS } from './logger.js';

/**
 * Anti-bot: quando um bot entra no servidor, descobre QUEM o adicionou pelo
 * registro de auditoria. Se nao for gente autorizada, remove o bot na hora.
 *
 * Fail-closed: se nao der pra saber quem adicionou (sem permissao de auditoria,
 * ou a entrada nao apareceu), o bot e removido do mesmo jeito. A ideia e
 * seguranca, entao na duvida ele sai.
 */

// ---- knobs ----
// IDs autorizados a adicionar bots. O DONO do servidor sempre pode, mesmo
// sem estar aqui. Adicione IDs de gente de MUITA confianca (co-donos).
const AUTHORIZED_BOT_ADDERS = [
  // '123456789012345678',
];
// 'ban' = nao deixa re-adicionar (recomendado). 'kick' = pode voltar.
const ACTION = 'ban';
// ---------------

export function registerBotGuard(client) {
  client.on('guildMemberAdd', async (member) => {
    try {
      if (!member.user.bot) return; // so bots
      if (member.id === client.user.id) return; // nao me removo

      const guild = member.guild;
      const me = await guild.members.fetchMe();

      const perm =
        ACTION === 'ban' ? PermissionFlagsBits.BanMembers : PermissionFlagsBits.KickMembers;
      if (!me.permissions.has(perm)) {
        console.error(`[botguard] nao tenho permissao pra ${ACTION} bots.`);
        return;
      }

      // Quem adicionou? So o registro de auditoria sabe.
      let adderId = null;
      let adderTag = 'desconhecido';
      try {
        const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.BotAdd, limit: 5 });
        const entry = logs.entries.find((e) => e.target?.id === member.id);
        if (entry?.executor) {
          adderId = entry.executor.id;
          adderTag = entry.executor.tag;
        }
      } catch {
        // sem "Ver Registro de Auditoria": segue fail-closed
      }

      const authorized =
        adderId && (adderId === guild.ownerId || AUTHORIZED_BOT_ADDERS.includes(adderId));
      if (authorized) return; // bot adicionado por gente autorizada: tudo certo

      // remove o bot
      const reason = `Bot nao autorizado (adicionado por ${adderTag})`;
      if (ACTION === 'ban') {
        await member.ban({ reason });
      } else {
        await member.kick(reason);
      }

      // alerta no canal de logs — inclui QUEM adicionou, pra voce agir na pessoa
      await logEvent(guild, {
        title: '🛡️ Bot nao autorizado removido',
        color: COLORS.bad,
        fields: [
          { name: 'Bot', value: `${member.user.tag} (${member.id})`, inline: true },
          { name: 'Acao', value: ACTION === 'ban' ? 'Banido' : 'Expulso', inline: true },
          { name: 'Adicionado por', value: adderId ? `<@${adderId}> (${adderTag})` : 'desconhecido' },
        ],
      });

      console.log(`[botguard] ${ACTION} no bot ${member.user.tag} (adicionado por ${adderTag}).`);
    } catch (err) {
      console.error('[botguard] erro:', err.message);
    }
  });

  console.log('botGuard ligado');
}
