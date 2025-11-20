const fs = require('fs');
const express = require('express');
const jwt = require('jsonwebtoken');
const PUBLIC_KEY = fs.readFileSync('keys/public.pem', 'utf8');
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
      if (!diff_base64){
        console.log("request body", req.body);
        return res.status(400).json({ error: 'Missing diff_base64' });
      }
      const diff = Buffer.from(diff_base64, 'base64').toString('utf-8');
      let userInfo = {};
      if (userInfo_base64) {
        try {
          userInfo = JSON.parse(Buffer.from(userInfo_base64, 'base64').toString('utf-8'));
        } catch {}
      }
      const repoFromToken = payloadToken.repo;
      console.log("repoFromToken", repoFromToken);
      console.log("repoLink", repoLink);
      if (repoFromToken && repoLink && repoFromToken !== repoLink) {
        return res.status(403).json({ error: 'Repo mismatch between token and request' });
      }
      console.log("Diff received:", diff);
      res.json({ message: 'Diff received! Review will be sent to channel soon.' });
      console.log("userInfo", userInfo);
      handleNotificationGit(client, diff, payloadToken.channel_id, { repoLink, ...userInfo }, payloadToken.user_id);
      return;
      
    } catch (err) {
      res.status(500).json({ error: err.message || 'internal error' });
    }
  });
};
