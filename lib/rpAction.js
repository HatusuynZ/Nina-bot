import { EmbedBuilder } from 'discord.js';

/**
 * Acao de roleplay: "X beijou Y", com um gif relacionado.
 *
 * O gif vem de APIs publicas de anime (sem chave). Tres provedores em cascata:
 * se um bloquear ou cair, tenta o proximo. Se todos falharem, o comando ainda
 * posta o texto — so sem imagem. Nunca quebra por causa do gif.
 */

// Cada provedor: monta a URL da categoria e extrai o link do gif do JSON.
// Ordem = ordem de tentativa.
const PROVIDERS = [
  {
    name: 'waifu.pics',
    url: (cat) => `https://api.waifu.pics/sfw/${cat}`,
    pick: (data) => data?.url ?? null,
  },
  {
    name: 'nekos.best',
    url: (cat) => `https://nekos.best/api/v2/${cat}`,
    pick: (data) => data?.results?.[0]?.url ?? null,
  },
  {
    name: 'otakugifs',
    url: (cat) => `https://api.otakugifs.xyz/gif?reaction=${cat}&format=gif`,
    pick: (data) => data?.url ?? null,
  },
];

async function fetchGif(category) {
  for (const provider of PROVIDERS) {
    try {
      const res = await fetch(provider.url(category), {
        headers: { 'User-Agent': 'Nina-Bot (Discord)' },
        signal: AbortSignal.timeout(5000), // API lenta nao segura o comando
      });
      if (!res.ok) continue;
      const gif = provider.pick(await res.json());
      if (gif) return gif;
    } catch {
      // esse provedor falhou; tenta o proximo
    }
  }
  return null; // todos falharam: o comando posta so o texto
}

/**
 * @param ctx            contexto do comando
 * @param opts.category  categoria do gif (ex.: 'kiss') — tem que existir nos provedores
 * @param opts.color     cor do embed
 * @param opts.line(a,b) frase com alvo:  (autor, alvo) => texto
 * @param opts.selfLine(a) frase quando o alvo e o proprio autor (opcional)
 */
export async function sendRpAction(ctx, { category, color, line, selfLine }) {
  const target = await ctx.getMember('user');
  if (!target) {
    await ctx.replyPrivate(`Usage: \`!${category} @user\``);
    return;
  }

  // gif pode demorar; slash exige resposta em 3s
  await ctx.defer();

  const author = ctx.member ?? ctx.author;
  const authorName = author.displayName ?? ctx.author.username;
  const targetName = target.displayName ?? target.user.username;

  const isSelf = target.id === ctx.author.id;
  const text = isSelf && selfLine ? selfLine(authorName) : line(authorName, targetName);

  const gif = await fetchGif(category);
  const embed = new EmbedBuilder().setColor(color).setDescription(text);
  if (gif) embed.setImage(gif);

  await ctx.reply({
    content: isSelf ? undefined : `${target}`,
    embeds: [embed],
    allowedMentions: { users: [target.id] },
  });
}
