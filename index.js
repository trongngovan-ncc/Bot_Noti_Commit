require('dotenv').config();
const express = require('express');
const { MezonClient } = require('mezon-sdk');
const registerGithubWebhook = require('./api/githubWebhook');
const registerReviewApi = require('./api/review');
const registerHealthApi = require('./api/health');
const handleCreateWebhook = require('./commands/created_webhook');
const PORT = process.env.PORT || 8000;
const APP_TOKEN = process.env.APPLICATION_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;





const handleIntro = require("./commands/intro_noticode");


(async () => {
  const client = new MezonClient(APP_TOKEN);
  await client.login();

  // Bot chat logic
  client.onChannelMessage(async (event) => {
    const text = event?.content?.t?.toLowerCase();
    if (!text) return;
    if (text.startsWith("*intro_noticode")) {
      return handleIntro(client, event);
    }
    if (text.startsWith("*mapping_repo_channel")) {
      return handleMapping(client, event);
    }

    if(text.startsWith("*create_webhook")){
      return handleCreateWebhook(client,event);
    }


  });

  // API logic
  const app = express();
  app.use(express.json());
  registerGithubWebhook(app, client, { WEBHOOK_SECRET });
  registerReviewApi(app, client);
  registerHealthApi(app);
  app.listen(PORT, () => {
    console.log(`🚀 Bot listening on port ${PORT}`);
  });
})();
