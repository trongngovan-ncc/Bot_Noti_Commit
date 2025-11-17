const jwt = require('jsonwebtoken');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class GitHubAppService {
    constructor() {
        // Đọc private key dùng để sign JWT
        const privateKeyPath = path.join(__dirname, '../keys/notirepogithub.2025-10-01.private-key.pem');
        this.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
        
        // Load config từ env
        this.appId = process.env.GITHUB_APP_ID;
        this.webhookSecret = process.env.GITHUB_APP_WEBHOOK_SECRET;
    }

    /**
     * Generate JWT token theo GitHub App spec
     * https://docs.github.com/en/apps/creating-github-apps/authenticating-with-github-apps/generating-a-json-web-token-jwt-for-a-github-app
     */
    generateJWT() {
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            iat: now - 60,        // Issued 60 seconds ago
            exp: now + (10 * 60), // Expires in 10 minutes
            iss: this.appId       // GitHub App's identifier
        };

        return jwt.sign(payload, this.privateKey, { algorithm: 'RS256' });
    }

    /**
     * Tạo installation access token
     * https://docs.github.com/en/rest/apps/apps#create-an-installation-access-token
     */
    async createInstallationToken(installationId) {
        try {
            const jwtToken = this.generateJWT();
            
            const response = await axios.post(
                `https://api.github.com/app/installations/${installationId}/access_tokens`,
                {},  // Empty body
                {
                    headers: {
                        'Authorization': `Bearer ${jwtToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            return response.data.token;
        } catch (error) {
            console.error('Error creating installation token:', error);
            throw error;
        }
    }

    /**
     * Lấy thông tin installation
     * https://docs.github.com/en/rest/apps/apps#get-an-installation-for-the-authenticated-app
     */
    async getInstallationInfo(installationId, token) {
        try {
            const response = await axios.get(
                `https://api.github.com/app/installations/${installationId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error getting installation info:', error);
            throw error;
        }
    }

    /**
     * Tạo URL để cài đặt GitHub App
     * https://docs.github.com/en/apps/creating-github-apps/setting-up-a-github-app/creating-a-github-app
     */
    generateInstallUrl(userId, channelId) {
        // Tạo state token để verify callback
        const state = jwt.sign(
            { user_id: userId, channel_id: channelId },
            this.privateKey,
            { algorithm: 'RS256', expiresIn: '10m' }
        );

        return `https://github.com/apps/${process.env.GITHUB_APP_NAME}/installations/new?state=${state}`;
    }

    /**
     * Verify webhook signature
     * https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
     */
    verifyWebhookSignature(payload, signature) {
        const crypto = require('crypto');
        const sig = Buffer.from(signature || '', 'utf8');
        const hmac = crypto.createHmac('sha256', this.webhookSecret);
        const digest = Buffer.from('sha256=' + hmac.update(payload).digest('hex'), 'utf8');
        
        if (sig.length !== digest.length || !crypto.timingSafeEqual(digest, sig)) {
            throw new Error('Invalid webhook signature');
        }
        return true;
    }
}

module.exports = new GitHubAppService();