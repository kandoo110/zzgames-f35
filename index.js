const http = require('http');
const https = httpsModule();

function httpsModule() {
  return require('https');
}

const server = http.createServer((req, res) => {
  // اگر درخواست برای دریافت خودِ صفحه بازی (فایل HTML) بود
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

  // پاسخ پیش‌فرض به سایر درخواست‌های GET
  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', server: 'online' }));
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

        // --- ۱. مدیریت مراحل پرداخت ستاره تلگرام ---
        if (update.pre_checkout_query) {
          answerPreCheckoutQuery(BOT_TOKEN, update.pre_checkout_query.id);
          return;
        }

        if (update.message?.successful_payment) {
          const chatId = update.message.chat.id;
          const gameUrl = process.env.GAME_URL || 'https://zzgames-f35.onrender.com';
          
          sendTelegramMessage(BOT_TOKEN, chatId, "🎉 Congratulations! Your payment has been successfully verified. You can now launch the game:", {
            inline_keyboard: [
              [{ text: "🚀 Launch F-35 Game (Fullscreen)", web_app: { url: gameUrl } }]
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

        // --- ۲. مدیریت کلیک روی دکمه‌های شیشه‌ای ---
        if (callbackQueryId) {
          const answerData = JSON.stringify({
            callback_query_id: callbackQueryId,
            text: "Processing..."
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

          if (callbackData === 'play_action' || callbackData === 'unlock_games') {
            sendGamePreview(BOT_TOKEN, chatId);
          } else if (callbackData === 'buy_now') {
            sendTelegramInvoice(BOT_TOKEN, chatId);
          }
          return;
        }

        // --- ۳. پاسخ به دستورات /start و /games ---
        if (text.startsWith('/start') || text.startsWith('/games')) {
          const responseText = "Welcome to ZZ Games! 🎮🔥\n\nExplore and unlock the ultimate F-35 Fighter Jet action game below:";
          const replyMarkup = {
            inline_keyboard: [
              [{ text: "🚀 Preview & Unlock F-35 (50 Stars)", callback_data: "play_action" }]
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

// ارسال پیش‌نمایش بازی با عکس، توضیحات و دکمه خرید (انگلیسی)
function sendGamePreview(token, chatId) {
  const photoUrl = "https://raw.githubusercontent.com/kandoo110/zzgames-f35/main/f35.jpg";
  const caption = "🎮 **F-35 Lightning II Air Combat**\n\n" +
                  "✨ An exciting, high-performance action game in the sky\n" +
                  "🎯 Score tracking, health system & intense challenges\n\n" +
                  "💎 **Permanent Access:** Only 50 Telegram Stars";

  const postData = JSON.stringify({
    chat_id: chatId,
    photo: photoUrl,
    caption: caption,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💳 Pay 50 Stars & Play", callback_data: "buy_now" }]
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

  const req = https.request(options);
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

  const req = https.request(options);
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
  req.write(postData);
  req.end();
}

function sendTelegramInvoice(token, chatId) {
  const invoiceData = JSON.stringify({
    chat_id: chatId,
    title: "Unlock F-35 Game",
    description: "Pay 50 Stars to permanently unlock the F-35 action game!",
    payload: "f35_game_access_payload",
    currency: "XTR",
    prices: [
      { label: "Game Access", amount: 50 }
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
  req.write(invoiceData);
  req.end();
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
