const { sessions, photos } = require("../services/sessionService");
const { SESSION_EXPIRATION_HOURS } = require("../config");

const startCleanupJob = () => {
  setInterval(() => {
    const expirationTime = new Date(
      Date.now() - SESSION_EXPIRATION_HOURS * 60 * 60 * 1000
    );

    for (const [sessionId, session] of sessions.entries()) {
      if (session.createdAt < expirationTime) {
        // Clean up photos associated with the session
        session.photos.forEach((photoId) => {
          photos.delete(photoId);
        });
        sessions.delete(sessionId);
        console.log(`Cleaned up expired session: ${sessionId}`);
      }
    }
  }, SESSION_EXPIRATION_HOURS * 60 * 60 * 1000); // Run cleanup every hour
};

module.exports = {
  startCleanupJob,
};
