import { readFileSync, existsSync, watch } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESPONSES_FILE = join(__dirname, '..', 'responses.json');

// tira acento, pontuacao e espaco sobrando pra comparar so o "miolo" da frase
export function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

let responses = { cooldownSeconds: 4, groups: [], patience: null };
let triggerIndex = []; // [{ needle, group }] do mais especifico pro mais generico

export function loadResponses() {
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

// recarrega sozinho quando o arquivo e salvo (nao precisa reiniciar o bot)
let reloadTimer = null;
let watcher = null;

export function watchResponses() {
  if (!existsSync(RESPONSES_FILE)) return;
  watcher = watch(RESPONSES_FILE, () => {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(loadResponses, 300);
  });
}

// Fecha o vigia antes de um process.exit(): sair com ele aberto solta um
// assert feio do libuv no Windows.
export function stopWatching() {
  clearTimeout(reloadTimer);
  watcher?.close();
  watcher = null;
}

// userId -> timestamp da ultima resposta automatica
const cooldowns = new Map();
// userId -> { hits: number[], restUntil: number, level: number }
const patienceState = new Map();

// Decide se a Nina responde, se ela reclama, ou se ela esta de mal com essa pessoa.
function checkPatience(userId) {
  const cfg = responses.patience;
  if (!cfg) return { action: 'reply' };

  const now = Date.now();
  const windowMs = (cfg.windowMinutes ?? 3) * 60_000;
  const state = patienceState.get(userId) ?? { hits: [], restUntil: 0, level: 0 };

  if (state.restUntil > now) {
    patienceState.set(userId, state);
    return { action: 'silent' };
  }
  if (state.restUntil !== 0) {
    state.restUntil = 0;
    state.hits = [];
    state.level = 0;
    patienceState.set(userId, state);
    return { action: 'reply', back: pick(cfg.backReplies ?? ['Voltei.']) };
  }

  state.hits = state.hits.filter((t) => now - t < windowMs);
  state.hits.push(now);

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

// Tenta responder uma mensagem comum. Retorna true se respondeu (ou decidiu calar).
export function handleAutoReply(message) {
  const haystack = normalize(message.content);
  const match = triggerIndex.find((entry) => haystack.includes(entry.needle));
  if (!match) return false;

  const userId = message.author.id;
  const now = Date.now();

  const patience = checkPatience(userId);
  if (patience.action === 'silent') return true;

  if (patience.action === 'rest' || patience.action === 'annoyed') {
    cooldowns.set(userId, now);
    message.reply(patience.text).catch(() => {});
    return true;
  }

  const cooldownMs = (responses.cooldownSeconds ?? 4) * 1000;
  if (now - (cooldowns.get(userId) ?? 0) < cooldownMs) return true;
  cooldowns.set(userId, now);

  const reply = pick(match.group.replies ?? ['...']);
  message.reply(patience.back ? `${patience.back}\n\n${reply}` : reply).catch(() => {});
  return true;
}
