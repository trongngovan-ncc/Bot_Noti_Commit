module.exports = async function handleIntroJiraHook(client, event) {
  const channel = await client.channels.fetch(event.channel_id);
  const msg = await channel.messages.fetch(event.message_id);

  const intro = `📝 Hướng dẫn cấu hình webhook Jira:\n1. Vào phần Settings > Webhooks của project Jira.\n2. Copy URL đã tạo từ lệnh *create_jirahook <user/repo> vào trường Payload URL.\n3. Chọn Content type là application/json.\n4. Tick các option như hình dưới đây là xong!`;


  const imageUrl = process.env.URL_IMAGE || '';
  const attachmentsArr = imageUrl ? [
    {
      filename: "webhook_guide.png",
      url: imageUrl,
      filetype: "image/png",
      width: 1000,
      height: 700

    }
  ] : [];

  await msg.reply({
    t: intro,
    mk: [
      { type: 'pre', s: 0, e: intro.length }
    ]
  }, undefined, attachmentsArr);
};
