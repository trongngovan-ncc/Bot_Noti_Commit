const axios = require("axios");

module.exports = async function handleNotificationGit(client, result, channelId) {
  try {
     
    console.log("Result to review:", result);

    const llmResponse = await axios.post(
      "http://172.16.220.214:8001/llm-review",
      { diff: result },
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

    await channel.send({ t: message });
  } catch (err) {
    console.error(err);
  }
}

