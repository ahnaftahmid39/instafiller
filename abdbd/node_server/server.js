// server.js (Your main entry point file)

const app = require("./src/app"); // Import the Express app from app.js
const https = require("https"); // Import https module for HTTPS server
const fs = require("fs"); // Import fs module to read certificates

// --- Load SSL certificates ---
// Ensure these files (localhost+1-key.pem, localhost+1.pem) are in the same directory
// as where your server.js runs (i.e., the 'node_server' directory).
const privateKey = fs.readFileSync("localhost+1-key.pem", "utf8");
const certificate = fs.readFileSync("localhost+1.pem", "utf8");

const credentials = { key: privateKey, cert: certificate };
// --- END: Load SSL certificates ---

// Choose your server port
const PORT = process.env.PORT || 3443; // Or any other port you prefer for HTTPS

// Create the HTTPS server using the imported 'app' and credentials
const httpsServer = https.createServer(credentials, app);

// Start listening
httpsServer.listen(PORT, () => {
  console.log(`📱 Mobile Photo Capture Server running on HTTPS port ${PORT}`);
  console.log(`🌐 Server URL (for extension): https://localhost:${PORT}`);
  console.log(`🌐 Mobile URL (for phone): https://192.168.0.155:${PORT}`); // Use your actual PC's IP
});

// If you want to keep an *additional* HTTP server, it must be on a DIFFERENT port.
// Example:
/*
const http = require('http');
const HTTP_PORT = process.env.HTTP_PORT || 3001; // A different port!
const httpServer = http.createServer(app);
httpServer.listen(HTTP_PORT, () => {
    console.log(`HTTP Server also running on port ${HTTP_PORT}`);
});
*/
