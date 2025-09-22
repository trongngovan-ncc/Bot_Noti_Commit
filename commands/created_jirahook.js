
const jwt = require('jsonwebtoken');
const PRIVATE_KEY = process.env.PRIVATE_KEY_PEM;


module.exports = async function handleCreateJiraHook(client, event) {
  const channel = await client.channels.fetch(event.channel_id);

  const channelId = event.channel_id;
  const userId = event.sender_id;

  const token = jwt.sign(
    { user_id: userId, channel_id: channelId },
    PRIVATE_KEY,
    { algorithm: 'RS256', expiresIn: '7d' }
  );
  const host = process.env.IP_HOST;
  const jirahookUrl = `${host}/jira/webhook?token=${token}`;
  const info = `Link jirahook:\n${jirahookUrl}`;
  const msg = await channel.messages.fetch(event.message_id);
  await msg.reply({
    t: info,
    mk: [
        { type: 'pre', s: info.indexOf(jirahookUrl), e: info.indexOf(jirahookUrl) + jirahookUrl.length }
    ]
    });

};