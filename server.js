const express = require('express');
const axios = require('axios');
const requestIp = require('request-ip');
require('dotenv').config();

const app = express();
let viewers = [];

// Middleware to capture IP addresses
app.use(requestIp.mw());

// Serve static files (like index.html) from the "public" folder
app.use(express.static('public'));

// Route to log a new viewer
app.get('/enter', async (req, res) => {
  const discordId = req.query.discordId;
  const ip = req.clientIp;

  if (!discordId) {
    return res.status(400).send('Discord ID is required');
  }

  try {
    const discordData = await axios.get(`https://discord.com/api/v9/users/${discordId}`, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      },
    });

    const discordProfilePic = discordData.data.avatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${discordData.data.avatar}.png`
      : 'https://cdn.discordapp.com/embed/avatars/0.png';

    viewers.push({
      discordId,
      ip,
      profilePic: discordProfilePic,
      timestamp: new Date().toISOString(),
    });

    await axios.post(process.env.WEBHOOK_URL, {
      content: `New viewer:\n**Discord ID**: ${discordId}\n**IP**: ${ip}\n**Profile Picture**: ${discordProfilePic}`,
    });

    res.send('Viewer logged successfully!');
  } catch (error) {
    console.error('Error fetching Discord data:', error);
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
