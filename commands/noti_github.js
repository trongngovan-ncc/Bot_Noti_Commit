
module.exports = async function handleNotificationGit(client, result, channelId) {
  try {
	 
	const channel = await client.channels.fetch(channelId);
	await channel.send({ t: result });
  } catch (err) {
	console.error(err);
  }
}

