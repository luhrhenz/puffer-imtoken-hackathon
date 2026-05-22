// Vercel serverless function handler
const path = require('path');

// Import the built Express app
const { app } = require('../dist/index.js');

// Export the Express app as a serverless function
module.exports = app;
