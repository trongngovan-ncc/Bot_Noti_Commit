require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { MezonClient } = require('mezon-sdk');
const registerGithubWebhook = require('./api/githubWebhook'); // Old webhook handler
const registerGithubWebhook2 = require('./api/githubWebhook2'); // New webhook handler
const registerReviewApi = require('./api/review');
const registerJiraWebhook = require('./api/jiraWebhook');
const registerHealthApi = require('./api/health');
const registerPublicKeyApi = require('./api/publicKey');
const { registerGithubCallback } = require('./api/github_callback');
const registerJiraCallback = require('./api/jira_callback');
const handleIntro = require("./commands/intro");
const handleCreateWebhook = require('./commands/created_webhook');
const handleCreateGitHook = require('./commands/created_githook');
const handleIntroGitHook = require('./commands/intro_githook');
const handleIntroWebhook = require('./commands/intro_webhook');
const handleIntroJiraHook = require('./commands/intro_jirahook');
const handleCreateJiraHook = require('./commands/created_jirahook');
const handleLoginGithub = require('./commands/login_github');
const handleLoginGithubApp = require('./commands/logingithubapp');
const handleLoginJira = require('./commands/login_jira');
const { registerSelectRepo } = require('./api/select_repo');
const { registerSetupWebhook } = require('./api/setup_webhook');
const { registerGitHubAppRoutes } = require('./api/github-app.routes');
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
    if(text.startsWith("*logingithubapp")){
      return handleLoginGithubApp(client,event);
    }

    if(text.startsWith("*logingithub")){
      return handleLoginGithub(client,event);
    }

    if(text.startsWith("*loginjira")){
      return handleLoginJira(client,event);
    }

   



  });

  // API logic
  const app = express();
  // Set mezonClient for other routes to use
  app.set('mezonClient', client);

  // Parse JSON body for all routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Thêm express-session trước khi đăng ký các route
  app.use(session({
    secret: process.env.SESSION_SECRET || 'mezon_secret',
    resave: false,
    saveUninitialized: true
  }));

  // Register routes
  registerGithubWebhook2(app, client); // New webhook handler for bot-registered webhooks
  registerGithubWebhook(app, client, { WEBHOOK_SECRET }); // Keep old handler for manually configured webhooks
  registerReviewApi(app, client);
  registerJiraWebhook(app, client);
  registerGithubCallback(app);
  registerJiraCallback(app);
  registerSelectRepo(app);
  registerSetupWebhook(app);
  registerPublicKeyApi(app);
  registerHealthApi(app);
  registerGitHubAppRoutes(app, client);
  app.listen(PORT, () => {
    console.log(`🚀 Bot listening on port ${PORT}`);
  });
})();
