module.exports = async function handleIntro(client, event) {

  try {
    const channel = await client.channels.fetch(event.channel_id);
    const message = await channel.messages.fetch(event.message_id);
  const introText =
`🤖 Xin chào! Tôi là bot hỗ trợ thông báo và review code cho các dự án trên các nền tảng Git/GitHub/Jira và thông báo tới Mezon.Các lệnh bạn có thể sử dụng:\n
- 📝 *intro_githook: Hướng dẫn tích hợp git pre-commit gửi diff lên bot.
- 📝 *intro_webhook: Hướng dẫn cấu hình webhook GitHub.
- 🛡️ *create_webhook <usergithub/reponame>: Tạo URL webhook bảo mật cho repo với token.
- 🛡️ *create_githook <usergithub/reponame>: Tạo API bảo mật cho git pre-commit với token.
- 🛡️ *create_jirahook : Tạo API bảo mật cho Jira với token.
- ⚠️ *Lưu ý: Tạo URL webhook hay API githook ở channel nào thì mặc định bot sẽ thông báo đến channel đó.`;
    await message.reply({
      t: introText,
      mk: [
        { type: 'pre', s: 0, e: introText.length }
      ]
    });
  } catch (err) {
    console.error(err);
  }
}