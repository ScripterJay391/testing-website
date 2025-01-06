const express = require('express');
const axios = require('axios');
const passport = require('passport');
const { Strategy: DiscordStrategy } = require('passport-discord');
const requestIp = require('request-ip');
require('dotenv').config();

const app = express();
let viewers = [];

// Middleware to capture IP addresses
app.use(requestIp.mw());

// Initialize passport
app.use(passport.initialize());

// Set up Discord OAuth2 strategy
passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/callback",
  scope: ['identify']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Log the viewer with Discord ID and IP
    const ip = 'IP_ADDRESS'; // Capture IP address here as well
    const discordId = profile.id;

    // Fetch Discord profile information if necessary
    const discordProfilePic = profile.avatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${profile.avatar}.png`
      : 'https://cdn.discordapp.com/embed/avatars/0.png';

    // Store viewer info
    viewers.push({
      discordId,
      ip,
      profilePic: discordProfilePic,
      timestamp: new Date().toISOString(),
    });

    // Send info to webhook
    await axios.post(process.env.WEBHOOK_URL, {
      content: `New viewer:\n**Discord ID**: ${discordId}\n**IP**: ${ip}\n**Profile Picture**: ${discordProfilePic}`,
    });

    console.log(`Logged viewer: ${discordId}, IP: ${ip}`);
    done(null, profile);
  } catch (error) {
    console.error('Error logging viewer:', error);
    done(error);
  }
}));

// Route to start OAuth process
app.get('/auth', (req, res) => {
  passport.authenticate('discord')(req, res);
});

// Callback route that Discord will redirect to
app.get('/auth/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
  res.redirect('/');  // Redirect to the homepage after successful login
});

// Serve static files (like index.html) from the "public" folder
app.use(express.static('public'));

// Route to fetch all viewers
app.get('/viewers', (req, res) => {
  res.json(viewers);
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
