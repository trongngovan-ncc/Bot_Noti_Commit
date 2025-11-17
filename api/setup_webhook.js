const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const dbPromise = open({ filename: path.join(__dirname, '../database/github.db'), driver: sqlite3.Database });

async function registerSetupWebhook(app) {
    const db = await dbPromise; // Wait for database initialization
    
    app.post('/setup-webhook', async (req, res) => {
        const { state, repo } = req.body;
        
        try {
            if (!state || !repo) {
                throw new Error('Missing required parameters');
            }

            // Đọc public key từ file
            const publicKeyPath = path.join(__dirname, '../keys/public.pem');
            const PUBLIC_KEY = fs.readFileSync(publicKeyPath, 'utf8');

            // Verify state token
            const decoded = jwt.verify(
                state,
                PUBLIC_KEY,
                { algorithms: ['RS256'] }
            );
            const { user_id, channel_id } = decoded;

            // Get user's access token
            const user = await db.get(
                'SELECT access_token FROM github_users WHERE user_id = ?',
                [user_id]
            );

            if (!user) {
                throw new Error('User not found. Please login again.');
            }

            // Generate webhook secret
            const webhookSecret = process.env.GITHUB_OAUTH_WEBHOOK_SECRET;

            // Kiểm tra webhook đã tồn tại trên repo trước khi tạo mới
            const hooksRes = await axios.get(
                `https://api.github.com/repos/${repo}/hooks`,
                {
                    headers: {
                        Authorization: `Bearer ${user.access_token}`,
                        Accept: 'application/vnd.github.v3+json'
                    }
                }
            );
            const hooks = hooksRes.data;
            const targetUrl = `${process.env.IP_HOST}/github/webhook/v2`;
            const existingHook = hooks.find(hook => hook.config && hook.config.url === targetUrl);

            let webhookId;
            if (existingHook) {
                webhookId = existingHook.id;
            } else {
                // Nếu chưa có thì tạo mới webhook
                const webhookResponse = await axios.post(
                    `https://api.github.com/repos/${repo}/hooks`,
                    {
                        name: 'web',
                        active: true,
                        events: [
                            'push',
                            'pull_request',
                            'pull_request_review',
                            'pull_request_review_comment',
                            'issues',
                            'issue_comment',
                            'create',
                            'delete',
                            'fork',
                            'release',
                            'member',
                            'public',
                            'repository',
                            'status',
                            'watch',
                            'deployment',
                            'deployment_status',
                            'label',
                            'milestone'
                        ],
                        config: {
                            url: targetUrl,
                            content_type: 'json',
                            secret: webhookSecret,
                            insecure_ssl: '0'
                        }
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${user.access_token}`,
                            Accept: 'application/vnd.github.v3+json'
                        }
                    }
                );
                webhookId = webhookResponse.data.id;
            }

            // Kiểm tra trùng channel_id, repo trước khi insert
            const existing = await db.get(
              'SELECT * FROM repo_webhooks WHERE channel_id = ? AND repo = ?',
              [channel_id, repo]
            );
            if (existing) {
              throw new Error('Webhook đã tồn tại cho channel và repo này!');
            } else {
              await db.run(
                `INSERT INTO repo_webhooks 
                (user_id, channel_id, repo, webhook_secret, webhook_id) 
                VALUES (?, ?, ?, ?, ?)`,
                [user_id, channel_id, repo, webhookSecret, webhookId]
              );
            }

            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Webhook Setup Complete</title>
                    <style>
                        body {
                            font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto;
                            max-width: 800px;
                            margin: 0 auto;
                            padding: 20px;
                            text-align: center;
                        }
                        h1 { color: #24292e; }
                        .success { color: #2ea44f; }
                    </style>
                </head>
                <body>
                    <h1>✅ Webhook Setup Complete!</h1>
                    <p class="success">You can now close this window.</p>
                    <p>You will receive notifications in your Mezon channel for:</p>
                    <ul>
                        <li>Push events</li>
                        <li>Pull request events</li>
                        <li>Pull request reviews</li>
                        <li>Pull request review comments</li>
                    </ul>
                </body>
                </html>
            `);

        } catch (error) {
            console.error('Webhook setup error nhé:', error);
                if (error.response && error.response.data) {
                    console.error('Webhook error details:', error.response.data.errors);
                }
            res.status(400).send('Error: ' + error.message);
        }
    });
}

module.exports = {
    registerSetupWebhook
};