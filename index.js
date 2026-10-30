const http = require('http');
const https = httpsModule();

function httpsModule() {
  return require('https');
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/game')) {
    const fs = require('fs');
    const path = require('path');
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

  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

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

        // بررسی تایید پرداخت موفق (PreCheckoutQuery یا SuccessfulPayment)
        if (update.pre_checkout_query) {
          answerPreCheckoutQuery(BOT_TOKEN, update.pre_checkout_query.id);
          return;
        }

        if (update.message?.successful_payment) {
          const chatId = update.message.chat.id;
          const gameUrl = process.env.GAME_URL || 'https://zzgames-f35.onrender.com';
          sendTelegramMessage(BOT_TOKEN, chatId, "🎉 پرداخت شما با موفقیت تأیید شد! اکنون می‌توانید از بازی لذت ببرید:", {
            inline_keyboard: [
              [{ text: "🚀 ورود به بازی F-35", web_app: { url: gameUrl } }]
            ]
          });
          return;
        }

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
            text: "در حال صدور فاکتور..."
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

          // چه روی دکمه بازی و چه روی دکمه آنلاک بزنند، فاکتور پرداخت ۵۰ ستاره ارسال می‌شود
          if (callbackData === 'play_action' || callbackData === 'unlock_games') {
            sendTelegramInvoice(BOT_TOKEN, chatId);
          } else if (callbackData === 'play_strategy') {
            sendTelegramMessage(BOT_TOKEN, chatId, "🏰 بخش بازی استراتژیک به‌زودی راه‌اندازی می‌شود!", null);
          }
          return;
        }

        // ۲. پاسخ به دستور /start
        if (text.startsWith('/start')) {
          const responseText = "سلام! به پلتفرم ZZ Games خوش آمدید 🎮🔥\n\nبرای دسترسی به بازی F-35 و تمامی امکانات، لطفا اکانت خود را ویژه کنید:";
          const replyMarkup = {
            inline_keyboard: [
              [{ text: "🚀 Play F-35 Game (50 Stars)", callback_data: "play_action" }],
              [{ text: "🏰 Strategy Game", callback_data: "play_strategy" }],
              [{ text: "⭐ Unlock All Games (50 Stars)", callback_data: "unlock_games" }]
            ]
          };
          sendTelegramMessage(BOT_TOKEN, chatId, responseText, replyMarkup);
        }
        
        // ۳. پاسخ به دستور /games
        if (text.startsWith('/games')) {
          const responseText = "🎯 لیست بازی‌های اختصاصی ZZ Games:\n\nبرای باز کردن بازی‌ها نیازمند پرداخت ۵۰ ستاره تلگرام هستید:";
          const replyMarkup = {
            inline_keyboard: [
              [{ text: "🚀 Play F-35 Game (50 Stars)", callback_data: "play_action" }],
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

// تایید نهایی تراکنش پرداخت تلگرام
function answerPreCheckoutQuery(token, preCheckoutQueryId) {
  const data = JSON.stringify({
    pre_checkout_query_id: preCheckoutQueryId,
    ok: true
  });

  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${token}/answerPreCheckoutQuery`,
    method: 'POST',
    family: 4,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = https.request(options, (res) => {
    console.log("Pre-checkout status:", res.statusCode);
  });
  req.on('error', (e) => console.error("Pre-checkout Error:", e.message));
  req.write(data);
  req.end();
}

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
    console.log("Telegram message status:", res.statusCode);
  });
  req.on('error', (e) => console.error("Telegram Error:", e.message));
  req.write(postData);
  req.end();
}

function sendTelegramInvoice(token, chatId) {
  const invoiceData = JSON.stringify({
    chat_id: chatId,
    title: "Unlock F-35 Game & VIP Access",
    description: "Pay 50 Telegram Stars to unlock and play F-35 Game instantly!",
    payload: "f35_game_vip_payload",
    currency: "XTR",
    prices: [
      { label: "VIP Game Access", amount: 50 }
    ]
  });

  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${token}/sendInvoice`,
    method: 'POST',
    family: 4,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(invoiceData)
    }
  };

  const req = https.request(options, (res) => {
    console.log("Invoice status:", res.statusCode);
  });
  req.on('error', (e) => console.error("Invoice Error:", e.message));
  req.write(invoiceData);
  req.end();
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
