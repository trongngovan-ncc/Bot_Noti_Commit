
function extractRepoFromLink(repoLink) {
  if (!repoLink) return '';

  const match = repoLink.match(/github\.com[/:]([^/]+\/[^/.]+)(\.git)?$/);
  return match ? match[1] : '';
}

const express = require('express');
const jwt = require('jsonwebtoken');
const PUBLIC_KEY = process.env.PUBLIC_KEY_PEM;
const handleNotificationGit = require('../commands/noti_git');

function verifyWebhookToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256'] });
  } catch {
    return null;
  }
}

module.exports = function registerReviewApi(app, client) {
  // const GITHOOK_SECRET  = process.env.GITHOOK_SECRET;
  app.post('/review', express.json(), async (req, res) => {
    try {
      const token = req.query.token || req.body.token;
      const payloadToken = verifyWebhookToken(token);
      if (!payloadToken) {
        return res.status(401).json({ error: 'Invalid or missing token' });
      }
      const { diff_base64, repoLink, userInfo_base64 } = req.body;
      if (!diff_base64) return res.status(400).json({ error: 'Missing diff_base64' });
      const diff = Buffer.from(diff_base64, 'base64').toString('utf-8');
      let userInfo = {};
      if (userInfo_base64) {
        try {
          userInfo = JSON.parse(Buffer.from(userInfo_base64, 'base64').toString('utf-8'));
        } catch {}
      }
      
      const repoFromToken = payloadToken.repo;
      const repoFromLink = extractRepoFromLink(repoLink);
      if (repoFromToken && repoFromLink && repoFromToken !== repoFromLink) {
        return res.status(403).json({ error: 'Repo mismatch between token and request' });
      }
    
      res.json({ message: 'Diff received! Review will be sent to channel soon.' });
      console.log("userInfo", userInfo);
      handleNotificationGit(client, diff, payloadToken.channel_id, { repoLink, ...userInfo }, token);
      
    } catch (err) {
      res.status(500).json({ error: err.message || 'internal error' });
    }
  });
};
