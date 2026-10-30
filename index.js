const http = require('http');

const server = http.createServer(async (req, res) => {
  // همیشه در ابتدای کار پاسخ اولیه را به تلگرام می‌دهیم تا ارتباط قطع نشود
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok' }));

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const update = JSON.parse(body);
        const BOT_TOKEN = process.env.BOT_TOKEN;

        const chatId = update.message?.chat?.id || 
                       update.callback_query?.message?.chat?.id;
        const text = update.message?.text;

        if (chatId && BOT_TOKEN && text) {
          // اگر کاربر دستور /start را فرستاد
          if (text === '/start') {
            const responseText = "Welcome to **ZZ Games**! 🎮🔥\n\nChoose an option below:";
            const replyMarkup = {
              inline_keyboard: [
                [{ text: "🕹️ Action & Adventure Game", callback_data: "play_action" }],
                [{ text: "🏰 Strategy Game", callback_data: "play_strategy" }],
                [{ text: "⭐ Unlock All Games (50 Stars)", pay: true }]
              ]
            };

            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: responseText,
                parse_mode: 'Markdown',
                reply_markup: replyMarkup
              })
            });
          }
        }
      } catch (err) {
        console.error("Error processing update:", err);
      }
    });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
