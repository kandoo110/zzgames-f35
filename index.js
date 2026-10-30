const http = require('http');
const https = httpsModule();

function httpsModule() {
  return require('https');
}

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

        const chatId = update.message?.chat?.id || 
                       update.callback_query?.message?.chat?.id;
        const text = update.message?.text || '';

        if (chatId && BOT_TOKEN && (text.startsWith('/start') || text.startsWith('/games'))) {
          const responseText = "Welcome to ZZ Games! 🎮🔥\n\nChoose an option below:";
          const replyMarkup = {
            inline_keyboard: [
              [{ text: "🕹️ Action & Adventure Game", callback_data: "play_action" }],
              [{ text: "🏰 Strategy Game", callback_data: "play_strategy" }],
              [{ text: "⭐ Unlock All Games (50 Stars)", callback_data: "unlock_games" }]
            ]
          };

          const postData = JSON.stringify({
            chat_id: chatId,
            text: responseText,
            reply_markup: replyMarkup
          });

          const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${BOT_TOKEN}/sendMessage`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            }
          };

          const tgReq = https.request(options, (tgRes) => {
            console.log("Telegram response status:", tgRes.statusCode);
          });

          tgReq.on('error', (e) => {
            console.error(`Telegram Error: ${e.message}`);
          });

          tgReq.write(postData);
          tgReq.end();
        }
      } catch (err) {
        console.error("Error:", err);
      }
    });
  }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
