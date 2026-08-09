import { AuditLogEvent, PermissionFlagsBits } from 'discord.js';
import { logEvent, COLORS } from './logger.js';

/**
 * Anti-bot / anti-nuke.
 *
 * Bot entra no servidor -> descobre QUEM o adicionou pelo registro de
 * auditoria. Se nao for gente autorizada:
 *   - remove o bot (ban por padrao)
 *   - opcionalmente bane a PESSOA que adicionou (BAN_THE_ADDER)
 *   - avisa a @Staff no canal de logs, em ingles, oferecendo desbanir se foi
 *     engano.
 *
 * Fail-closed: sem saber quem adicionou, o bot sai do mesmo jeito (mas a
 * pessoa nao e punida, porque nao da pra saber quem foi).
 */

// ---- knobs ----
// IDs autorizados a adicionar bots. O DONO do servidor sempre pode.
const AUTHORIZED_BOT_ADDERS = [
  // '123456789012345678',
];
// 'ban' (nao deixa re-adicionar) ou 'kick' (pode voltar).
const BOT_ACTION = 'ban';
// Banir tambem a pessoa que adicionou o bot nao autorizado?
const BAN_THE_ADDER = true;
// Cargo avisado quando algo acontece.
const STAFF_ROLE_NAME = 'Staff';
// ---------------

function findStaffRole(guild) {
  return guild.roles.cache.find((r) => r.name.toLowerCase() === STAFF_ROLE_NAME.toLowerCase());
}

export function registerBotGuard(client) {
  client.on('guildMemberAdd', async (member) => {
    try {
      if (!member.user.bot) return; // so bots interessam aqui
      if (member.id === client.user.id) return; // nao me removo

      const guild = member.guild;
      const me = await guild.members.fetchMe();

      const perm =
        BOT_ACTION === 'ban' ? PermissionFlagsBits.BanMembers : PermissionFlagsBits.KickMembers;
      if (!me.permissions.has(perm)) {
        console.error(`[botguard] nao tenho permissao pra ${BOT_ACTION} bots.`);
        return;
      }

      // Quem adicionou? So o registro de auditoria sabe.
      let adderId = null;
      let adderTag = 'unknown';
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
      if (authorized) return; // adicionado por gente autorizada: tudo certo

      // 1) remove o bot
      const botReason = `Unauthorized bot (added by ${adderTag})`;
      if (BOT_ACTION === 'ban') await member.ban({ reason: botReason });
      else await member.kick(botReason);

      // 2) pune a pessoa que adicionou (se autorizado e possivel)
      let adderOutcome = 'not identified';
      if (adderId && adderId !== guild.ownerId) {
        if (BAN_THE_ADDER) {
          const adderMember = await guild.members.fetch(adderId).catch(() => null);
          if (adderMember?.bannable) {
            await adderMember.ban({
              reason: `Added an unauthorized bot (${member.user.tag})`,
            });
            adderOutcome = 'banned';
          } else {
            adderOutcome = "couldn't ban (role too high or already gone)";
          }
        } else {
          adderOutcome = 'not punished (BAN_THE_ADDER off)';
        }
      }

      // 3) avisa a Staff, em ingles, com opcao de reverter
      const staffRole = findStaffRole(guild);
      const description =
        `I detected an **unauthorized bot** being added and removed it automatically.\n\n` +
        (adderOutcome === 'banned'
          ? `The member who added it was **banned** as an anti-nuke measure.\n` +
            `**If this was a mistake, unban them** — they were only trying to add a bot ` +
            `without being on the trusted list.`
          : `I could not ban the member who added it (${adderOutcome}). Please review manually.`);

      await logEvent(guild, {
        title: '🛡️ Security alert — unauthorized bot',
        color: COLORS.bad,
        description,
        content: staffRole ? `${staffRole}` : undefined,
        allowedMentions: staffRole ? { roles: [staffRole.id] } : { parse: [] },
        fields: [
          { name: 'Bot removed', value: `${member.user.tag} (${member.id})`, inline: true },
          {
            name: 'Added by',
            value: adderId ? `<@${adderId}> (${adderTag})` : 'unknown',
            inline: true,
          },
          { name: 'Member action', value: adderOutcome },
        ],
      });

      console.log(
        `[botguard] ${BOT_ACTION} bot ${member.user.tag}; adder ${adderTag} -> ${adderOutcome}.`
      );
    } catch (err) {
      console.error('[botguard] erro:', err.message);
    }
  });

  console.log('botGuard ligado');
}
