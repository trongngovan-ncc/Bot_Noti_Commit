const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

function generateOAuthUrl(userId, channelId) {
  const GITHUB_CLIENT_ID = process.env.GITHUB_OAUTH_CLIENT_ID;
  const REDIRECT_URI = `${process.env.IP_HOST}/github/callback`;
  
  try {
    // Đọc private key từ file
    const privateKeyPath = path.join(__dirname, '../keys/private.pem');
    const PRIVATE_KEY = fs.readFileSync(privateKeyPath, 'utf8');

    if (!PRIVATE_KEY) {
      throw new Error('Private key not found');
    }

    // Generate state token using RS256 and private key
    const state = jwt.sign(
      { 
        user_id: userId, 
        channel_id: channelId 
      },
      PRIVATE_KEY,
      { 
        algorithm: 'RS256',
        expiresIn: '10m' 
      }
    );

  // 1. Build OAuth URL - Following GitHub docs
  // https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps
  const params = new URLSearchParams();
  params.append('client_id', GITHUB_CLIENT_ID);
  params.append('redirect_uri', REDIRECT_URI);
  // Ghép các scope thành một chuỗi, cách nhau bởi dấu cách
  params.append('scope', 'repo admin:repo_hook write:repo_hook');
  params.append('state', state);
  params.append('allow_signup', 'false');

  const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;


  return authUrl;

  } catch (error) {
    console.error('Error generating OAuth URL:', error);
    throw error;
  }
}

module.exports = { generateOAuthUrl };