const { v4: uuidv4 } = require("uuid");
const { sessions, photos } = require("../services/sessionService");

const uploadPhoto = (req, res) => {
  const { sessionId, photoData, isNextPage } = req.body;

  if (!sessions.has(sessionId)) {
    return res.status(404).json({ success: false, error: "Session not found" });
  }

  const session = sessions.get(sessionId);

  // Convert base64 to buffer
  const base64Data = photoData.replace(/^data:image\/jpeg;base64,/, "");
  // const photoBuffer = Buffer.from(base64Data, "base64"); // Not used directly here, but good to keep if you need to save to disk

  const photoId = uuidv4();
  const photo = {
    id: photoId,
    sessionId,
    data: base64Data, // Storing base64 directly for simplicity; in production consider storing file paths
    mimeType: "image/jpeg",
    timestamp: new Date(),
    processed: false,
  };

  // Store photo
  photos.set(photoId, photo);
  session.photos.push(photoId);
  session.status = isNextPage ? "continuing" : "completed";

  console.log(
    `Photo uploaded for session ${sessionId}, total photos: ${session.photos.length}`
  );

  res.json({
    success: true,
    photoId,
    totalPhotos: session.photos.length,
    isNextPage,
  });
};

const pollPhotos = (req, res) => {
  const { sessionId } = req.params;

  if (!sessions.has(sessionId)) {
    return res.status(404).json({ success: false, error: "Session not found" });
  }

  const session = sessions.get(sessionId);
  const unprocessedPhotos = [];

  session.photos.forEach((photoId) => {
    const photo = photos.get(photoId);
    if (photo && !photo.processed) {
      unprocessedPhotos.push({
        id: photo.id,
        data: photo.data,
        mimeType: photo.mimeType,
        timestamp: photo.timestamp,
      });
      // Mark as processed
      photo.processed = true;
    }
  });

  res.json({
    success: true,
    photos: unprocessedPhotos,
    sessionStatus: session.status,
    totalPhotos: session.photos.length,
  });
};

module.exports = {
  uploadPhoto,
  pollPhotos,
};
