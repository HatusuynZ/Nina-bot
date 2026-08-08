# Nina

Bot de Discord do servidor do jogo. Roda 24/7 na Discloud, deploy automatico
a cada push nesta branch.

## Estrutura

```
index.js              liga o bot e despacha comandos. Nada mais.
commands/<nome>.js    um comando por arquivo
lib/commandLoader.js  acha os comandos e checa permissao
lib/autoReply.js      respostas automaticas + paciencia da Nina
lib/warns.js          armazenamento dos warns
lib/serverTemplate.js molde de canais do !setup e !reset
tickets.js            sistema de tickets
welcome.js            boas-vindas + autorole
responses.json        gatilhos e respostas (recarrega sozinho, sem restart)
```

## Criar um comando

Novo arquivo em `commands/`. O carregador acha sozinho — nao precisa registrar
em lugar nenhum.

```js
import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'exemplo',
  aliases: [],
  category: 'Geral',              // agrupa no !help
  description: 'o que ele faz',
  usage: '!exemplo <arg>',
  permission: null,               // ou PermissionFlagsBits.BanMembers etc
  async execute({ message, args, client, commands, commandList, prefix }) {
    await message.reply('oi');
  },
};
```

O loader checa a permissao antes de executar e captura erro: o comando so
escreve o que ele faz.

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

O `DISCORD_TOKEN` vive nas Variaveis do painel da Discloud, nunca no repo.
