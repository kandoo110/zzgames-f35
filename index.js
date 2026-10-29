import http from 'http';
import fetch from 'node-fetch';

const token = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const update = JSON.parse(body);
        if (update.message && update.message.text) {
          const chatId = update.message.chat.id;
          const text = update.message.text;

          if (text.startsWith('/start')) {
            await sendMessage(chatId, "سلام! به ربات فروش بازی **زی زی گیم** خوش آمدید. 🎮🔥\n\nبرای مشاهده بازی‌ها و خرید، از منوی زیر استفاده کنید:");
          } 
          // شرط جدید برای دکمه بازی های در دسترس
          else if (text.includes('بازی') || text.includes('بازیهای در دسترس')) {
            await sendMessage(chatId, "🎮 **لیست بازی‌های در دسترس زی زی گیم:**\n\n1️⃣ بازی اول (اکشن و ماجراجویی)\n2️⃣ بازی دوم (استراتژیک)\n\nبرای خرید یا اطلاعات بیشتر روی هر بازی کلیک کنید:");
          } 
          else {
            await sendMessage(chatId, "پیام شما دریافت شد. برای شروع لطفا /start را ارسال کنید یا از منو استفاده کنید.");
          }
        }
      } catch (e) {}
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Zi Zi Game Bot is running!');
  }
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' })
  });
}
