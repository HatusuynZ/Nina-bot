import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCommands, commands, commandList } from '../lib/commandLoader.js';

await loadCommands();

// Limites que a API do Discord impoe. Estourar = a publicacao inteira falha,
// e ai NENHUM slash command aparece. Barato conferir aqui.
const NAME_RE = /^[a-z0-9_-]{1,32}$/;
const MAX_DESCRIPTION = 100;
const VALID_OPTION_TYPES = ['string', 'integer', 'boolean', 'user', 'channel', 'role'];

test('carregou algum comando', () => {
  assert.ok(commandList.length > 0, 'nenhum comando carregado');
});

test('todo comando tem o contrato minimo', () => {
  for (const c of commandList) {
    assert.ok(c.name, 'comando sem name');
    assert.equal(typeof c.execute, 'function', `${c.name}: execute nao e funcao`);
    assert.ok(c.description, `${c.name}: sem description`);
    assert.ok(c.category, `${c.name}: sem category`);
  }
});

test('nome e descricao aceitos pela API do Discord', () => {
  for (const c of commandList) {
    if (c.slash === false) continue;
    assert.match(c.name, NAME_RE, `${c.name}: nome invalido pra slash command`);
    assert.ok(
      c.description.length <= MAX_DESCRIPTION,
      `${c.name}: description tem ${c.description.length} chars (max ${MAX_DESCRIPTION})`
    );
  }
});

test('opcoes bem formadas', () => {
  for (const c of commandList) {
    for (const o of c.options ?? []) {
      assert.ok(o.name, `${c.name}: opcao sem name`);
      assert.match(o.name, NAME_RE, `${c.name}.${o.name}: nome de opcao invalido`);
      assert.ok(o.description, `${c.name}.${o.name}: opcao sem description`);
      assert.ok(
        o.description.length <= MAX_DESCRIPTION,
        `${c.name}.${o.name}: description longa demais`
      );
      assert.ok(
        VALID_OPTION_TYPES.includes(o.type),
        `${c.name}.${o.name}: type "${o.type}" desconhecido`
      );
    }
  }
});

test('nenhum nome ou alias colidindo', () => {
  const seen = new Set();
  for (const c of commandList) {
    for (const n of [c.name, ...(c.aliases ?? [])]) {
      assert.ok(!seen.has(n), `"${n}" aparece em mais de um comando`);
      seen.add(n);
    }
  }
  // o Map do loader tem que bater com o total de nomes+aliases
  assert.equal(commands.size, seen.size, 'o registro do loader divergiu dos nomes declarados');
});

test('usage combina com o nome do comando', () => {
  for (const c of commandList) {
    if (!c.usage) continue;
    assert.ok(
      c.usage.includes(c.name),
      `${c.name}: usage "${c.usage}" nao menciona o proprio comando`
    );
  }
});
