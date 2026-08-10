import { sendRpAction } from '../lib/rpAction.js';

export default {
  name: 'slap',
  category: 'Roleplay',
  description: 'Slap another member',
  usage: '/slap @user',
  permission: null, // anyone can use
  options: [{ name: 'user', type: 'user', description: 'Who to slap', required: true }],

  async execute(ctx) {
    await sendRpAction(ctx, {
      category: 'slap',
      color: 0xe8534b,
      line: (a, b) => `${a} slapped ${b} 👋`,
      selfLine: (a) => `${a} slapped themselves. Bold move. 👋`,
      botLine: () => "You want to test me? Don't.",
    });
  },
};
