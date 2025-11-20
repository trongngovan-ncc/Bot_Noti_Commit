const fs = require('fs');
const jwt = require('jsonwebtoken');
const PRIVATE_KEY = fs.readFileSync('keys/private.pem', 'utf8');

module.exports = async function handleCreateGitHook(client, event) {
  const channel = await client.channels.fetch(event.channel_id);
  const clanId = event.clan_id;
  if (!clanId || clanId == 0) {
    const message = await channel.messages.fetch(event.message_id);
    await message.reply({ t: `Lệnh này không hỗ trợ DM!`});
    return;
  }
  const text = event?.content?.t?.trim();
  const match = text.match(/^\*create_githook\s+([^\s]+)$/i);
  if (!match) {
    const message = await channel.messages.fetch(event.message_id);
    await message.reply({ t: `Sai cú pháp! Hãy dùng: *create_githook <linkrepo>`});
    return;
  }
  const repolink = match[1];
  const channelId = event.channel_id;
  if(!channelId) {
    const message = await channel.messages.fetch(event.message_id);
    await message.reply({ t: `Không tìm thấy channel ID!`});
    return;
  }
  const userId = event.sender_id;

  const token = jwt.sign(
    { user_id: userId, channel_id: channelId, repo: repolink },
    PRIVATE_KEY,
    { algorithm: 'RS256', expiresIn: '7d' }
  );
  const host = process.env.IP_HOST;
  const githookUrl = `${host}/review?token=${token}`;
  const msg = await channel.messages.fetch(event.message_id);
    
  const info = `🔗 Repo: ${repolink}\nLink githook:\n${githookUrl}`;
  const repoStart = info.indexOf(repolink);
  const repoEnd = repoStart + repolink.length;

  const CLAN_ID = process.env.CLAN_ID;
  const clan = await client.clans.fetch(CLAN_ID);
  const userObj = await clan.users.fetch(userId);
  await userObj.sendDM({
    t: info,
    mk: [
      { type: 'lk', s: repoStart, e: repoEnd },
      { type: 'pre', s: info.indexOf(githookUrl), e: info.indexOf(githookUrl) + githookUrl.length }
    ]
  });
  await msg.reply({ t: 'Done, check your DM for the githook link! Please create link hook again after 7 days.' });

};