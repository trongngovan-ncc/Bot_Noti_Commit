const githubApp = require('../services/github-app.service');

module.exports = async function handleGithubLogin(client, event) {
  try {
    const channel = await client.channels.fetch(event.channel_id);
    
    // Generate GitHub App installation URL
    const githubappUrl = githubApp.generateInstallUrl(event.sender_id, event.channel_id);
    
    // Send message with clickable link
    const message = await channel.messages.fetch(event.message_id);
    const info = `🔗 Click vào link sau để kết nối với GitHub App:\n${githubappUrl}`;
    
    await message.reply({
      t: info,
      mk: [
        { type: 'lk', s: info.indexOf(githubappUrl), e: info.indexOf(githubappUrl) + githubappUrl.length }
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