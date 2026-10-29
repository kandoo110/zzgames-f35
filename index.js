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

async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' })
  });
}
