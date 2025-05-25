// js/mobileCapture.js
import { uiElements, showMessage, updateMobileUI } from "./ui.js";
import { SERVER_URL } from "./constants.js";
import { addImage } from "./imageHandler.js";
import { processNewMobilePhoto } from "./ocrProcessor.js";
import { getExtensionEnabled } from "./session.js";

let mobileSessionId = null;
let mobilePollingInterval = null;
// const QRCode = window.QRCode; // <--- REMOVE OR COMMENT OUT THIS LINE

export async function startMobileCaptureSession() {
  if (!getExtensionEnabled()) {
    showMessage("Extension is disabled", "#ef4444");
    return;
  }

  try {
    uiElements.mobilePhotoBtn.disabled = true;
    showMessage("Creating mobile session...", "#2563eb");

    const response = await fetch(`${SERVER_URL}/api/create-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();
    mobileSessionId = data.sessionId;

    // <--- START CHANGES HERE IN startMobileCaptureSession
    if (data.qrCodeData) {
      // Create an <img> element if it doesn't exist, or clear the div
      let qrImgElement = uiElements.qrCode.querySelector("img");
      if (!qrImgElement) {
        qrImgElement = document.createElement("img");
        qrImgElement.alt = "QR Code";
        // You can adjust dimensions as needed, or let CSS handle it
        qrImgElement.style.width = "200px";
        qrImgElement.style.height = "200px";
        uiElements.qrCode.appendChild(qrImgElement);
      }
      // Set the received Base64 image data as the src
      qrImgElement.src = data.qrCodeData;

      uiElements.qrContainer.style.display = "block";
      uiElements.mobileStatus.textContent =
        "Scan QR code with your phone to start capturing";
      uiElements.mobileSessionInfo.textContent = `Session: ${mobileSessionId.substring(
        0,
        8
      )}...`;

      startMobilePolling();
      updateMobileUI(true); // Indicate active session
      showMessage(
        "Mobile session created! Scan QR code with your phone",
        "#059669"
      );
    } else {
      // Handle case where server didn't return qrCodeData for some reason
      console.error("Server did not return QR code data.");
      showMessage(
        "Failed to create mobile session: No QR data from server.",
        "#ef4444"
      );
      uiElements.mobilePhotoBtn.disabled = false;
    }
    // <--- END CHANGES HERE IN startMobileCaptureSession
  } catch (error) {
    console.error("Error creating mobile session:", error);
    showMessage(
      "Failed to create mobile session. Is the server running and accessible?",
      "#ef4444"
    );
    uiElements.mobilePhotoBtn.disabled = false;
  }
}

export function stopMobileSession() {
  if (mobilePollingInterval) {
    clearInterval(mobilePollingInterval);
    mobilePollingInterval = null;
  }

  mobileSessionId = null;
  updateMobileUI(false); // Indicate inactive session
  showMessage("Mobile session stopped", "#d97706");
  // Clear the QR code image when stopping the session
  if (uiElements.qrCode) {
    uiElements.qrCode.innerHTML = ""; // Clears the injected <img> tag
  }
}

function startMobilePolling() {
  if (mobilePollingInterval) {
    clearInterval(mobilePollingInterval);
  }

  mobilePollingInterval = setInterval(async () => {
    if (!mobileSessionId) return;

    try {
      const response = await fetch(
        `${SERVER_URL}/api/poll-photos/${mobileSessionId}`
      );
      const data = await response.json();

      if (data.success && data.photos.length > 0) {
        for (const photo of data.photos) {
          const imageData = {
            id: photo.id,
            name: `mobile_${new Date(photo.timestamp).toISOString()}.jpg`,
            base64: photo.data,
            mimeType: photo.mimeType,
            dataUrl: `data:${photo.mimeType};base64,${photo.data}`,
            fromMobile: true,
          };

          addImage(imageData); // Add to selected images display

          const photoItem = document.createElement("div");
          photoItem.className = "mobile-photo-item";
          photoItem.innerHTML = `
                        <span>📷 ${imageData.name}</span>
                        <span>${new Date(
                          photo.timestamp
                        ).toLocaleTimeString()}</span>
                    `;
          uiElements.mobilePhotos.appendChild(photoItem);

          if (data.photos.length === 1) {
            // Auto-process if a single photo is received
            await processNewMobilePhoto(imageData);
          }
        }

        uiElements.mobileStatus.textContent = `Received ${data.photos.length} new photo(s)`;
        showMessage(
          `Received ${data.photos.length} photo(s) from mobile`,
          "#059669"
        );
      }

      if (data.sessionStatus === "completed") {
        uiElements.mobileStatus.textContent = "Mobile session completed";
        stopMobileSession();
      }
    } catch (error) {
      console.error("Error polling mobile photos:", error);
      // Optionally, show a message if polling consistently fails
    }
  }, 2000); // Poll every 2 seconds
}

// Event listeners for mobile capture UI
uiElements.mobilePhotoBtn.addEventListener("click", startMobileCaptureSession);
uiElements.stopMobileBtn.addEventListener("click", stopMobileSession);

// Listen for a custom event to stop mobile session, triggered by new session
document.addEventListener("stopMobileSession", stopMobileSession);
