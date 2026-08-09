import { EmbedBuilder } from 'discord.js';
import { getDb, isDbReady } from './db.js';

/**
 * Sistema de nivel. Desenhado pra aguentar servidor grande:
 *
 *  - COOLDOWN: conta XP no maximo 1x por minuto por pessoa. Sem isso, spam de
 *    mensagem vira spam de escrita no banco.
 *  - Escrita em LOTE: o XP se acumula na memoria e vai pro banco a cada 30s
 *    num bulkWrite so — nao uma escrita por mensagem.
 *  - So gente ATIVA fica em memoria; quem parou de falar e removido do cache.
 *
 * Curva estilo MEE6: subir de nivel custa cada vez mais.
 */

// ---- knobs ----
const XP_MIN = 15;
const XP_MAX = 25;
const COOLDOWN_MS = 60_000;
const FLUSH_MS = 30_000;
const EVICT_IDLE_MS = 600_000; // tira do cache quem ficou 10min sem falar
const LEVELUP_COLOR = 0x9b59b6;
// ---------------

// XP pra ir do nivel L pro L+1.
export function xpForLevel(level) {
  return 5 * level * level + 50 * level + 100;
}
// XP total acumulado pra ESTAR no nivel L.
export function totalXpForLevel(level) {
  let total = 0;
  for (let i = 0; i < level; i++) total += xpForLevel(i);
  return total;
}
// Nivel correspondente a um total de XP.
export function levelFromXp(xp) {
  let level = 0;
  while (xp >= totalXpForLevel(level + 1)) level++;
  return level;
}

const key = (guildId, userId) => `${guildId}:${userId}`;

const cooldowns = new Map(); // key -> timestamp
const cache = new Map(); // key -> { guildId, userId, xp, level, dirty, lastSeen }

// caches de config por guild (recarregados quando um comando muda)
const levelRolesCache = new Map(); // guildId -> [{ level, roleId }]
const guildConfigCache = new Map(); // guildId -> { levelUpChannelId, levelUpEnabled }

export function invalidateGuildCaches(guildId) {
  levelRolesCache.delete(guildId);
  guildConfigCache.delete(guildId);
}

async function getLevelRoles(guildId) {
  if (levelRolesCache.has(guildId)) return levelRolesCache.get(guildId);
  const rows = await getDb().collection('levelroles').find({ guildId }).toArray();
  levelRolesCache.set(guildId, rows);
  return rows;
}

async function getGuildConfig(guildId) {
  if (guildConfigCache.has(guildId)) return guildConfigCache.get(guildId);
  const doc = (await getDb().collection('guildconfig').findOne({ _id: guildId })) ?? {};
  guildConfigCache.set(guildId, doc);
  return doc;
}

// XP de uma mensagem. Chamado pra cada mensagem, entao sai cedo se puder.
export async function handleXp(message) {
  if (!isDbReady()) return;

  const guildId = message.guild.id;
  const userId = message.author.id;
  const k = key(guildId, userId);
  const now = Date.now();

  if (now - (cooldowns.get(k) ?? 0) < COOLDOWN_MS) return;
  cooldowns.set(k, now);

  let entry = cache.get(k);
  if (!entry) {
    const doc = await getDb().collection('levels').findOne({ _id: k });
    entry = { guildId, userId, xp: doc?.xp ?? 0, level: doc?.level ?? 0, dirty: false };
    cache.set(k, entry);
  }

  const gain = XP_MIN + Math.floor(Math.random() * (XP_MAX - XP_MIN + 1));
  entry.xp += gain;
  entry.lastSeen = now;
  entry.dirty = true;

  const newLevel = levelFromXp(entry.xp);
  if (newLevel > entry.level) {
    entry.level = newLevel;
    await onLevelUp(message, newLevel).catch((e) =>
      console.error('[level] onLevelUp:', e.message)
    );
  }
}

async function onLevelUp(message, level) {
  const guild = message.guild;

  // cargo por nivel: da todos os cargos ate esse nivel (caso tenha pulado)
  const roles = await getLevelRoles(guild.id);
  const earned = roles.filter((r) => r.level <= level);
  for (const r of earned) {
    const role = guild.roles.cache.get(r.roleId);
    if (role && !message.member.roles.cache.has(role.id)) {
      await message.member.roles.add(role, `Nivel ${r.level}`).catch(() => {});
    }
  }

  // aviso de level-up
  const cfg = await getGuildConfig(guild.id);
  if (cfg.levelUpEnabled === false) return;

  const channel = cfg.levelUpChannelId
    ? guild.channels.cache.get(cfg.levelUpChannelId)
    : message.channel;
  if (!channel?.isTextBased?.()) return;

  const embed = new EmbedBuilder()
    .setColor(LEVELUP_COLOR)
    .setDescription(`## ${message.member} reached level ${level} 🖤`);
  await channel.send({ embeds: [embed], allowedMentions: { users: [message.author.id] } }).catch(() => {});
}

// Descarrega o XP acumulado no banco, de tempos em tempos.
async function flush() {
  if (!isDbReady()) return;

  const ops = [];
  for (const [k, e] of cache) {
    if (!e.dirty) continue;
    ops.push({
      updateOne: {
        filter: { _id: k },
        update: { $set: { guildId: e.guildId, userId: e.userId, xp: e.xp, level: e.level } },
        upsert: true,
      },
    });
    e.dirty = false;
  }

  if (ops.length) {
    await getDb()
      .collection('levels')
      .bulkWrite(ops)
      .catch((err) => console.error('[level] flush:', err.message));
  }

  // tira do cache quem parou de falar (ja gravado)
  const now = Date.now();
  for (const [k, e] of cache) {
    if (!e.dirty && now - (e.lastSeen ?? 0) > EVICT_IDLE_MS) cache.delete(k);
  }
  // limpa cooldowns velhos tambem
  for (const [k, t] of cooldowns) {
    if (now - t > EVICT_IDLE_MS) cooldowns.delete(k);
  }
}

let flushTimer = null;
export function startLeveling() {
  if (!isDbReady()) return;
  flushTimer = setInterval(flush, FLUSH_MS);
}

// Grava tudo antes de sair (a Discloud reinicia de vez em quando).
export async function stopLeveling() {
  clearInterval(flushTimer);
  await flush();
}

// --- leitura pros comandos ---

// Pega XP/nivel de alguem, preferindo o valor quente do cache.
export async function getUserLevel(guildId, userId) {
  const cached = cache.get(key(guildId, userId));
  if (cached) return { xp: cached.xp, level: cached.level };
  if (!isDbReady()) return { xp: 0, level: 0 };
  const doc = await getDb().collection('levels').findOne({ _id: key(guildId, userId) });
  return { xp: doc?.xp ?? 0, level: doc?.level ?? 0 };
}

// Posicao no ranking (1 = maior XP). Conta quantos tem mais XP + 1.
export async function getUserRank(guildId, userId, xp) {
  if (!isDbReady()) return null;
  const ahead = await getDb().collection('levels').countDocuments({ guildId, xp: { $gt: xp } });
  return ahead + 1;
}

export async function getLeaderboard(guildId, limit = 10) {
  if (!isDbReady()) return [];
  return getDb()
    .collection('levels')
    .find({ guildId })
    .sort({ xp: -1 })
    .limit(limit)
    .toArray();
}
