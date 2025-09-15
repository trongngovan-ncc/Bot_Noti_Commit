module.exports = async function handleIntro(client, event) {

  try {
    const channel = await client.channels.fetch(event.channel_id);

    const introText = `
    Xin chào! Tôi là bot hỗ trợ phát nhạc trong kênh họp trực tuyến.

      Các lệnh bạn có thể sử dụng:
      - *intro_noticode: Hiển thị hướng dẫn sử dụng bot.
      - *mapping_repo_channel <usergithub/reponame> <channel_id>: Liên kết kho mã nguồn với kênh hiện tại để nhận thông báo về các thay đổi trên github.

    `;
    const introTextdep = "```" + introText + "```";

    const message = await channel.messages.fetch(event.message_id);
    await message.reply({ t: introTextdep });

  } catch (err) {
    console.error(err);
  }

}