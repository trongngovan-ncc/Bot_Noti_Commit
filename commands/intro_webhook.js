module.exports = async function handleIntroWebhook(client, event) {
  const channel = await client.channels.fetch(event.channel_id);
  const msg = await channel.messages.fetch(event.message_id);

  const intro = `📝 Hướng dẫn cấu hình webhook GitHub:\n1. Vào phần Settings > Webhooks của repository GitHub.\n2. Copy URL đã tạo từ lệnh *create_webhook <user/repo> vào trường Payload URL.\n3. Chọn Content type là application/json.\n4. Tick các option như hình dưới đây là xong!`;

  // Lấy URL ảnh từ biến môi trường
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
