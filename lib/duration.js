// Converte "10m", "1h", "2d", "30s" em milissegundos. null se nao entender.
// Aceita numero puro tambem (assume minutos): "10" -> 10 minutos.
const UNITS = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseDuration(input) {
  if (!input) return null;
  const text = String(input).trim().toLowerCase();

  const match = text.match(/^(\d+)\s*([smhd]?)$/);
  if (!match) return null;

  const value = Number.parseInt(match[1], 10);
  if (Number.isNaN(value) || value <= 0) return null;

  const unit = match[2] || 'm'; // sem letra = minutos
  return value * UNITS[unit];
}

// "1h30m"? nao — de proposito. Uma unidade so, sem ambiguidade.
// Formata ms de volta em texto curto pra confirmar pro usuario.
export function formatDuration(ms) {
  if (ms >= UNITS.d) return `${Math.round(ms / UNITS.d)}d`;
  if (ms >= UNITS.h) return `${Math.round(ms / UNITS.h)}h`;
  if (ms >= UNITS.m) return `${Math.round(ms / UNITS.m)}m`;
  return `${Math.round(ms / UNITS.s)}s`;
}
