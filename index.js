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

        // تاییدیه پرداخت موفق
        if (update.pre_checkout_query) {
          answerPreCheckoutQuery(BOT_TOKEN, update.pre_checkout_query.id);
          return;
        }

        if (update.message?.successful_payment) {
          const chatId = update.message.chat.id;
          const gameUrl = process.env.GAME_URL || 'https://zzgames-f35.onrender.com';
          sendTelegramMessage(BOT_TOKEN, chatId, "🎉 پرداخت با موفقیت انجام شد! دکمه زیر برای ورود به بازی باز شد:", {
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
            text: "بارگذاری پیش‌نمایش..."
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

          // وقتی روی بازی یا آنلاک کلیک می‌کند، به جای فاکتور خشک، پیش‌نمایش و عکس محیط بازی فرستیده می‌شود
          if (callbackData === 'play_action' || callbackData === 'unlock_games') {
            sendGamePreview(BOT_TOKEN, chatId);
          } else if (callbackData === 'buy_now') {
            // حالا فاکتور پرداخت ارسال می‌شود
            sendTelegramInvoice(BOT_TOKEN, chatId);
          } else if (callbackData === 'play_strategy') {
            sendTelegramMessage(BOT_TOKEN, chatId, "🏰 بخش بازی استراتژیک به‌زودی راه‌اندازی می‌شود!", null);
          }
          return;
        }

        // ۲. پاسخ به دستور /start
        if (text.startsWith('/start')) {
          const responseText = "سلام! به پلتفرم ZZ Games خوش آمدید 🎮🔥\n\nبرای مشاهده پیش‌نمایش و دسترسی به بازی فایتینگ F-35، از دکمه زیر استفاده کنید:";
          const replyMarkup = {
            inline_keyboard: [
              [{ text: "🚀 پیش‌نمایش و خرید بازی F-35 (50 Stars)", callback_data: "play_action" }],
              [{ text: "🏰 Strategy Game", callback_data: "play_strategy" }],
              [{ text: "⭐ Unlock All Games", callback_data: "unlock_games" }]
            ]
          };
          sendTelegramMessage(BOT_TOKEN, chatId, responseText, replyMarkup);
        }
        
        // ۳. پاسخ به دستور /games
        if (text.startsWith('/games')) {
          const responseText = "🎯 لیست بازی‌های اختصاصی ZZ Games:";
          const replyMarkup = {
            inline_keyboard: [
              [{ text: "🚀 پیش‌نمایش و خرید بازی F-35 (50 Stars)", callback_data: "play_action" }],
              [{ text: "🏰 Strategy Game", callback_data: "play_strategy" }],
              [{ text: "⭐ Unlock All Games", callback_data: "unlock_games" }]
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

// ارسال عکس پیش‌نمایش محیط بازی همراه با دکمه خرید
function sendGamePreview(token, chatId) {
  // می‌توانید به جای لینک عکس زیر، لینک مستقیم اسکرین‌شات محیط بازی خودتان را قرار دهید
  const photoUrl = "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800";
  const caption = "🎮 **معرفی بازی F-35 Lightning II**\n\n" +
                  "✨ نبردی نفس‌گیر در آسمان با گرافیک جذاب HTML5\n" +
                  "🎯 ثبت رکورد، چالش‌های هیجان‌انگیز و اکشن تمام‌عیار\n\n" +
                  "💎 **هزینه دسترسی دائم:** ۵۰ ستاره تلگرام";

  const postData = JSON.stringify({
    chat_id: chatId,
    photo: photoUrl,
    caption: caption,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💳 پرداخت ۵۰ ستاره و دریافت بازی", callback_data: "buy_now" }]
      ]
    }
  });

  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${token}/sendPhoto`,
    method: 'POST',
    family: 4,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    console.log("Preview status:", res.statusCode);
  });
  req.on('error', (e) => console.error("Preview Error:", e.message));
  req.write(postData);
  req.end();
}

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

  const req = https.request(options, (res));
  req.end(data);
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

  const req = https.request(options);
  req.end(postData);
}

function sendTelegramInvoice(token, chatId) {
  const invoiceData = JSON.stringify({
    chat_id: chatId,
    title: "F-35 Game VIP Access",
    description: "Unlock F-35 HTML5 Game permanently for 50 Stars!",
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

  const req = https.request(options);
  req.end(invoiceData);
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
