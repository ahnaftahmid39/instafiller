const express = require("express");
const multer = require("multer"); // Still need multer for file uploads if you decide to use it in other routes
const { PHOTO_FILE_LIMIT_MB } = require("../config");
const {
  createSession,
  getSessionStatus,
} = require("../controllers/sessionController");
const { uploadPhoto, pollPhotos } = require("../controllers/photoController");

const router = express.Router();

// Configure multer for file uploads (if needed for future routes, currently using base64)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: PHOTO_FILE_LIMIT_MB * 1024 * 1024 },
});

router.post("/create-session", createSession);
router.post("/upload-photo", upload.single("photo"), uploadPhoto); // Use upload.single() if sending as multipart/form-data
router.get("/poll-photos/:sessionId", pollPhotos);
router.get("/session-status/:sessionId", getSessionStatus);

module.exports = router;
