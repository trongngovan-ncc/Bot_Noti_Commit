const { generateJiraOAuthUrl } = require('../services/jira_oauth');

module.exports = async function handleJiraLogin(client, event) {
  try {
    const channel = await client.channels.fetch(event.channel_id);
    
    // Generate OAuth URL
    const JiraauthUrl = await generateJiraOAuthUrl(event.sender_id, event.channel_id);
    
    // Send message with clickable link
    const message = await channel.messages.fetch(event.message_id);
    const info = `🔗 Click vào link sau để kết nối với Jira:\n${JiraauthUrl}`;
    
    await message.reply({
      t: info,
      mk: [
        { type: 'lk', s: info.indexOf(JiraauthUrl), e: info.indexOf(JiraauthUrl) + JiraauthUrl.length }
      ]
    });

  } catch (error) {
    console.error('Jira login error:', error);
    // Send error message to channel
    const channel = await client.channels.fetch(event.channel_id);
    const message = await channel.messages.fetch(event.message_id);
    await message.reply({ 
      t: '❌ Có lỗi khi kết nối với Jira. Vui lòng thử lại sau.' 
    });
  }
};