const express = require('express');
const axios = require('axios');
const requestIp = require('request-ip');
require('dotenv').config();
const querystring = require('querystring');
const app = express();

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;  // Discord App Client ID
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;  // Discord App Client Secret
const REDIRECT_URI = 'http://localhost:3000/auth/callback';  // OAuth2 Callback URL

let viewers = [];

// Middleware to capture IP addresses
app.use(requestIp.mw());

// Route to initiate Discord OAuth2
app.get('/auth', (req, res) => {
  const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify`;
  res.redirect(discordAuthUrl);
});

// Route to handle OAuth2 callback
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Authorization code is required');
  }

  try {
    // Exchange authorization code for an access token
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', querystring.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
      scope: 'identify',
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token } = tokenResponse.data;

    // Use the access token to fetch user data from Discord
    const userResponse = await axios.get('https://discord.com/api/v9/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const discordId = userResponse.data.id;
    const discordProfilePic = userResponse.data.avatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${userResponse.data.avatar}.png`
      : 'https://cdn.discordapp.com/embed/avatars/0.png';

    const ip = req.clientIp;

    // Log viewer data
    viewers.push({
      discordId,
      ip,
      profilePic: discordProfilePic,
      timestamp: new Date().toISOString(),
    });

    // Send viewer data to the webhook
    await axios.post(process.env.WEBHOOK_URL, {
      content: `New viewer:\n**Discord ID**: ${discordId}\n**IP**: ${ip}\n**Profile Picture**: ${discordProfilePic}`,
    });

    res.send('Viewer logged successfully!');
  } catch (error) {
    console.error('Error during OAuth2 callback:', error);
    res.status(500).send('Error logging viewer');
  }
});

// Route to fetch all viewers
app.get('/viewers', (req, res) => {
  res.json(viewers);
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
