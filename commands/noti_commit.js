module.exports = async function handleNotification(client, result) {

  try {
    const channelId = process.env.DEFAULT_CHANNEL_ID ;
    const channel = await client.channels.fetch(channelId);
    await channel.send({ t: result });
  } catch (err) {
    console.error(err);
  }
}