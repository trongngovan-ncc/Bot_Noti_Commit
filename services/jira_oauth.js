const jwt = require('jsonwebtoken');

function generateJiraOAuthUrl(userId, channelId) {
  const JIRA_CLIENT_ID = process.env.JIRA_OAUTH_CLIENT_ID;
  const REDIRECT_URI = process.env.JIRA_OAUTH_REDIRECT_URI;
  const JIRA_SECRET = process.env.JIRA_SECRET;


  const state = jwt.sign(
    { user_id: userId, channel_id: channelId },
    JIRA_SECRET,
    { expiresIn: '10m' }
  );

  const params = new URLSearchParams();
  params.append('audience', 'api.atlassian.com');
  params.append('client_id', JIRA_CLIENT_ID);
  params.append('scope', 'read:jira-user manage:jira-webhook read:jira-work offline_access');
  params.append('redirect_uri', REDIRECT_URI);
  params.append('state', state);
  params.append('response_type', 'code');
  params.append('prompt', 'consent');

  const authUrl = `https://auth.atlassian.com/authorize?${params.toString()}`;
  return authUrl;
}

module.exports = { generateJiraOAuthUrl };
