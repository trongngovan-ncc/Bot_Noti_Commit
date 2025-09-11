
const dotenv = require("dotenv");
const { MezonClient } = require("mezon-sdk");
const express = require("express");
const bodyParser = require("body-parser");
dotenv.config();

const handleIntro = require("./commands/intro");
const handleNotification = require("./commands/noti_commit");

async function main() {
  const client = new MezonClient(process.env.APPLICATION_TOKEN);
  // const client = new MezonClient(process.env.MEZON_TOKEN, process.env.HOST_DEV, process.env.PORT_DEV);
  await client.login();


  const app = express();
  app.use(bodyParser.json());

  app.post("/review", async (req, res) => {
    const  diff = req.body.diff;
    if (!diff) return res.status(400).json({ error: "Missing diff" });
    try {
      console.log("Received diff:", diff);
      res.json({ message: "Diff sent to Mezon channel!" });
      handleNotification(client,  diff );

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`Review server listening on port ${PORT}`);
  });

}

main()
  .then(() => console.log("Bot is running"))
  .catch(console.error);