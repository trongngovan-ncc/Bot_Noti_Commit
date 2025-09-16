const express = require('express');
const handleNotificationGit = require('../commands/noti_git');

module.exports = function registerReviewApi(app, client) {
  app.post('/review', async (req, res) => {
    try {
      const { diff_base64, channelId } = req.body;
      if (!diff_base64 || !channelId) return res.status(400).json({ error: 'Missing diff_base64 or channelId' });
      const diff = Buffer.from(diff_base64, 'base64').toString('utf-8');
      await handleNotificationGit(client, diff, channelId);
      return res.json({ message: 'Diff sent to Mezon channel!' });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'internal error' });
    }
  });
};
