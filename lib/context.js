/**
 * Adaptador de contexto.
 *
 * O mesmo comando precisa servir dois mundos:
 *   - mensagem de texto  (!ban @user motivo)
 *   - slash command      (/ban user: @user motivo: texto)
 *
 * Sem isso, cada comando viraria dois. O ctx normaliza as duas entradas na
 * mesma superficie: ctx.reply(), ctx.getUser('user'), ctx.member, etc.
 *
 * Regra pratica ao escrever comando: nunca toque em ctx.message ou
 * ctx.interaction direto se der pra usar um metodo do ctx. Quem toca, quebra
 * num dos dois mundos.
 */

// Le uma opcao de comando de texto pela POSICAO declarada em options[].
// Ex.: options = [user, motivo] e "!ban @fulano spam demais"
//      -> user = mencao, motivo = "spam demais" (resto da linha, se for o ultimo)
function readTextOption(ctx, spec, index) {
  const { args, message } = ctx;

  if (spec.type === 'user') {
    return message.mentions.users.first() ?? null;
  }

  // ultima opcao de texto engole o resto da linha (motivos com espaco)
  const isLast = index === ctx.optionSpecs.length - 1;
  const raw = isLast ? args.slice(index).join(' ') : args[index];
  if (raw === undefined || raw === '') return null;

  if (spec.type === 'integer') {
    const n = Number.parseInt(raw, 10);
    return Number.isNaN(n) ? null : n;
  }
  return raw;
}

class Context {
  constructor(base) {
    Object.assign(this, base);
  }

  get isSlash() {
    return Boolean(this.interaction);
  }

  // Responde a quem chamou. Em slash, a primeira resposta fecha a interacao.
  async reply(content) {
    const payload = typeof content === 'string' ? { content } : content;
    if (this.interaction) {
      if (this.interaction.deferred || this.interaction.replied) {
        return this.interaction.editReply(payload);
      }
      return this.interaction.reply(payload);
    }
    return this.message.reply(payload);
  }

  // Manda no canal, sem responder ninguem em particular.
  async send(content) {
    const payload = typeof content === 'string' ? { content } : content;
    if (this.interaction) {
      // slash exige uma resposta; se ainda nao houve, essa vira a resposta
      if (!this.interaction.deferred && !this.interaction.replied) {
        return this.interaction.reply(payload);
      }
      return this.channel.send(payload);
    }
    return this.channel.send(payload);
  }

  // Avisa que vai demorar (comando pesado). Em texto, nao faz nada.
  async defer() {
    if (this.interaction && !this.interaction.deferred && !this.interaction.replied) {
      await this.interaction.deferReply();
    }
  }

  // So quem chamou ve. Em texto nao existe: cai numa resposta normal.
  async replyPrivate(content) {
    const payload = typeof content === 'string' ? { content } : content;
    if (this.interaction) {
      if (this.interaction.deferred || this.interaction.replied) {
        return this.interaction.followUp({ ...payload, ephemeral: true });
      }
      return this.interaction.reply({ ...payload, ephemeral: true });
    }
    return this.message.reply(payload);
  }

  // Apaga a mensagem que chamou o comando. Em slash nao ha o que apagar.
  async deleteInvocation() {
    if (this.message) await this.message.delete().catch(() => {});
  }

  // ---- leitura de argumentos ----

  getUser(name) {
    if (this.interaction) return this.interaction.options.getUser(name) ?? null;
    const index = this.optionSpecs.findIndex((o) => o.name === name);
    if (index === -1) return null;
    return readTextOption(this, this.optionSpecs[index], index);
  }

  async getMember(name) {
    if (this.interaction) return this.interaction.options.getMember(name) ?? null;
    return this.message.mentions.members.first() ?? null;
  }

  getString(name) {
    if (this.interaction) return this.interaction.options.getString(name) ?? null;
    const index = this.optionSpecs.findIndex((o) => o.name === name);
    if (index === -1) return null;
    return readTextOption(this, this.optionSpecs[index], index);
  }

  getInteger(name) {
    if (this.interaction) return this.interaction.options.getInteger(name) ?? null;
    const index = this.optionSpecs.findIndex((o) => o.name === name);
    if (index === -1) return null;
    return readTextOption(this, this.optionSpecs[index], index);
  }
}

export function contextFromMessage(message, args, command, extra) {
  return new Context({
    message,
    interaction: null,
    args,
    optionSpecs: command.options ?? [],
    guild: message.guild,
    channel: message.channel,
    member: message.member,
    author: message.author,
    command,
    ...extra,
  });
}

export function contextFromInteraction(interaction, command, extra) {
  return new Context({
    message: null,
    interaction,
    args: [],
    optionSpecs: command.options ?? [],
    guild: interaction.guild,
    channel: interaction.channel,
    member: interaction.member,
    author: interaction.user,
    command,
    ...extra,
  });
}
