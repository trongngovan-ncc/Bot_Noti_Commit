const express = require('express');
const handleNotificationGit = require('../commands/noti_git');

module.exports = function registerReviewApi(app, client) {
  app.post('/review', async (req, res) => {
    try {
      const { diff, channelId } = req.body;
      if (!diff || !channelId) return res.status(400).json({ error: 'Missing diff or channelId' });
      await handleNotificationGit(client, diff, channelId);
      return res.json({ message: 'Diff sent to Mezon channel!' });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'internal error' });
    }
  });
};
