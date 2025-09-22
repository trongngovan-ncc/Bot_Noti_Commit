const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const PUBLIC_KEY = fs.readFileSync(path.join(__dirname, '../keys/public.pem'));
const handleNotificationGithub = require('../commands/noti_github');

function formatMessage(event, payload) {
  switch (event) {
    case 'push': {
      const repo = payload.repository?.full_name;
      const branch = (payload.ref || '').replace('refs/heads/', '');
      const pusher = payload.pusher?.name || payload.sender?.login || 'unknown';
      const lines = [`⬆️ Push by ${pusher} on ${repo} (branch: ${branch})`];
      (payload.commits || []).forEach(c => {
        const short = (c.id || c.sha || '').slice(0, 7);
        const url = c.url || `https://github.com/${repo}/commit/${short}`;
        lines.push(`- ${c.message} (${short}) → ${url}`);
      });
      if (!payload.commits || payload.commits.length === 0) {
        lines.push(`Compare: ${payload.compare || ''}`);
      }
      return lines.join('\n');
    }
    case 'pull_request': {
      const action = payload.action;
      const pr = payload.pull_request || {};
      const actor = payload.sender?.login || 'unknown';
      if (action === 'closed' && pr.merged) {
        return `🎉 PR #${pr.number} merged by ${actor}: ${pr.title}\n${pr.html_url}`;
      }
      return `🔀 PR ${action} by ${actor}: ${pr.title} (PR #${pr.number})\n${pr.html_url}`;
    }
    case 'issues': {
      const action = payload.action;
      const issue = payload.issue || {};
      const repo = payload.repository?.full_name || 'unknown';
      const actor = payload.sender?.login || 'unknown';
      return `🐛 Issue ${action} by ${actor} in ${repo}:\n#${issue.number} ${issue.title}\n${issue.html_url}`;
    }
    case 'issue_comment': {
      const sender = payload.sender?.login || 'unknown';
      const body = payload.comment?.body || '';
      const first = body.split('\n')[0];
      return `💬 New comment by ${sender}: "${first}"\n${payload.comment?.html_url || ''}`;
    }
    case 'pull_request_review': {
      const rev = payload.review || {};
      const state = rev.state || 'commented';
      const actor = rev.user?.login || payload.sender?.login || 'unknown';
      const pr = payload.pull_request || {};
      const icon = state === 'approved' ? '✅' : state === 'changes_requested' ? '⚠️' : '📝';
      return `${icon} Review ${state} by ${actor} on PR #${pr.number}\n${rev.html_url || pr.html_url || ''}`;
    }
    case 'create': {
      const ref = payload.ref || '';
      const refType = payload.ref_type || 'unknown';
      const repo = payload.repository?.full_name || 'unknown';
      const actor = payload.sender?.login || 'unknown';
      const url = payload.repository?.html_url || '';
      const icon = refType === 'branch' ? '🌿' : refType === 'tag' ? '🏷️' : '📢';
      return `${icon} Created new ${refType} \`${ref}\` in ${repo} by ${actor}\n${url}`;
    }
    case 'ping': {
        const repo = payload.repository?.full_name || 'unknown';
        const sender = payload.sender?.login || 'unknown';
        return `📡 Webhook ping from ${repo} by ${sender}`;
    }
    case 'check_suite':
    case 'check_run': {
      const suite = payload.check_suite || payload.check_run || {};
      const conclusion = suite.conclusion || 'unknown';
      const repo = payload.repository?.full_name || '';
      if (['failure', 'cancelled'].includes(conclusion)) {
        return `❌ CI ${conclusion} on ${repo} (sha ${ (suite.head_sha||'').slice(0,7) })\n${suite.html_url || ''}`;
      }
      return `ℹ️ CI ${conclusion} on ${repo} (${suite.head_sha || ''})`;
    }
    default:
      return `📢 GitHub event: ${event}\n` + JSON.stringify(payload, null, 2);
  }
}


// Xác thực bằng token JWT
function verifyWebhookToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256'] });
  } catch {
    return null;
  }
}

module.exports = function registerGithubWebhook(app, client, config) {
  // const { WEBHOOK_SECRET } = config;
  app.post('/github/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const token = req.query.token;
  const payloadToken = verifyWebhookToken(token);
      if (!payloadToken) {
        return res.status(401).send('Invalid or missing token');
      }
      // Optionally: idempotency logic (if needed)
      let payload = {};
      try {
        payload = JSON.parse(req.body.toString('utf8'));
      } catch (e) {
        console.warn('Failed to parse webhook payload JSON:', e.message);
      }
      const event = req.headers['x-github-event'] || 'unknown';
      console.log(`Received GitHub event: ${event} (repo=${payload.repository?.full_name || 'unknown'})`);
      const channelId = payloadToken.channel_id;
      console.log("Using channel ID:", channelId);
      const message = formatMessage(event, payload);
      await handleNotificationGithub(client, message, channelId);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Error processing webhook:', err);
      return res.status(500).json({ error: err.message || 'internal error' });
    }
  });
};
