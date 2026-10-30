const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  // اگر درخواست برای دریافت خودِ صفحه بازی (فایل HTML) بود
  if (req.method === 'GET' && (req.url === '/' || req.url === '/game')) {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Game file not found');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      }
    });
    return;
  }

  // پاسخ پیش‌فرض به سایر درخواست‌های GET
  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // مدیریت درخواست‌های POST (وب‌هوک تلگرام)
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));

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

        // ۱. مدیریت کلیک روی دکمه‌های شیشه‌ای
        if (callbackQueryId) {
          const answerData = JSON.stringify({
            callback_query_id: callbackQueryId,
            text: "بارگذاری بازی..."
          });

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

          if (callbackData === 'play_action') {
            // استفاده از لینک خودِ سرویس رندر برای باز کردن فایل HTML بازی
            const gameUrl = process.env.GAME_URL || 'https://zzgames-f35.onrender.com';
            
            sendTelegramMessage(BOT_TOKEN, chatId, "🕹️ برای شروع پرواز با جنگنده F-35 روی دکمه زیر بزنید:", {
              inline_keyboard: [
                [{ text: "🚀 اجرای بازی F-35 (تمام‌صفحه)", web_app: { url: gameUrl } }]
              ]
            });
          } else if (callbackData === 'play_strategy') {
            sendTelegramMessage(BOT_TOKEN, chatId, "🏰 بخش بازی استراتژیک به‌زودی به مجموعه اضافه خواهد شد!", null);
          } else if (callbackData === 'unlock_games') {
            sendTelegramMessage(BOT_TOKEN, chatId, "⭐ سیستم پرداخت و باز کردن همه بازی‌ها با ستاره‌های تلگرام در حال آماده‌سازی است.", null);
          }
          return;
        }

        // ۲. پاسخ به دستور /start
        if (text.startsWith('/start')) {
          const responseText = "سلام! به پلتفرم ZZ Games خوش آمدید 🎮🔥\n\nاز منوی زیر بازی مورد نظرتان را انتخاب کنید:";
          const replyMarkup = {
            inline_keyboard: [
              [{ text: "🕹️ Action & Adventure Game", callback_data: "play_action" }],
              [{ text: "🏰 Strategy Game", callback_data: "play_strategy" }],
              [{ text: "⭐ Unlock All Games (50 Stars)", callback_data: "unlock_games" }]
            ]
          };
          sendTelegramMessage(BOT_TOKEN, chatId, responseText, replyMarkup);
        }
        
        // ۳. پاسخ به دستور /games
        if (text.startsWith('/games')) {
          const responseText = "🎯 لیست بازی‌های فعال در ZZ Games:\n\nلطفاً یکی را انتخاب کنید:";
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
    family: 4,
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
  echoServerStatus();
});

function echoServerStatus() {
  console.log(`Server is running on port ${PORT}`);
}
