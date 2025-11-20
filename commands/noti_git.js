
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const promptPath = path.join(__dirname, '../constant/prompt.json');
const PROMPT_REVIEW = JSON.parse(fs.readFileSync(promptPath, 'utf8')).PROMPT;

module.exports = async function handleNotificationGit(client, result, channelId, additionalInfo = {}, userId) {
  try {
     
    const { repoLink, userName, userEmail } = additionalInfo;

    const OLLAMA_URL = process.env.OLLAMA_URL || 'http://172.16.220.214:11434/api/chat';
    const OLLAMA_MODEL = process.env.MODEL_NAME || 'llama3';

  const prompt = PROMPT_REVIEW + "\n\nGit Diff:\n" + result;
    const startTime = Date.now();
    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt })
    });
    if (!res.ok) throw new Error(`Ollama error: ${res.status} ${await res.text()}`);

    let review = '';
    let buffer = '';
    for await (const chunk of res.body) {
      buffer += chunk.toString();
      let lines = buffer.split('\n');
      buffer = lines.pop(); // giữ lại dòng chưa hoàn chỉnh
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (data.response) {
            review += data.response;
          }
        } catch {}
      }
    }
    if (buffer.trim()) {
      try {
        const data = JSON.parse(buffer);
        if (data.response) {
          review += data.response;
        }
      } catch {}
    }
    const endTime = Date.now();
    const responseTime = ((endTime - startTime) / 1000).toFixed(2);
    const reviewResult = review;
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

    let infoHeader = '';
    let repoStart = 0, repoEnd = 0;
    infoHeader += `📦 Repo: ${repoLink}\n`;
    repoStart = infoHeader.indexOf(repoLink);
    repoEnd = repoStart + repoLink.length;
    if (userName) infoHeader += `👤 User: ${userName}` + (userEmail ? ` || ✉️ Email: ${userEmail}` : '') + '\n';

    let mentionsArr = undefined;
    if (userId && userName) {
      const userTagStr = `👤 User: ${userName}`;
      const userTagStart = infoHeader.indexOf(userTagStr) + userTagStr.indexOf(userName);
      const userTagEnd = userTagStart + userName.length;
      mentionsArr = [{ user_id: userId, s: userTagStart, e: userTagEnd }];
    }

    if (infoHeader) message = infoHeader + message;
    message += `\n⏱️ LLM response time: ${responseTime}s`;

    const mk = [
      { type: 'lk', s: repoStart, e: repoEnd, url: repoLink },
      { type: 'pre', s: infoHeader.length, e: message.length }
    ];

    await channel.send({ t: message , mk }, mentionsArr);
    } catch (err) {
      console.error(err);
    }
}
