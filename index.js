require('dotenv').config();
const express = require('express');
const { MezonClient } = require('mezon-sdk');
const registerReviewApi = require('./api/review');
const registerHealthApi = require('./api/health');
const handleIntro = require("./commands/intro");
const handleCreateGitHook = require('./commands/created_githook');
const handleIntroGitHook = require('./commands/intro_githook');
const PORT = process.env.PORT || 8000;

const BOT_TOKEN = process.env.APPLICATION_TOKEN;
const BOT_ID = process.env.APPLICATION_ID;




(async () => {

  const client = new MezonClient({ botId: BOT_ID, token: BOT_TOKEN});
  const session = await client.login();


  // Bot chat logic
  client.onChannelMessage(async (event) => {
    const text = event?.content?.t?.toLowerCase();
    if (!text) return;
   
  

    if(text.startsWith("*create_githook")){
      return handleCreateGitHook(client,event);
    }

    if(text.startsWith("*intro_githook")){
      return handleIntroGitHook(client,event);
    }

    if (text.startsWith("*intro")) {
      return handleIntro(client, event);
    }



  });

  const app = express();
  app.set('mezonClient', client);


  app.use(express.json({ limit: '50mb' })); 
  app.use(express.urlencoded({ limit: '50mb', extended: true }));


  registerReviewApi(app, client);
  registerHealthApi(app);
  app.listen(PORT, () => {
    console.log(`🚀 Bot listening on port ${PORT}`);
  });
})();
