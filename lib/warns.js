import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WARNS_FILE = join(__dirname, '..', 'warns.json');

// Guarda: { [guildId]: { [userId]: [{ reason, mod, date }] } }
function load() {
  if (!existsSync(WARNS_FILE)) return {};
  try {
    return JSON.parse(readFileSync(WARNS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function save(data) {
  writeFileSync(WARNS_FILE, JSON.stringify(data, null, 2));
}

export function getWarns(guildId, userId) {
  return load()?.[guildId]?.[userId] ?? [];
}

// Retorna o total de warns da pessoa depois de adicionar.
export function addWarn(guildId, userId, entry) {
  const data = load();
  data[guildId] ??= {};
  data[guildId][userId] ??= [];
  data[guildId][userId].push(entry);
  save(data);
  return data[guildId][userId].length;
}

// Apaga todos os warns de alguem. Retorna quantos foram apagados.
export function clearWarns(guildId, userId) {
  const data = load();
  const count = data?.[guildId]?.[userId]?.length ?? 0;
  if (count > 0) {
    delete data[guildId][userId];
    save(data);
  }
  return count;
}
