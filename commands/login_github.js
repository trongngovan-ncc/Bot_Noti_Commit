const { generateOAuthUrl } = require('../services/github_oauth');

module.exports = async function handleGithubLogin(client, event) {
  try {
    const channel = await client.channels.fetch(event.channel_id);
    
    // Generate OAuth URL
    const authUrl = await generateOAuthUrl(event.sender_id, event.channel_id);
    
    // Send message with clickable link
    const message = await channel.messages.fetch(event.message_id);
    const info = `🔗 Click vào link sau để kết nối với GitHub:\n${authUrl}`;
    
    await message.reply({
      t: info,
      mk: [
        { type: 'lk', s: info.indexOf(authUrl), e: info.indexOf(authUrl) + authUrl.length }
      ]
    });

  } catch (error) {
    console.error('GitHub login error:', error);
    // Send error message to channel
    const channel = await client.channels.fetch(event.channel_id);
    const message = await channel.messages.fetch(event.message_id);
    await message.reply({ 
      t: '❌ Có lỗi khi kết nối với GitHub. Vui lòng thử lại sau.' 
    });
  }
};