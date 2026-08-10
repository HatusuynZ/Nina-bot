# Skull

Bot de Discord do servidor do jogo. Persona seria e direta. Roda 24/7 na
Discloud, deploy automatico a cada push nesta branch.

## Estrutura

```
index.js              liga o bot e despacha slash commands. Nada mais.
commands/<nome>.js    um comando por arquivo
lib/commandLoader.js  acha os comandos, publica os slash e checa permissao
lib/context.js        normaliza mensagem e interacao (um comando serve os dois)
lib/logger.js         log de moderacao e de mensagem no canal "logs"
lib/warns.js          armazenamento dos warns
lib/duration.js       parse de 10m/1h/2d pro mute e auto-punicao
lib/rpAction.js       acoes de roleplay (kiss/hug/slap) com gif
lib/skullChat.js      resposta seca quando citam "skull" no chat
lib/botGuard.js       anti-nuke: remove bot adicionado por quem nao pode
lib/verify.js         verificacao de entrada por botao
tickets.js            sistema de tickets
welcome.js            boas-vindas
```

## Criar um comando

Novo arquivo em `commands/`. O carregador acha sozinho — nao precisa registrar
em lugar nenhum. Vira slash automaticamente.

```js
import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'exemplo',
  aliases: [],
  category: 'General',            // agrupa no /help
  description: 'o que ele faz',
  usage: '/exemplo <arg>',
  permission: null,               // ou PermissionFlagsBits.BanMembers etc
  options: [{ name: 'arg', type: 'string', description: '...', required: true }],
  async execute(ctx) {
    await ctx.reply('...');
  },
};
```

O loader checa a permissao antes de executar e captura erro: o comando so
escreve o que ele faz. `ctx` normaliza tudo (`ctx.getUser`, `ctx.reply`,
`ctx.replyPrivate`, `ctx.getString`, ...).

## Rodar local

```bash
npm install
# .env com DISCORD_TOKEN=<token>
node index.js
```

Atencao: rodar local enquanto a Discloud esta no ar conecta dois bots com o
mesmo token, e cada comando responde em dobro. Pare um dos dois.

## Deploy

Push na `main`. A Discloud reconstroi sozinha.

O `DISCORD_TOKEN` (e o `DEV_GUILD_ID`) vivem nas Variaveis do painel da
Discloud, nunca no repo.
