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

        const callbackQuery = update.callback_query;
        const message = update.message;

        const chatId = message?.chat?.id || callbackQuery?.message?.chat?.id;
        const text = message?.text || '';
        const callbackData = callbackQuery?.data;
        const callbackQueryId = callbackQuery?.id;

        if (!chatId) return;

        // ۱. اگر روی دکمه شیشه‌ای کلیک شد (برای متوقف کردن حالت چرخش و لودینگ)
        if (callbackQueryId) {
          const answerData = JSON.stringify({
            callback_query_id: callbackQueryId,
            text: "بارگذاری بازی..."
          });

          // استفاده از family: 4 برای جلوگیری از خطای شبکه رندر (ENETUNREACH)
          const answerReq = https.request({
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${BOT_TOKEN}/answerCallbackQuery`,
            method: 'POST',
            family: 4, 
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(answerData) }
          });
          answerReq.on('error', (e) => console.error("Answer Error:", e.message));
          answerReq.write(answerData);
          answerReq.end();

          // واکنش به دکمه‌های مختلف
          if (callbackData === 'play_action') {
            // لینک بازی F-35 خود را اینجا بگذارید (یا متغیر محیطی GAME_URL)
            const gameUrl = process.env.GAME_URL || 'https://zzgames-f35.onrender.com';
            
            sendTelegramMessage(BOT_TOKEN, chatId, "🕹️ برای اجرای بازی F-35 روی دکمه زیر کلیک کنید:", {
              inline_keyboard: [
                [{ text: "🚀 اجرای بازی F-35", web_app: { url: gameUrl } }]
              ]
            });
          } else if (callbackData === 'play_strategy') {
            sendTelegramMessage(BOT_TOKEN, chatId, "🏰 بخش استراتژی به زودی راه‌اندازی می‌شود!", null);
          } else if (callbackData === 'unlock_games') {
            sendTelegramMessage(BOT_TOKEN, chatId, "⭐ سیستم پرداخت و باز کردن همه بازی‌ها با ستاره‌های تلگرام در حال توسعه است.", null);
          }
          return;
        }

        // ۲. پاسخ به دستورات /start یا /games
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

// تابع ارسال پیام با پایداری کامل و اجبار به IPv4
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
    family: 4, // جلوگیری از خطای اتصال اینترنت در رندر
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
