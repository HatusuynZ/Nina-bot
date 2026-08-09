import { sendRpAction } from '../lib/rpAction.js';

export default {
  name: 'kiss',
  category: 'Roleplay',
  description: 'Kiss another member',
  usage: '!kiss @user',
  permission: null, // anyone can use
  options: [{ name: 'user', type: 'user', description: 'Who to kiss', required: true }],

  async execute(ctx) {
    await sendRpAction(ctx, {
      category: 'kiss',
      color: 0xff6b9d,
      line: (a, b) => `${a} kissed ${b} 💋`,
      selfLine: (a) => `${a} blew a kiss to no one in particular... 💋`,
      botLine: () => "I never got to that part... 🖤",
    });
  },
};
