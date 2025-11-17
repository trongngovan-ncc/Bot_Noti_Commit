const axios = require('axios');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const dbPromise = open({ filename: path.join(__dirname, '../database/jira.db'), driver: sqlite3.Database });

module.exports = async function registerJiraCallback(app) {
  const db = await dbPromise;
  app.get('/jira/callback', async (req, res) => {
    const code = req.query.code;
    const state = req.query.state;
    if (!code) return res.status(400).send('Missing code');
    if (!state) return res.status(400).send('Missing state');
    try {
      // Verify state để chống CSRF
      const JIRA_SECRET = process.env.JIRA_SECRET;
      let decoded;
      try {
        decoded = require('jsonwebtoken').verify(state, JIRA_SECRET);
      } catch (err) {
        return res.status(400).send('Invalid state');
      }
      const { user_id, channel_id } = decoded;

      // 1. Lấy token
      const tokenResp = await axios.post('https://auth.atlassian.com/oauth/token', {
        grant_type: 'authorization_code',
        client_id: process.env.JIRA_OAUTH_CLIENT_ID,
        client_secret: process.env.JIRA_OAUTH_CLIENT_SECRET,
        code,
        redirect_uri: process.env.JIRA_OAUTH_REDIRECT_URI
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      const { access_token, refresh_token } = tokenResp.data;

      // 2. Lấy site list
      const sitesResp = await axios.get('https://api.atlassian.com/oauth/token/accessible-resources', {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      const site = sitesResp.data[0];
      if (!site) return res.status(400).send('No Jira site found');
      const cloudId = site.id;

      // 3. Lấy user info
      const userResp = await axios.get(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/myself`, {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      const user = userResp.data;

      // 4. Lưu vào DB theo cấu trúc mới
      await db.run(
        `INSERT OR REPLACE INTO jira_users (
          mezon_user_id, account_id, cloud_id, email, display_name, access_token, refresh_token
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [user_id, user.accountId, cloudId, user.emailAddress, user.displayName, access_token, refresh_token]
      );

      // 5. Lấy danh sách project cho user chọn
      const projectsResp = await axios.get(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search`, {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      const projects = projectsResp.data.values || [];
      if (projects.length === 0) return res.status(400).send('No projects found');

      // Đọc template HTML và thay thế các biến
      const fs = require('fs');
      let template = fs.readFileSync(path.join(__dirname, '../public/templates/select-project.html'), 'utf8');
      
      // Thay thế các biến trong template
      template = template
        .replace('{{PROJECT_OPTIONS}}', projects.map(p => `<option value="${p.key}">${p.name} (${p.key})</option>`).join(''))
        .replace('{{ACCESS_TOKEN}}', access_token)
        .replace('{{CLOUD_ID}}', cloudId);
      
      res.send(template);
    } catch (err) {
      console.error('Jira callback error:', err);
      res.status(500).send('Jira callback failed: ' + err.message);
    }
  });

};
