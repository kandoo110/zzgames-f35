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

  // پاسخ پیش‌فرض به سایر درخواست‌های GET (مانند آپتایم)
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

        // تاییدیه نهایی قبل از پرداخت (وقتی کاربر دکمه‌ی پرداخت نهایی را می‌زند)
        if (update.pre_checkout_query) {
          answerPreCheckoutQuery(BOT_TOKEN, update.pre_checkout_query.id);
          return;
        }

        // اگر پرداخت با موفقیت انجام شد
        if (update.message?.successful_payment) {
          const chatId = update.message.chat.id;
          const gameUrl = process.env.GAME_URL || 'https://zzgames-f35.onrender.com';
          
          sendTelegramMessage(BOT_TOKEN, chatId, "🎉 تبریک! پرداخت شما با موفقیت تأیید شد. اکنون می‌توانید با جنگنده F-35 به پرواز درآیید:", {
            inline_keyboard: [
              [{ text: "🚀 شروع بازی F-35 (تمام‌صفحه)", web_app: { url: gameUrl } }]
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
          // بستن حالت لودینگ دکمه
          const answerData = JSON.stringify({
            callback_query_id: callbackQueryId,
            text: "در حال پردازش..."
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

          // الف) وقتی روی دکمه بازی می‌زند -> ارسال پیش‌نمایش (عکس، توضیحات و دکمه خرید)
          if (callbackData === 'play_action' || callbackData === 'unlock_games') {
            sendGamePreview(BOT_TOKEN, chatId);
          } 
          // ب) وقتی روی دکمه‌ی پرداخت و شروع بازی می‌زند -> ارسال فاکتور رسمی ۵۰ ستاره
          else if (callbackData === 'buy_now') {
            sendTelegramInvoice(BOT_TOKEN, chatId);
          }
          return;
        }

        // --- ۳. پاسخ به دستورات متنی /start و /games ---
        if (text.startsWith('/start') || text.startsWith('/games')) {
          const responseText = "سلام! به پلتفرم ZZ Games خوش آمدید 🎮🔥\n\nاز دکمه زیر برای مشاهده پیش‌نمایش و فعال‌سازی بازی نبرد جنگنده‌ی F-35 استفاده کنید:";
          const replyMarkup = {
            inline_keyboard: [
              [{ text: "🚀 پیش‌نمایش و فعال‌سازی F-35 (50 Stars)", callback_data: "play_action" }]
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

// --- ۴. توابع کاربردی تلگرام ---

// ارسال پیش‌نمایش بازی همراه با عکس واقعی، توضیحات و دکمه‌ی خرید
function sendGamePreview(token, chatId) {
  // لینک عکس جدید شما که در گیت‌هاب قرار دارد.
  // نکته: ما از آدرس خام (raw) گیت‌هاب استفاده می‌کنیم تا تلگرام بتواند عکس را دریافت کند.
  const photoUrl = "https://raw.githubusercontent.com/kandoo110/zzgames-f35/main/f35.jpg";
  const caption = "🎮 **نبرد جنگنده F-35 Lightning II**\n\n" +
                  "✨ یک بازی اکشن جذاب و گرافیکی در آسمان\n" +
                  "🎯 ثبت رکورد، نوار سلامت و چالش‌های هیجان‌انگیز\n\n" +
                  "💎 **دسترسی دائمی:** فقط ۵۰ ستاره تلگرام";

  const postData = JSON.stringify({
    chat_id: chatId,
    photo: photoUrl,
    caption: caption,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💳 پرداخت ۵۰ ستاره و شروع بازی", callback_data: "buy_now" }]
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

// تاییدیه نهایی قبل از پرداخت تلگرام
function answerPreCheckoutQuery(token, preCheckoutQueryId) {
  const data = JSON.stringify({
    pre_checkout_query_id: preCheckoutQueryId,
    ok: true // پرداخت مجاز است
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

// ارسال پیام متنی معمولی با دکمه‌های شیشه‌ای
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

// ارسال فاکتور رسمی پرداخت ستاره‌های تلگرام (Telegram Stars)
function sendTelegramInvoice(token, chatId) {
  const invoiceData = JSON.stringify({
    chat_id: chatId,
    title: "Unlock F-35 Game",
    description: "Pay 50 Stars to permanently unlock the F-35 action game!",
    payload: "f35_game_access_payload",
    currency: "XTR", // واحد پول ستاره‌های تلگرام
    prices: [
      { label: "Game Access", amount: 50 } // ۵0 ستاره تلگرام
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
