const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const dbPromise = open({ filename: path.join(__dirname, '../database/github.db'), driver: sqlite3.Database });

async function registerSelectRepo(app) {
    const db = await dbPromise; // Wait for database initialization
    
    app.get('/select-repo', async (req, res) => {
        const { state } = req.query;
        
        try {
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

            // Get list of repos user has access to
            const repos = await axios.get('https://api.github.com/user/repos', {
                headers: {
                    Authorization: `Bearer ${user.access_token}`,
                    Accept: 'application/vnd.github.v3+json'
                },
                params: {
                    sort: 'updated',
                    per_page: 100
                }
            });

            // Render repo selection page
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Select GitHub Repository</title>
                    <style>
                        body {
                            font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto;
                            max-width: 800px;
                            margin: 0 auto;
                            padding: 20px;
                        }
                        h1 {
                            color: #24292e;
                        }
                        select {
                            width: 100%;
                            padding: 8px;
                            margin: 10px 0;
                            border: 1px solid #e1e4e8;
                            border-radius: 6px;
                        }
                        button {
                            background-color: #2ea44f;
                            color: white;
                            padding: 8px 16px;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                        }
                        button:hover {
                            background-color: #2c974b;
                        }
                    </style>
                </head>
                <body>
                    <h1>🔗 Select a repository to setup webhook</h1>
                    <form action="/setup-webhook" method="POST">
                        <input type="hidden" name="state" value="${state}" />
                        <select name="repo" required>
                            <option value="">Choose a repository...</option>
                            ${repos.data
                                .filter(repo => repo.permissions?.admin)
                                .map(repo => `
                                    <option value="${repo.full_name}">${repo.full_name}</option>
                                `).join('')}
                        </select>
                        <button type="submit">Setup Webhook</button>
                    </form>
                </body>
                </html>
            `);

        } catch (error) {
            console.error('Repo selection error:', error);
            res.status(400).send('Error: ' + error.message);
        }
    });
}

module.exports = {
    registerSelectRepo
};