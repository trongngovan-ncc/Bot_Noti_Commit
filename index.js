// server.js
require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const bodyParser = require('body-parser');

const { MezonClient } = require('mezon-sdk'); 
const handleNotificationGit = require('./commands/noti_git');

/**
 * CONFIG
 */
const PORT = process.env.PORT;
const APP_TOKEN = process.env.APPLICATION_TOKEN;


/**
 * Main
 */
(async () => {
  if (!APP_TOKEN) {
    console.error('APPLICATION_TOKEN not set. Exiting.');
    process.exit(1);
  }

  await initIdempotency();

  const client = new MezonClient(APP_TOKEN);
  try {
    await client.login();
    console.log('✅ Mezon client logged in');
  } catch (e) {
    console.error('❌ Mezon client login failed:', e);
  }

  const app = express();

  // /review endpoint
  app.use(bodyParser.json());
  app.post('/review', async (req, res) => {
    const { diff, channelId } = req.body;
    if (!diff || !channelId) {
      return res.status(400).json({ error: 'Missing diff or channelId' });
    }
    try {
      await handleNotificationGit(client, diff, channelId);
      res.json({ message: 'Diff sent to Mezon channel!' });
    } catch (err) {
      console.error('Error in /review:', err);
      res.status(500).json({ error: err.message });
    }
  });

  

  app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log(`🔗 GitHub webhook endpoint: POST /github/webhook`);
  });
})();
