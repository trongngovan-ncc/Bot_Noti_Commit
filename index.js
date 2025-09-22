require('dotenv').config();
const express = require('express');
const { MezonClient } = require('mezon-sdk');
const registerGithubWebhook = require('./api/githubWebhook');
const registerReviewApi = require('./api/review');
const registerJiraWebhook = require('./api/jiraWebhook');
const registerHealthApi = require('./api/health');
const registerPublicKeyApi = require('./api/publicKey');
const handleIntro = require("./commands/intro");
const handleCreateWebhook = require('./commands/created_webhook');
const handleCreateGitHook = require('./commands/created_githook');
const handleIntroGitHook = require('./commands/intro_githook');
const handleIntroWebhook = require('./commands/intro_webhook');
const handleIntroJiraHook = require('./commands/intro_jirahook');
const handleCreateJiraHook = require('./commands/created_jirahook');
const PORT = process.env.PORT || 8000;
const APP_TOKEN = process.env.APPLICATION_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;



(async () => {
  const client = new MezonClient(APP_TOKEN);
  await client.login();

  // Bot chat logic
  client.onChannelMessage(async (event) => {
    const text = event?.content?.t?.toLowerCase();
    if (!text) return;
   
    if (text.startsWith("*mapping_repo_channel")) {
      return handleMapping(client, event);
    }

    if(text.startsWith("*create_webhook")){
      return handleCreateWebhook(client,event);
    }

    if(text.startsWith("*create_githook")){
      return handleCreateGitHook(client,event);
    }

    if(text.startsWith("*intro_webhook")){
      return handleIntroWebhook(client,event);
    }

    if(text.startsWith("*intro_githook")){
      return handleIntroGitHook(client,event);
    }

    if(text.startsWith("*intro_jirahook")){
      return handleIntroJiraHook(client,event);
    }

    if (text.startsWith("*intro")) {
      return handleIntro(client, event);
    }

    if(text.startsWith("*create_jirahook")){
      return handleCreateJiraHook(client,event);
    }



  });

  // API logic
  const app = express();
  registerGithubWebhook(app, client, { WEBHOOK_SECRET });
  // Only use express.json for /review
  app.use('/review', express.json());
  registerReviewApi(app, client);
  registerJiraWebhook(app, client);
  registerPublicKeyApi(app);
  registerHealthApi(app);
  app.listen(PORT, () => {
    console.log(`🚀 Bot listening on port ${PORT}`);
  });
})();
