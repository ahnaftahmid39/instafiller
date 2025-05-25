const { v4: uuidv4 } = require("uuid");
const qrcode = require("qrcode"); // Import the qrcode library
const { sessions } = require("../services/sessionService");

const createSession = async (req, res) => {
  // Made the function async
  const sessionId = uuidv4();
  // Use the actual server URL that the mobile device will reach
  // For local development, this might be your public IP or a tunneling service like ngrok
  const serverHost = req.get("host"); // Gets 'localhost:3000' or your actual domain
  const protocol = req.protocol; // Gets 'http' or 'https'
  const mobileUrl = `${protocol}://${serverHost}/mobile/${sessionId}`;

  sessions.set(sessionId, {
    id: sessionId,
    photos: [],
    status: "waiting",
    createdAt: new Date(),
    extensionConnected: false,
  });

  console.log(`Created session: ${sessionId}`);

  try {
    // Generate the QR code as a data URL (PNG format)
    const qrCodeImage = await qrcode.toDataURL(mobileUrl);

    res.json({
      sessionId,
      qrCodeData: qrCodeImage, // Send the Base64 encoded image data
      mobileUrl, // Still send the URL for debugging/display
    });
  } catch (err) {
    console.error("Error generating QR code:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to generate QR code" });
  }
};

const getSessionStatus = (req, res) => {
  const { sessionId } = req.params;

  if (!sessions.has(sessionId)) {
    return res.status(404).json({ success: false, error: "Session not found" });
  }

  const session = sessions.get(sessionId);
  res.json({
    success: true,
    session: {
      id: session.id,
      status: session.status,
      photoCount: session.photos.length,
      createdAt: session.createdAt,
    },
  });
};

module.exports = {
  createSession,
  getSessionStatus,
};
