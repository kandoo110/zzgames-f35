const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('BOT_TOKEN is not set in environment variables!');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// هندل کردن دستور /start
bot.start((ctx) => {
  ctx.reply("Welcome to **ZZ Games**! 🎮🔥\n\nChoose an option below:", {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: "🕹️ Action & Adventure Game", callback_data: "play_action" }],
        [{ text: "🏰 Strategy Game", callback_data: "play_strategy" }],
        [{ text: "⭐ Unlock All Games (50 Stars)", pay: true }]
      ]
    }
  });
});

// راه‌اندازی وب‌هوک روی پورت رندر
const PORT = process.env.PORT || 3000;
const RENDER_URL = process.env.RENDER_EXTERNAL_URL; // رندر خودش این آدرس را می‌دهد

if (RENDER_URL) {
  bot.launch({
    webhook: {
      domain: RENDER_URL,
      port: PORT,
    },
  });
  console.log(`Bot started with webhook on port ${PORT}`);
} else {
  // حالت لوکال یا تست
  bot.launch();
  console.log('Bot started with long polling');
}

// بستن امن ربات
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
