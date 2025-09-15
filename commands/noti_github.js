
module.exports = async function handleNotificationGit(client, result, channelId) {
  try {
	console.log("Result to notify:", result);
  
	const channel = await client.channels.fetch(channelId);
	await channel.send({ t: result,
     mk: [
        { type: 'pre', s: 0 , e:result.length }
    ]
   });
  } catch (err) {
	console.error(err);
  }
}

