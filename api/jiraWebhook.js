const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const PUBLIC_KEY = fs.readFileSync(path.join(__dirname, '../keys/public.pem'));
const handleNotificationJira = require('../commands/noti_jira');



function verifyJirahookToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256'] });
  } catch {
    return null;
  }
}

module.exports = function registerJiraWebhook(app, client) {
  // const  JIRA_SECRET  = process.env.JIRA_SECRET;
  app.post('/jira/webhook', express.json(), async (req, res) => {
    try {
      const token = req.query.token;
  const payloadToken = verifyJirahookToken(token);
      if (!payloadToken) {
        return res.status(401).send('Invalid or missing token');
      }
      const payload = req.body;
      const event = payload.webhookEvent || 'jira:event';
      let msg = '';
      // Issue events
      if (event.startsWith('jira:issue')) {
        const issue = payload.issue || {};
        const user = payload.user || payload.userDetails || {};
        msg = `� [Jira Issue] ${event.replace('jira:', '')}`;
        if (issue.key) msg += `\n🔑 Issue: ${issue.key}`;
        if (issue.fields && issue.fields.summary) msg += `\n📝 Summary: ${issue.fields.summary}`;
        if (issue.fields && issue.fields.status && issue.fields.status.name) msg += `\n📌 Status: ${issue.fields.status.name}`;
        if (user.displayName) msg += `\n👤 By: ${user.displayName}`;
      }
      // Sprint events
      else if (event.startsWith('sprint')) {
        const sprint = payload.sprint || {};
        msg = `🏁 [Jira Sprint] ${event}`;
        if (sprint.name) msg += `\n🏷️ Sprint: ${sprint.name}`;
        if (sprint.state) msg += `\n📌 State: ${sprint.state}`;
      }
      // Board events
      else if (event.startsWith('board')) {
        const board = payload.board || {};
        msg = `📋 [Jira Board] ${event}`;
        if (board.name) msg += `\n🏷️ Board: ${board.name}`;
      }
      // Project events
      else if (event.startsWith('project')) {
        const project = payload.project || {};
        msg = `📁 [Jira Project] ${event}`;
        if (project.name) msg += `\n🏷️ Project: ${project.name}`;
      }
      // Version events
      else if (event.startsWith('version')) {
        const version = payload.version || {};
        msg = `🏷️ [Jira Version] ${event}`;
        if (version.name) msg += `\n🔖 Version: ${version.name}`;
      }
      // User events
      else if (event.startsWith('user')) {
        const user = payload.user || {};
        msg = `👤 [Jira User] ${event}`;
        if (user.displayName) msg += `\n👤 User: ${user.displayName}`;
      }
      // Comment events
      else if (event.includes('comment')) {
        const comment = payload.comment || {};
        const issue = payload.issue || {};
        msg = `💬 [Jira Comment] ${event}`;
        if (issue.key) msg += `\n🔑 Issue: ${issue.key}`;
        if (comment.body) msg += `\n📝 Comment: ${comment.body}`;
      }
      // Worklog events
      else if (event.includes('worklog')) {
        const worklog = payload.worklog || {};
        const issue = payload.issue || {};
        msg = `⏱️ [Jira Worklog] ${event}`;
        if (issue.key) msg += `\n🔑 Issue: ${issue.key}`;
        if (worklog.timeSpent) msg += `\n⏳ Time Spent: ${worklog.timeSpent}`;
      }
      // Attachment events
      else if (event.includes('attachment')) {
        const attachment = payload.attachment || {};
        const issue = payload.issue || {};
        msg = `📎 [Jira Attachment] ${event}`;
        if (issue.key) msg += `\n🔑 Issue: ${issue.key}`;
        if (attachment.filename) msg += `\n📄 File: ${attachment.filename}`;
      }
      // Fallback for unknown events
      else {
        msg = `🟢 Jira event: ${event}\n${JSON.stringify(payload, null, 2)}`;
      }
      const channelId = payloadToken.channel_id;
      console.log("Using channel ID:", channelId);
      await handleNotificationJira(client, msg, channelId);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Error processing webhook:', err);
      return res.status(500).json({ error: err.message || 'internal error' });
    }
  });
};
