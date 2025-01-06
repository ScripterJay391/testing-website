require('dotenv').config(); // Make sure to load environment variables from .env file
const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000; // Use Render's dynamic port or 3000 for local testing

console.log(`Server will run on port: ${port}`);

let viewers = [];

// Serve static files (HTML, CSS, JS) from the "public" folder
app.use(express.static('public'));

// When someone enters, log the details
app.get('/enter', (req, res) => {
    const viewer = {
        discordId: req.query.discordId || 'Unknown',  // Use dynamic Discord ID or 'Unknown' if not provided
        ip: req.ip,  // Capture IP address (be mindful of privacy laws)
        timestamp: new Date().toISOString(),
    };

    viewers.push(viewer);

    // Send data to the Discord webhook
    axios.post(process.env.WEBHOOK_URL, {
        content: `A new user has entered the site! \nDiscord ID: ${viewer.discordId}\nIP: ${viewer.ip}\nTimestamp: ${viewer.timestamp}`
    })
    .then(() => {
        console.log('Webhook sent successfully');
    })
    .catch((err) => {
        console.log('Error sending webhook:', err);
    });

    res.json(viewers);
});

// Endpoint to get the current viewers
app.get('/viewers', (req, res) => {
    res.json({
        count: viewers.length,
        viewers: viewers,
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
