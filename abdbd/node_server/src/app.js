// src/app.js (Your 'app.js' file)

const express = require("express");
const cors = require("cors");
const apiRoutes = require("./routes/api"); // Ensure correct path
const mobileRoutes = require("./routes/mobile"); // Ensure correct path
const { startCleanupJob } = require("./utils/cleanup"); // Ensure correct path
// const https = require("https"); // <--- REMOVE THESE IMPORTS
// const fs = require("fs");     // <--- REMOVE THESE IMPORTS

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static("public"));

// Routes
app.use("/api", apiRoutes);
app.use("/mobile", mobileRoutes);

// Start cleanup job (this can stay here, it's a global setup)
startCleanupJob();

// --- REMOVE THIS ENTIRE SSL/HTTPS SERVER BLOCK from app.js ---
/*
const privateKey = fs.readFileSync("localhost+1-key.pem", "utf8");
const certificate = fs.readFileSync("localhost+1.pem", "utf8");

const credentials = { key: privateKey, cert: certificate };

const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const httpsServer = https.createServer(credentials, app);

httpsServer.listen(HTTPS_PORT, () => {
    console.log(`📱 Mobile Photo Capture Server running on HTTPS port ${HTTPS_PORT}`);
    console.log(`🌐 Server URL (for extension): https://localhost:${HTTPS_PORT}`);
    console.log(`🌐 Mobile URL (for phone): https://192.168.0.155:${HTTPS_PORT}`);
});
*/
// --- END REMOVED BLOCK ---

// This line remains crucial: export the configured Express app
module.exports = app;
