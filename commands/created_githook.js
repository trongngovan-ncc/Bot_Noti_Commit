
const jwt = require('jsonwebtoken');
const PRIVATE_KEY = process.env.PRIVATE_KEY_PEM;


module.exports = async function handleCreateGitHook(client, event) {
  const channel = await client.channels.fetch(event.channel_id);
  const text = event?.content?.t?.trim();
  const match = text.match(/^\*create_githook\s+([^\s]+)$/i);
  if (!match) {
    const message = await channel.messages.fetch(event.message_id);
    await message.reply({ t: `Sai cú pháp! Hãy dùng: *create_githook <owner/repo>`});
    return;
  }
  const repo = match[1];
  const channelId = event.channel_id;
  const userId = event.sender_id;

  const token = jwt.sign(
    { user_id: userId, channel_id: channelId, repo },
    PRIVATE_KEY,
    { algorithm: 'RS256', expiresIn: '7d' }
  );
  const host = process.env.IP_HOST;
  const githookUrl = `${host}/review?token=${token}`;
  const msg = await channel.messages.fetch(event.message_id);
    
  const info = `🔗 Repo: ${repo}\nLink githook:\n${githookUrl}`;
  const repoStart = info.indexOf(repo);
  const repoEnd = repoStart + repo.length;
  await msg.reply({
    t: info,
    mk: [
        { type: 'lk', s: repoStart, e: repoEnd},
        { type: 'pre', s: info.indexOf(githookUrl), e: info.indexOf(githookUrl) + githookUrl.length }
    ]
    });

};