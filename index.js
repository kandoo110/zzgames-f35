const http = require('http');
const https = require('https');

const token = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const update = JSON.parse(body);
        if (update.message && update.message.text) {
          const chatId = update.message.chat.id;
          const text = update.message.text;

          let responseText = "پیام شما دریافت شد.";
          if (text.startsWith('/start')) {
            responseText = "سلام! به ربات فروش بازی **زی زی گیم** خوش آمدید. 🎮🔥\n\nبرای مشاهده بازی‌ها و خرید، از منوی زیر استفاده کنید:";
          } else if (text.includes('بازی') || text.includes('بازیهای در دسترس')) {
            responseText = "🎮 **لیست بازی‌های در دسترس زی زی گیم:**\n\n1️⃣ بازی اول (اکشن و ماجراجویی)\n2️⃣ بازی دوم (استراتژیک)\n\nبرای خرید یا اطلاعات بیشتر روی هر بازی کلیک کنید:";
          }

          await sendMessage(chatId, responseText);
        }
      } catch (e) {}
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Zi Zi Game Bot is running on Render!');
  }
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

function sendMessage(chatId, text) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' });
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', resolve);
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}
