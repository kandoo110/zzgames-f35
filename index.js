const http = require('http');
const https = require('https');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok' }));

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const update = JSON.parse(body);
        const BOT_TOKEN = process.env.BOT_TOKEN;
        if (!BOT_TOKEN) return;

        // بررسی اینکه آیا کلیک روی دکمه بوده یا پیام متنی
        const callbackQuery = update.callback_query;
        const message = update.message;

        const chatId = message?.chat?.id || callbackQuery?.message?.chat?.id;
        const text = message?.text || '';
        const callbackData = callbackQuery?.data;
        const callbackQueryId = callbackQuery?.id;

        if (!chatId) return;

        // ۱. اگر روی دکمه شیشه‌ای کلیک شده باشد
        if (callbackQueryId) {
          // پاسخ سریع به تلگرام برای متوقف کردن حالت چرخش دکمه
          const answerData = JSON.stringify({
            callback_query_id: callbackQueryId,
            text: "Processing your request..."
          });

          const answerReq = https.request({
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${BOT_TOKEN}/answerCallbackQuery`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(answerData) }
          });
          answerReq.write(answerData);
          answerReq.end();

          // ارسال پیام متناسب با دکمه کلیک شده
          let responseText = "";
          if (callbackData === 'play_action') {
            responseText = "🕹️ You selected Action & Adventure Game! Get ready to play...";
          } else if (callbackData === 'play_strategy') {
            responseText = "🏰 You selected Strategy Game! Build your empire...";
          } else if (callbackData === 'unlock_games') {
            responseText = "⭐ Unlock all games feature coming soon via Telegram Stars!";
          }

          if (responseText) {
            sendTelegramMessage(BOT_TOKEN, chatId, responseText, null);
          }
          return;
        }

        // ۲. اگر دستورات متنی /start یا /games ارسال شده باشد
        if (text.startsWith('/start') || text.startsWith('/games')) {
          const responseText = "Welcome to ZZ Games! 🎮🔥\n\nChoose an option below:";
          const replyMarkup = {
            inline_keyboard: [
              [{ text: "🕹️ Action & Adventure Game", callback_data: "play_action" }],
              [{ text: "🏰 Strategy Game", callback_data: "play_strategy" }],
              [{ text: "⭐ Unlock All Games (50 Stars)", callback_data: "unlock_games" }]
            ]
          };
          sendTelegramMessage(BOT_TOKEN, chatId, responseText, replyMarkup);
        }

      } catch (err) {
        console.error("Error parsing update:", err);
      }
    });
  }
});

// تابع کمکی برای ارسال پیام به تلگرام
function sendTelegramMessage(token, chatId, text, replyMarkup) {
  const postData = JSON.stringify({
    chat_id: chatId,
    text: text,
    reply_markup: replyMarkup
  });

  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${token}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    console.log("Telegram response status:", res.statusCode);
  });

  req.on('error', (e) => {
    console.error(`Telegram Error: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
