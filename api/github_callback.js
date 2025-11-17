const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const dbPromise = open({ filename: path.join(__dirname, '../database/github.db'), driver: sqlite3.Database });

async function registerGithubCallback(app) {
    const db = await dbPromise; // Wait for database initialization
    app.get('/github/callback', async (req, res) => {
        const { code, state } = req.query;

        try {
            // Đọc public key từ file
            const publicKeyPath = path.join(__dirname, '../keys/public.pem');
            const PUBLIC_KEY = fs.readFileSync(publicKeyPath, 'utf8');

            // Verify state token để tránh CSRF
            const decoded = jwt.verify(
                state,
                PUBLIC_KEY,
                { algorithms: ['RS256'] }
            );
            const { user_id, channel_id } = decoded;

            // 2. Exchange code for an access token - Following GitHub docs
            // https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#2-users-are-redirected-back-to-your-site-by-github
            const tokenRes = await axios({
                method: 'post',
                url: 'https://github.com/login/oauth/access_token',
                // Request parameters
                data: {
                    client_id: process.env.GITHUB_OAUTH_CLIENT_ID,
                    client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
                    code: code,
                    redirect_uri: process.env.IP_HOST + '/github/callback'  // Must match the redirect_uri in step 1
                },
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (tokenRes.data.error) {
                throw new Error(tokenRes.data.error_description);
            }

            console.log('Token response:', tokenRes.data);
            const access_token = tokenRes.data.access_token;

            // // Check token scopes
            // const scopeCheck = await axios.get('https://api.github.com/user', {
            //     headers: {
            //         Authorization: `Bearer ${access_token}`,
            //         Accept: 'application/vnd.github.v3+json'
            //     }
            // });
            
            // console.log('Token scopes:', scopeCheck.headers['x-oauth-scopes']);

            // Lấy thông tin GitHub user
            const githubUser = await axios.get('https://api.github.com/user', {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            });

            // Lưu thông tin vào database
            await db.run(
                `INSERT OR REPLACE INTO github_users 
                (user_id, github_id, github_login, access_token) 
                VALUES (?, ?, ?, ?)`,
                [
                    user_id,
                    githubUser.data.id,
                    githubUser.data.login,
                    access_token
                ]
            );

            // Redirect sang trang chọn repo
            res.redirect(`/select-repo?state=${state}`);

        } catch (error) {
            console.error('GitHub callback error:', error);
            res.status(400).send('Authentication failed: ' + error.message);
        }
    });
}

module.exports = {
    registerGithubCallback
    
};