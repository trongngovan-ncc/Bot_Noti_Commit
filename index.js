// server.js
require('dotenv').config();
const crypto = require('crypto');
const express = require('express');

const { MezonClient } = require('mezon-sdk');
const handleNotificationGit = require('./commands/noti_git');
const handleNotificationGithub = require('./commands/noti_github');

/** CONFIG */
const PORT = process.env.PORT || 8000;
const APP_TOKEN = process.env.APPLICATION_TOKEN;
const GITHUB_SECRET = process.env.GITHUB_SECRET; // secret bạn set trên GitHub webhook
const DEFAULT_CHANNEL_ID = process.env.DEFAULT_CHANNEL_ID || 'your_channel_id_here';

/** Optional repo->channel map (JSON string in env) */
let repoChannelMap = {};
if (process.env.REPO_CHANNEL_MAP) {
  try {
    repoChannelMap = JSON.parse(process.env.REPO_CHANNEL_MAP);
  } catch (e) {
    console.warn('Invalid REPO_CHANNEL_MAP, must be JSON. Falling back to default channel.');
    repoChannelMap = {};
  }
}

/** Idempotency (Redis optional, fallback in-memory) */
let idempotency = null;
async function initIdempotency() {
  const ttlSeconds = parseInt(process.env.IDEMPOTENCY_TTL_SECONDS || '86400', 10);
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const IORedis = require('ioredis');
      const client = new IORedis(redisUrl);
      idempotency = {
        async acquire(key) {
          const res = await client.setnx(key, '1');
          if (res === 1) {
            await client.expire(key, ttlSeconds);
            return true;
          }
          return false;
        },
      };
      console.log('Idempotency using Redis at', redisUrl);
      return;
    } catch (e) {
      console.warn('ioredis not available or failed to connect. Using in-memory fallback.');
    }
  }

  const map = new Map();
  idempotency = {
    async acquire(key) {
      if (map.has(key)) return false;
      map.set(key, Date.now());
      setTimeout(() => map.delete(key), ttlSeconds * 1000);
      return true;
    },
  };
  console.log('Idempotency using in-memory Map (dev). TTL seconds:', ttlSeconds);
}

/** Verify signature using raw buffer. Returns boolean. */
function verifyGitHubSignature(bufferBody, signatureHeader) {
  if (!GITHUB_SECRET) {
    console.warn('GITHUB_SECRET not set — skipping verification (NOT recommended).');
    return true;
  }
  if (!signatureHeader) return false;

  // expected format: "sha256=<hex>"
  const expectedHex = crypto.createHmac('sha256', GITHUB_SECRET).update(bufferBody).digest('hex');
  const expected = 'sha256=' + expectedHex;

  const expectedBuf = Buffer.from(expected, 'utf8');
  const providedBuf = Buffer.from(signatureHeader, 'utf8');

  // timingSafeEqual requires same length, otherwise it throws.
  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }
  try {
    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  } catch (e) {
    return false;
  }
}

/** Simple formatter for common events */
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

/** Resolve channel for repo */
function resolveChannelForRepo(repoFullName) {
  if (!repoFullName) return DEFAULT_CHANNEL_ID;
  return repoChannelMap[repoFullName] || DEFAULT_CHANNEL_ID;
}

/** Start server */
(async () => {
  if (!APP_TOKEN) {
    console.error('APPLICATION_TOKEN not set. Exiting.');
    process.exit(1);
  }

  await initIdempotency();

  const client = new MezonClient(APP_TOKEN);
  try {
    await client.login();
    console.log('✅ Mezon client logged in');
  } catch (e) {
    console.error('⚠️ Mezon client login failed (will try later):', e.message || e);
  }

  const app = express();

  // IMPORTANT: register raw parser route BEFORE any JSON parser middleware
  // so we preserve the raw Buffer for signature verification.
  app.post('/github/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const sig = req.headers['x-hub-signature-256'];
      const deliveryId = req.headers['x-github-delivery'];
      const event = req.headers['x-github-event'] || 'unknown';

      // verify signature using raw buffer (req.body is Buffer here)
      if (!verifyGitHubSignature(req.body, sig)) {
        console.warn('Invalid GitHub signature for delivery:', deliveryId);
        return res.status(401).send('Invalid signature');
      }

      // idempotency
      if (deliveryId) {
        const ok = await idempotency.acquire(`gh:delivery:${deliveryId}`);
        if (!ok) {
          console.log('Duplicate delivery ignored:', deliveryId);
          return res.status(200).send('Duplicate ignored');
        }
      }

      // parse buffer -> object
      let payload = {};
      try {
        payload = JSON.parse(req.body.toString('utf8'));
      } catch (e) {
        console.warn('Failed to parse webhook payload JSON:', e.message);
      }

      console.log(`Received GitHub event: ${event} (repo=${payload.repository?.full_name || 'unknown'})`);

      const channelId = resolveChannelForRepo(payload.repository?.full_name);
      const message = formatMessage(event, payload);

      // send to Mezon
      await handleNotificationGithub(client, message, channelId);

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Error processing webhook:', err);
      return res.status(500).json({ error: err.message || 'internal error' });
    }
  });

  // Now mount JSON parser for other endpoints (won't affect /github/webhook)
  app.use(express.json());

  // /review endpoint (existing)
  app.post('/review', async (req, res) => {
    try {
      const { diff, channelId } = req.body;
      if (!diff || !channelId) return res.status(400).json({ error: 'Missing diff or channelId' });
      await handleNotificationGit(client, diff, channelId);
      return res.json({ message: 'Diff sent to Mezon channel!' });
    } catch (err) {
      console.error('Error in /review:', err);
      return res.status(500).json({ error: err.message || 'internal error' });
    }
  });

  // health
  app.get('/health', (req, res) => res.json({ ok: true }));

  app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log(`🔗 GitHub webhook endpoint: POST /github/webhook`);
  });
})();
