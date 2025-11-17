const express = require('express');
const crypto = require('crypto');
const handleNotificationGithub = require('../commands/noti_github');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const dbPromise = open({ filename: path.join(__dirname, '../database/github.db'), driver: sqlite3.Database });

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

async function verifyWebhookSignature(payload, signature, secret) {
  const sig = Buffer.from(signature || '', 'utf8');
  const hmac = crypto.createHmac('sha256', secret);
  const digest = Buffer.from('sha256=' + hmac.update(payload).digest('hex'), 'utf8');
  return sig.length === digest.length && crypto.timingSafeEqual(digest, sig);
}

module.exports = async function registerGithubWebhook2(app, client) {
  const db = await dbPromise;
  app.post('/github/webhook/v2', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const signature = req.headers['x-hub-signature-256'];
      let payload = {};
      if (Buffer.isBuffer(req.body)) {
        try {
          payload = JSON.parse(req.body.toString('utf8'));
        } catch (e) {
          console.warn('Failed to parse webhook payload JSON:', e.message);
          return res.status(400).send('Invalid payload');
        }
      } else if (typeof req.body === 'object') {
        payload = req.body;
      } else {
        console.warn('Unexpected payload type:', typeof req.body);
        return res.status(400).send('Invalid payload type');
      }
      // Lấy secret từ DB theo repo
      const repo = payload.repository?.full_name;
      const webhook = await db.get('SELECT webhook_secret, channel_id FROM repo_webhooks WHERE repo = ?', [repo]);
      if (!webhook) {
        return res.status(404).send('Webhook config not found');
      }
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(payload), 'utf8');
      const isValid = await verifyWebhookSignature(rawBody, signature, webhook.webhook_secret);
      if (!isValid) {
        return res.status(401).send('Invalid signature');
      }
      const event = req.headers['x-github-event'] || 'unknown';
      const channelId = webhook.channel_id;
      const message = formatMessage(event, payload);
      await handleNotificationGithub(client, message, channelId);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Error processing webhook:', err);
      return res.status(500).json({ error: err.message || 'internal error' });
    }
  });
};
