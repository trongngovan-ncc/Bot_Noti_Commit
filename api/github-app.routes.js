const express = require('express');
const jwt = require('jsonwebtoken');
const githubAppService = require('../services/github-app.service');


async function registerGitHubAppRoutes(app, client) {

        const handleNotificationGithub = require('../commands/noti_github');
        function formatMessage(event, payload) {
            switch (event) {
                case 'installation_repositories': {
                            const action = payload.action || 'unknown';
                            const account = payload.installation?.account?.login || 'unknown';
                            let repoList = '';
                            if (Array.isArray(payload.repositories_added) && payload.repositories_added.length > 0) {
                                repoList = 'Các repository thêm:\n' + payload.repositories_added.map(r => `- ${r.full_name}`).join('\n');
                            }
                            if (Array.isArray(payload.repositories_removed) && payload.repositories_removed.length > 0) {
                                repoList += (repoList ? '\n' : '') + 'Các repository xoá:\n' + payload.repositories_removed.map(r => `- ${r.full_name}`).join('\n');
                            }
                            if (!repoList) repoList = '(Không có repository nào thay đổi)';
                            return `🛠️ GitHub App event: ${action} cho tài khoản ${account}.\n${repoList}`;
                        }
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

        // Handle webhook events
        app.post('/github-app/webhook', express.json(), async (req, res) => {
                try {
                        // Verify webhook signature
                        const signature = req.headers['x-hub-signature-256'];
                        console.log('signature', signature);
                        githubAppService.verifyWebhookSignature(JSON.stringify(req.body), signature);
                        if(githubAppService.verifyWebhookSignature(JSON.stringify(req.body), signature) === false) {
                                return res.status(401).send('Invalid signature');
                        }else {
                                console.log('Signature valid');
                        }

                        // Process webhook event
                        const event = req.headers['x-github-event'];
                        const payload = req.body;

                        const channelId = '1973340535980560384'; 

                        const message = formatMessage(event, payload);
                        await handleNotificationGithub(client, message, channelId);

                        res.status(200).send('Webhook received');
                } catch (error) {
                        console.error('Webhook error:', error);
                        res.status(500).send('Webhook processing failed');
                }
        });
}

module.exports = {
    registerGitHubAppRoutes
};