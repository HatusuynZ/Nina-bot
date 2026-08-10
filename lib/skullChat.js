/**
 * Conversa do Skull.
 *
 * Ele nao e de papo. Se alguem cita o nome dele numa mensagem, ele responde
 * curto e seco. Se a pessoa insiste na mesma janela de tempo, ele vai ficando
 * impaciente e no fim dispensa — e depois ignora essa pessoa por um tempo.
 *
 * Sem arquivo de config e sem banco: e so o nome do bot que dispara.
 */

// ---- knobs ----
const TRIGGER = /\bskull\b/i; // a mensagem precisa citar "skull"
const WINDOW_MS = 120_000; // janela que conta como "a mesma conversa"
const QUIET_MS = 300_000; // depois de dispensar, ignora a pessoa por isso
const ESCALATE_AT = 4; // no N-esimo toque na janela, dispensa e cala

// Primeiro contato: seco, mas responde.
const TERSE = ['What.', 'Speak.', 'Yeah?', "I'm listening. Make it count.", 'Go on.'];
// Insistiu: impaciente.
const ANNOYED = ['You again.', 'Still here?', 'Get to the point.', "I don't do small talk."];
// Encheu: dispensa e some por um tempo.
const DISMISS = [
  "I'm not here to chat. We're done.",
  'Said what I had to say. Leave it.',
  "That's enough. Go find something to do.",
];
// ---------------

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// userId -> { hits: number[], quietUntil: number }
const state = new Map();

// Retorna true se tratou a mensagem (respondeu ou decidiu ignorar).
export function handleSkullChat(message) {
  if (!TRIGGER.test(message.content)) return false;

  const id = message.author.id;
  const now = Date.now();
  const s = state.get(id) ?? { hits: [], quietUntil: 0 };

  // ainda ignorando essa pessoa?
  if (s.quietUntil > now) {
    state.set(id, s);
    return true;
  }

  s.hits = s.hits.filter((t) => now - t < WINDOW_MS);
  s.hits.push(now);

  let pool;
  if (s.hits.length >= ESCALATE_AT) {
    pool = DISMISS;
    s.quietUntil = now + QUIET_MS; // dispensou: cala por um tempo
    s.hits = [];
  } else if (s.hits.length >= 2) {
    pool = ANNOYED;
  } else {
    pool = TERSE;
  }

  state.set(id, s);
  message.reply(pick(pool)).catch(() => {});
  return true;
}
