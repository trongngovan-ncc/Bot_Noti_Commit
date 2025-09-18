const axios = require("axios");

module.exports = async function handleNotificationGit(client, result, channelId, additionalInfo = {}) {
  try {
     
    const { repoLink, userName, userEmail } = additionalInfo;

    const llmResponse = await axios.post(
      "https://liz-subumbellated-rico.ngrok-free.app/llm-review",
      { diff: result, repoLink, userName, userEmail },
      { headers: { "Content-Type": "application/json" } }
    );

    const reviewResult = llmResponse.data; 
    console.log("LLM Review Result:", reviewResult);

    const channel = await client.channels.fetch(channelId);

    let message = "";

    if (typeof reviewResult === "object" && reviewResult.review) {
      message = reviewResult.review;
    } else if (typeof reviewResult === "string") {
      message = reviewResult;
    } else {
      message = JSON.stringify(reviewResult);
    }
    let infoHeader = "";
    let repoStart = 0, repoEnd = 0;
    infoHeader += `📦 Repo: ${repoLink}\n`;
    repoStart = infoHeader.indexOf(repoLink);
    repoEnd = repoStart + repoLink.length;
    if (userName && userEmail) infoHeader += `👤 User: ${userName} || ✉️ Email: ${userEmail}\n`;
    if (infoHeader) message = infoHeader + message;

    const mk = [
      { type: 'lk', s: repoStart, e: repoEnd, url: repoLink },
      { type: 'pre', s: infoHeader.length, e: message.length }
    ];

    await channel.send({ t: message , mk });
    } catch (err) {
      console.error(err);
    }
}

