import { sendRpAction } from '../lib/rpAction.js';

export default {
  name: 'hug',
  category: 'Roleplay',
  description: 'Hug another member',
  usage: '/hug @user',
  permission: null, // anyone can use
  options: [{ name: 'user', type: 'user', description: 'Who to hug', required: true }],

  async execute(ctx) {
    await sendRpAction(ctx, {
      category: 'hug',
      color: 0xffb37b,
      line: (a, b) => `${a} hugged ${b} 🤗`,
      selfLine: (a) => `${a} hugged themselves. Someone give them a real one. 🤗`,
      botLine: (a) => `Come here, ${a}. I've got you. 🖤`,
    });
  },
};
