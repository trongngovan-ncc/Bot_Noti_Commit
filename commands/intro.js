module.exports = async function handleHelp(client, event) {

  try {
    const channel = await client.channels.fetch(event.channel_id);

    const introText = `
      Xin chào! Tôi là bot hỗ trợ thông báo các commit của bạn lên mezon chat chanel.
    `;

    await channel.send({ t: introText });


  } catch (err) {
    console.error(err);
  }
}