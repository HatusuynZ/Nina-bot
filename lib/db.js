import { MongoClient } from 'mongodb';

/**
 * Conexao unica com o MongoDB. A URL vem da variavel MONGO_URL.
 *
 * Se MONGO_URL nao estiver setada, o banco simplesmente NAO conecta e
 * isDbReady() volta false — o resto do bot roda igual, so o sistema de nivel
 * fica desligado. Assim o bot nunca cai por causa do banco.
 */

let client = null;
let db = null;

export async function initDb() {
  const url = process.env.MONGO_URL;
  if (!url) {
    console.warn('[db] MONGO_URL nao configurado: sistema de nivel desativado.');
    return null;
  }

  try {
    client = new MongoClient(url, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    db = client.db('nina');

    // Indices: sem eles o ranking varre a colecao inteira a cada chamada.
    await db.collection('levels').createIndex({ guildId: 1, xp: -1 });
    await db.collection('levels').createIndex({ guildId: 1, userId: 1 });
    await db.collection('levelroles').createIndex({ guildId: 1, level: 1 }, { unique: true });

    console.log('[db] MongoDB conectado.');
    return db;
  } catch (err) {
    console.error('[db] falhou ao conectar no MongoDB:', err.message);
    db = null;
    return null;
  }
}

export function getDb() {
  return db;
}

export function isDbReady() {
  return db !== null;
}

export async function closeDb() {
  await client?.close().catch(() => {});
  client = null;
  db = null;
}
