import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  AttachmentBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} from 'discord.js';
import { readdirSync, readFileSync, writeFileSync, existsSync, watch } from 'node:fs';
import { postTicketPanel, registerTicketHandlers } from './tickets.js';
import { registerWelcome, sendWelcome } from './welcome.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Blindagem: um erro solto nao pode derrubar o bot inteiro.
// Loga e segue vivo, em vez de morrer e ficar offline ate alguem perceber.
process.on('unhandledRejection', (reason) => {
  console.error('[guard] promise rejeitada sem tratamento:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[guard] excecao nao capturada:', err);
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(__dirname, 'images');
const ASSETS_DIR = join(__dirname, 'assets');
const WARNS_FILE = join(__dirname, 'warns.json');

// ---- knobs (mexa aqui pra ajustar o comportamento) ----
const PREFIX = '!';
// Ban automatico depois de X warns (0 = desligado).
const AUTO_BAN_AFTER = 0;

// --- Respostas automaticas ---
// Tudo mora em responses.json. Edite aquele arquivo (o bot recarrega sozinho).
const RESPONSES_FILE = join(__dirname, 'responses.json');

// tira acento, pontuacao e espaco sobrando pra comparar so o "miolo" da frase
function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

let responses = { cooldownSeconds: 4, chance: 1, groups: [], patience: null };
let triggerIndex = []; // [{ needle, group }] ordenado do mais especifico pro mais generico

function loadResponses() {
  try {
    const parsed = JSON.parse(readFileSync(RESPONSES_FILE, 'utf8'));
    const index = [];
    for (const group of parsed.groups ?? []) {
      for (const trigger of group.triggers ?? []) {
        const needle = normalize(trigger);
        if (needle) index.push({ needle, group });
      }
    }
    // gatilho mais longo ganha: "nina eu te amo" vence "nina"
    index.sort((a, b) => b.needle.length - a.needle.length);
    responses = parsed;
    triggerIndex = index;
    console.log(
      `responses.json carregado: ${parsed.groups?.length ?? 0} grupos, ${index.length} gatilhos`
    );
  } catch (err) {
    console.error('ERRO em responses.json (mantive a versao anterior):', err.message);
  }
}
loadResponses();

// recarrega sozinho quando voce salva o arquivo (nao precisa reiniciar o bot)
let reloadTimer = null;
if (existsSync(RESPONSES_FILE)) {
  watch(RESPONSES_FILE, () => {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(loadResponses, 300);
  });
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// userId -> timestamp da ultima resposta automatica
const cooldowns = new Map();

// --- Paciencia da Nina (anti-spam por pessoa) ---
// userId -> { hits: number[], restUntil: number, level: number }
const patienceState = new Map();

function checkPatience(userId) {
  const cfg = responses.patience;
  if (!cfg) return { action: 'reply' };

  const now = Date.now();
  const windowMs = (cfg.windowMinutes ?? 3) * 60_000;
  const state = patienceState.get(userId) ?? { hits: [], restUntil: 0, level: 0 };

  // ainda descansando dessa pessoa?
  if (state.restUntil > now) {
    patienceState.set(userId, state);
    return { action: 'silent' };
  }
  // acabou de voltar do descanso
  if (state.restUntil !== 0) {
    state.restUntil = 0;
    state.hits = [];
    state.level = 0;
    patienceState.set(userId, state);
    return { action: 'reply', back: pick(cfg.backReplies ?? ['Voltei.']) };
  }

  state.hits = state.hits.filter((t) => now - t < windowMs);
  state.hits.push(now);

  // acha o nivel mais alto que essa pessoa estourou
  const levels = [...(cfg.levels ?? [])].sort((a, b) => a.hits - b.hits);
  let triggered = null;
  for (const level of levels) {
    if (state.hits.length >= level.hits) triggered = level;
  }

  if (triggered) {
    const levelNumber = levels.indexOf(triggered) + 1;
    if (levelNumber > state.level) {
      state.level = levelNumber;
      patienceState.set(userId, state);
      if (triggered.rest) {
        state.restUntil = now + (cfg.restMinutes ?? 10) * 60_000;
        return { action: 'rest', text: pick(triggered.replies) };
      }
      return { action: 'annoyed', text: pick(triggered.replies) };
    }
  }

  patienceState.set(userId, state);
  return { action: 'reply' };
}
// ----------------------------------------------------

// --- Mensagem de regras (comando !rules) ---
const RULES_TITLE = '📜 RULES';
const RULES_TEXT =
  "1. You're free to do whatever you want, as long as it doesn't take away " +
  "someone else's freedom. I'm not here to tell you what you can or can't do, " +
  'but if you cross the line, you already know what happens.';
const RULES_IMAGE = 'rules.png'; // arquivo dentro da pasta assets/
const RULES_COLOR = 0x8b0000; // cor da borda do embed (vermelho escuro)
// -------------------------------------------------------

// Molde da estrutura criada pelo !setup. Edite a vontade.
// type: 'text' ou 'voice'.
const SERVER_TEMPLATE = [
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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers, // exige SERVER MEMBERS INTENT ligado no portal
  ],
});

// ---------- warns storage (arquivo local warns.json) ----------
function loadWarns() {
  if (!existsSync(WARNS_FILE)) return {};
  try {
    return JSON.parse(readFileSync(WARNS_FILE, 'utf8'));
  } catch {
    return {};
  }
}
function saveWarns(data) {
  writeFileSync(WARNS_FILE, JSON.stringify(data, null, 2));
}
function getUserWarns(guildId, userId) {
  const data = loadWarns();
  return data?.[guildId]?.[userId] ?? [];
}
function addWarn(guildId, userId, entry) {
  const data = loadWarns();
  data[guildId] ??= {};
  data[guildId][userId] ??= [];
  data[guildId][userId].push(entry);
  saveWarns(data);
  return data[guildId][userId].length;
}
// --------------------------------------------------------------

client.once('clientReady', () => {
  console.log(`Bot online como ${client.user.tag}`);
});

registerTicketHandlers(client);
registerWelcome(client);

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return; // ignora DMs

  // Respostas automaticas (nao usam prefixo).
  // Comandos passam direto: a paciencia da Nina NUNCA bloqueia moderacao.
  if (!message.content.startsWith(PREFIX)) {
    const haystack = normalize(message.content);
    const match = triggerIndex.find((entry) => haystack.includes(entry.needle));
    if (!match) return;

    const userId = message.author.id;
    const now = Date.now();

    // cooldown curto: evita responder mensagem atras de mensagem
    const cooldownMs = (responses.cooldownSeconds ?? 4) * 1000;
    const last = cooldowns.get(userId) ?? 0;

    const patience = checkPatience(userId);
    if (patience.action === 'silent') return; // descansando dessa pessoa

    if (patience.action === 'rest' || patience.action === 'annoyed') {
      cooldowns.set(userId, now);
      message.reply(patience.text);
      return;
    }

    if (now - last < cooldownMs) return;
    cooldowns.set(userId, now);

    const reply = pick(match.group.replies ?? ['...']);
    message.reply(patience.back ? `${patience.back}\n\n${reply}` : reply);
    return;
  }

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  // ---------------- !help / !comandos ----------------
  if (command === 'help' || command === 'comandos') {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📖 Comandos da Lyche')
      .setDescription(`Prefixo: \`${PREFIX}\``)
      .addFields(
        {
          name: '🛡️ Moderação',
          value:
            '`!ban @user [motivo]` — bane\n' +
            '`!unban <id>` — desbane pelo ID\n' +
            '`!warn @user [motivo]` — dá um warn\n' +
            '`!warns @user` — lista os warns\n' +
            '`!clear <1-100>` — apaga mensagens',
        },
        {
          name: '🏗️ Servidor',
          value:
            '`!setup` — cria a estrutura de canais (sem apagar nada)\n' +
            '`!reset confirmar` — APAGA tudo e recria do zero\n' +
            '`!rules` — posta o embed de regras no canal rules\n' +
            '`!ticketpanel` — posta o painel de tickets no canal atual\n' +
            '`!testwelcome [@user]` — testa as boas-vindas no canal atual',
        },
        {
          name: '💬 Geral',
          value:
            '`!say <texto>` — o bot fala por você\n' +
            '`!foto [nome]` — manda imagem da pasta\n' +
            '`!oi` — cumprimenta\n' +
            '`!ping` — testa se está online\n' +
            '`!help` — mostra esta lista',
        }
      )
      .setFooter({ text: 'Comandos de moderação exigem a permissão equivalente no Discord.' });

    message.channel.send({ embeds: [embed] });
    return;
  }

  // ---------------- !ping ----------------
  if (command === 'ping') {
    message.reply('pong');
    return;
  }

  // ---------------- !oi ----------------
  if (command === 'oi') {
    message.channel.send('Oi! Eu sou a Lyche.');
    return;
  }

  // ---------------- !foto [nome] ----------------
  if (command === 'foto') {
    let files;
    try {
      files = readdirSync(IMAGES_DIR).filter((f) =>
        /\.(png|jpe?g|gif|webp)$/i.test(f)
      );
    } catch {
      message.channel.send('Nao consegui abrir a pasta images.');
      return;
    }
    if (files.length === 0) {
      message.channel.send('A pasta images esta vazia. Coloque uma imagem la.');
      return;
    }
    const requested = args.join(' ').toLowerCase();
    let chosen;
    if (requested) {
      chosen = files.find((f) => f.toLowerCase().startsWith(requested));
      if (!chosen) {
        message.channel.send(`Nao achei imagem chamada "${requested}".`);
        return;
      }
    } else {
      chosen = files[Math.floor(Math.random() * files.length)];
    }
    const attachment = new AttachmentBuilder(join(IMAGES_DIR, chosen));
    message.channel.send({ files: [attachment] });
    return;
  }

  // ---------------- !testwelcome ----------------
  if (command === 'testwelcome') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      message.reply('Voce nao tem permissao pra isso (Gerenciar Canais).');
      return;
    }
    // manda no canal atual pra nao poluir o de boas-vindas de verdade
    const target = message.mentions.members.first() ?? message.member;
    const sent = await sendWelcome(target, message.channel);
    if (!sent) message.reply('Nao consegui postar. Olha o console pra ver o motivo.');
    return;
  }

  // ---------------- !ticketpanel ----------------
  if (command === 'ticketpanel' || command === 'painelticket') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      message.reply('Voce nao tem permissao pra isso (Gerenciar Canais).');
      return;
    }
    try {
      await postTicketPanel(message.channel);
      await message.delete().catch(() => {});
    } catch (err) {
      message.reply('Falhou ao postar o painel.');
      console.error('ticketpanel error:', err);
    }
    return;
  }

  // ---------------- !rules ----------------
  if (command === 'rules') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      message.reply('Voce nao tem permissao pra isso (Gerenciar Mensagens).');
      return;
    }
    // acha o canal "rules"; se nao achar, usa o canal atual
    const target =
      message.guild.channels.cache.find(
        (c) => c.isTextBased?.() && c.name.toLowerCase().includes('rules')
      ) || message.channel;

    const embed = new EmbedBuilder()
      .setColor(RULES_COLOR)
      .setTitle(RULES_TITLE)
      .setDescription(RULES_TEXT);

    const files = [];
    const imgPath = join(ASSETS_DIR, RULES_IMAGE);
    if (existsSync(imgPath)) {
      files.push(new AttachmentBuilder(imgPath, { name: RULES_IMAGE }));
      embed.setImage(`attachment://${RULES_IMAGE}`);
    }

    try {
      await target.send({ embeds: [embed], files });
      if (target.id !== message.channel.id) {
        message.reply(`Regras postadas em ${target}.`);
      }
      if (files.length === 0) {
        message.channel.send(
          `(Sem imagem: coloque o arquivo "${RULES_IMAGE}" na pasta assets pra ela aparecer.)`
        );
      }
    } catch (err) {
      message.reply('Falhou ao postar as regras. Confere minhas permissoes no canal.');
      console.error('rules error:', err);
    }
    return;
  }

  // ---------------- !setup ----------------
  if (command === 'setup') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      message.reply('Voce nao tem permissao pra isso (Gerenciar Canais).');
      return;
    }
    const guild = message.guild;
    const me = await guild.members.fetchMe();
    if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      message.reply(
        'Eu nao tenho a permissao Gerenciar Canais. Me da essa permissao no meu cargo (ou me re-convida).'
      );
      return;
    }

    const status = await message.channel.send('Criando a estrutura do servidor...');
    let created = 0;
    let skipped = 0;

    try {
      for (const group of SERVER_TEMPLATE) {
        let category = guild.channels.cache.find(
          (c) => c.type === ChannelType.GuildCategory && c.name === group.category
        );
        if (!category) {
          category = await guild.channels.create({
            name: group.category,
            type: ChannelType.GuildCategory,
          });
          created++;
        } else {
          skipped++;
        }

        for (const ch of group.channels) {
          const exists = guild.channels.cache.find(
            (c) => c.name === ch.name && c.parentId === category.id
          );
          if (exists) {
            skipped++;
            continue;
          }
          let type = ChannelType.GuildText;
          if (ch.type === 'voice') type = ChannelType.GuildVoice;
          else if (ch.type === 'news') type = ChannelType.GuildAnnouncement;
          try {
            await guild.channels.create({ name: ch.name, type, parent: category.id });
          } catch (err) {
            // se canal de anuncio nao for suportado, cria como texto
            if (ch.type === 'news') {
              await guild.channels.create({
                name: ch.name,
                type: ChannelType.GuildText,
                parent: category.id,
              });
            } else {
              throw err;
            }
          }
          created++;
        }
      }
      await status.edit(
        `Pronto! Criei ${created} item(ns) e pulei ${skipped} que ja existiam.`
      );
    } catch (err) {
      await status.edit('Deu erro no meio do caminho. Confere minhas permissoes.');
      console.error('setup error:', err);
    }
    return;
  }

  // ---------------- !reset [confirmar] ----------------
  if (command === 'reset') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      message.reply('Voce nao tem permissao pra isso (Gerenciar Canais).');
      return;
    }
    const guild = message.guild;
    const me = await guild.members.fetchMe();
    if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      message.reply('Eu nao tenho a permissao Gerenciar Canais.');
      return;
    }
    if (args[0] !== 'confirmar') {
      message.reply(
        'ATENCAO: isso APAGA todos os canais atuais (e todas as mensagens deles) e recria a estrutura do zero. Nao da pra desfazer.\nSe tem certeza, digite: !reset confirmar'
      );
      return;
    }

    await message.channel.send('Apagando canais e recriando a estrutura...');

    // 1. apaga todos os canais atuais
    for (const ch of [...guild.channels.cache.values()]) {
      try {
        await ch.delete('Reset do servidor via !reset');
      } catch (err) {
        console.error('nao consegui apagar', ch.name, err.message);
      }
    }

    // 2. cria a estrutura do zero
    let firstText = null;
    try {
      for (const group of SERVER_TEMPLATE) {
        const category = await guild.channels.create({
          name: group.category,
          type: ChannelType.GuildCategory,
        });
        for (const ch of group.channels) {
          let type = ChannelType.GuildText;
          if (ch.type === 'voice') type = ChannelType.GuildVoice;
          else if (ch.type === 'news') type = ChannelType.GuildAnnouncement;
          let createdCh;
          try {
            createdCh = await guild.channels.create({
              name: ch.name,
              type,
              parent: category.id,
            });
          } catch {
            createdCh = await guild.channels.create({
              name: ch.name,
              type: ChannelType.GuildText,
              parent: category.id,
            });
          }
          if (!firstText && type !== ChannelType.GuildVoice) firstText = createdCh;
        }
      }
      if (firstText) firstText.send('Estrutura recriada do zero.');
    } catch (err) {
      console.error('reset create error:', err);
    }
    return;
  }

  // ---------------- !say <texto> ----------------
  if (command === 'say') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      message.reply('Voce nao tem permissao pra isso (Gerenciar Mensagens).');
      return;
    }
    const text = args.join(' ');
    if (!text) {
      message.reply('Uso: !say <texto>');
      return;
    }
    try {
      await message.delete();
    } catch {}
    // parse: [] impede que !say @everyone marque geral
    message.channel.send({ content: text, allowedMentions: { parse: [] } });
    return;
  }

  // ---------------- !ban @user [motivo] ----------------
  if (command === 'ban') {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      message.reply('Voce nao tem permissao pra banir (Banir Membros).');
      return;
    }
    const target = message.mentions.members.first();
    if (!target) {
      message.reply('Uso: !ban @usuario [motivo]');
      return;
    }
    if (target.id === message.author.id) {
      message.reply('Voce nao pode se banir.');
      return;
    }
    if (!target.bannable) {
      message.reply(
        'Nao consigo banir esse usuario (o cargo dele e maior/igual ao meu, ou ele e o dono).'
      );
      return;
    }
    const reason =
      args.slice(1).join(' ') || 'Sem motivo informado';
    try {
      await target.ban({ reason });
      message.channel.send(`Banido: ${target.user.tag}. Motivo: ${reason}`);
    } catch (err) {
      message.reply('Falhou ao banir. Confere se eu tenho a permissao Banir Membros.');
      console.error('ban error:', err);
    }
    return;
  }

  // ---------------- !unban <id> ----------------
  if (command === 'unban') {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      message.reply('Voce nao tem permissao pra desbanir (Banir Membros).');
      return;
    }
    // Usuario banido nao esta no servidor, entao vai por ID (nao da pra marcar).
    const userId = (args[0] || '').replace(/[<@!>]/g, '');
    if (!/^\d{17,20}$/.test(userId)) {
      message.reply('Uso: !unban <ID do usuario>. (Ative o Modo Desenvolvedor pra copiar o ID.)');
      return;
    }
    try {
      await message.guild.bans.remove(userId);
      message.channel.send(`Desbanido: ${userId}.`);
    } catch (err) {
      message.reply('Falhou. Confere se o ID esta certo e se essa pessoa estava mesmo banida.');
      console.error('unban error:', err);
    }
    return;
  }

  // ---------------- !warn @user [motivo] ----------------
  if (command === 'warn') {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      message.reply('Voce nao tem permissao pra dar warn (Expulsar Membros).');
      return;
    }
    const target = message.mentions.members.first();
    if (!target) {
      message.reply('Uso: !warn @usuario [motivo]');
      return;
    }
    if (target.user.bot) {
      message.reply('Nao da pra dar warn em bot.');
      return;
    }
    const reason = args.slice(1).join(' ') || 'Sem motivo informado';
    const total = addWarn(message.guild.id, target.id, {
      reason,
      mod: message.author.tag,
      date: new Date().toISOString(),
    });
    message.channel.send(
      `${target.user.tag} levou um warn. Agora tem ${total} warn(s). Motivo: ${reason}`
    );

    if (AUTO_BAN_AFTER > 0 && total >= AUTO_BAN_AFTER && target.bannable) {
      try {
        await target.ban({ reason: `Auto-ban: ${AUTO_BAN_AFTER} warns` });
        message.channel.send(
          `${target.user.tag} atingiu ${AUTO_BAN_AFTER} warns e foi banido.`
        );
      } catch (err) {
        console.error('auto-ban error:', err);
      }
    }
    return;
  }

  // ---------------- !warns @user ----------------
  if (command === 'warns') {
    const target = message.mentions.members.first() || message.member;
    const list = getUserWarns(message.guild.id, target.id);
    if (list.length === 0) {
      message.channel.send(`${target.user.tag} nao tem nenhum warn.`);
      return;
    }
    const lines = list
      .map((w, i) => `${i + 1}. ${w.reason} (por ${w.mod})`)
      .join('\n');
    message.channel.send(
      `${target.user.tag} tem ${list.length} warn(s):\n${lines}`
    );
    return;
  }

  // ---------------- !clear <n> ----------------
  if (command === 'clear') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      message.reply('Voce nao tem permissao pra limpar (Gerenciar Mensagens).');
      return;
    }
    const amount = parseInt(args[0], 10);
    if (isNaN(amount) || amount < 1 || amount > 100) {
      message.reply('Uso: !clear <numero de 1 a 100>');
      return;
    }
    try {
      // +1 pra incluir o proprio comando; filtro true ignora msgs > 14 dias
      const deleted = await message.channel.bulkDelete(amount + 1, true);
      const info = await message.channel.send(
        `Apaguei ${deleted.size - 1} mensagem(ns).`
      );
      setTimeout(() => info.delete().catch(() => {}), 4000);
    } catch (err) {
      message.reply(
        'Falhou ao limpar. Mensagens com mais de 14 dias nao podem ser apagadas em massa.'
      );
      console.error('clear error:', err);
    }
    return;
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token || token === 'COLE_O_TOKEN_AQUI') {
  console.error(
    'ERRO: DISCORD_TOKEN nao configurado.\n' +
      '  - Na Discloud: painel da aplicacao > Variaveis > DISCORD_TOKEN > salvar > REINICIAR.\n' +
      '  - No PC local: coloque DISCORD_TOKEN=<token> no arquivo .env.'
  );
  process.exit(1);
}

client.login(token);
