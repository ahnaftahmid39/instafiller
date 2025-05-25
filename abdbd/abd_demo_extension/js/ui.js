// js/ui.js
export const uiElements = {
  imageInput: document.getElementById("image-input"),
  imageThumbnails: document.getElementById("image-thumbnails"),
  processImagesBtn: document.getElementById("process-images-btn"),
  fillFormBtn: document.getElementById("fill-form-btn"),
  newSessionBtn: document.getElementById("new-session-btn"),
  responseContainer: document.getElementById("response-container"),
  extensionToggle: document.getElementById("extension-toggle"),
  extensionStatus: document.getElementById("extension-status"),
  statusDot: document.getElementById("status-dot"),
  ocrCount: document.getElementById("ocr-count"),
  ocrDataDisplay: document.getElementById("ocr-data-display"),
  totalSessionsInfo: document.getElementById("total-sessions-info"),
  progressContainer: document.getElementById("progress-container"),
  progressFill: document.getElementById("progress-fill"),
  progressText: document.getElementById("progress-text"),
  computerOption: document.getElementById("computer-option"),
  mobileOption: document.getElementById("mobile-option"),
  computerUpload: document.getElementById("computer-upload"),
  mobileUpload: document.getElementById("mobile-upload"),
  mobilePhotoBtn: document.getElementById("mobile-photo-btn"),
  qrContainer: document.getElementById("qr-container"),
  qrCode: document.getElementById("qr-code"),
  mobileStatus: document.getElementById("mobile-status"),
  mobileSessionInfo: document.getElementById("mobile-session-info"),
  mobilePhotos: document.getElementById("mobile-photos"),
  stopMobileBtn: document.getElementById("stop-mobile-btn"),
};

export function showProgress(show, text = "Processing...") {
  if (show) {
    uiElements.progressContainer.style.display = "block";
    uiElements.progressFill.style.width = "0%";
    uiElements.progressText.textContent = "0%";

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 90) progress = 90;

      uiElements.progressFill.style.width = progress + "%";
      uiElements.progressText.textContent = Math.round(progress) + "%";
    }, 200);

    uiElements.progressContainer.dataset.interval = interval;
  } else {
    if (uiElements.progressContainer.dataset.interval) {
      clearInterval(uiElements.progressContainer.dataset.interval);
    }

    uiElements.progressFill.style.width = "100%";
    uiElements.progressText.textContent = "100%";

    setTimeout(() => {
      uiElements.progressContainer.style.display = "none";
    }, 500);
  }
}

export function showMessage(message, color) {
  uiElements.responseContainer.textContent = message;
  uiElements.responseContainer.style.color = color;
  uiElements.responseContainer.style.borderLeftColor = color;
}

export function updateExtensionStatus(extensionEnabled) {
  if (extensionEnabled) {
    uiElements.extensionStatus.textContent = "Enabled";
    uiElements.extensionStatus.className = "status-text";
    uiElements.statusDot.className = "status-dot";
  } else {
    uiElements.extensionStatus.textContent = "Disabled";
    uiElements.extensionStatus.className = "status-text disabled";
    uiElements.statusDot.className = "status-dot disabled";
  }
}

export async function updateOcrDataDisplay(sessionId) {
  try {
    const result = await window.chrome.storage.session.get(["ocrDataStore"]);
    const ocrData = result.ocrDataStore || {};
    const sessionData = ocrData[sessionId] || [];

    uiElements.ocrCount.textContent = `${sessionData.length} items`;

    if (sessionData.length === 0) {
      uiElements.ocrDataDisplay.textContent = "No OCR data stored";
    } else {
      uiElements.ocrDataDisplay.innerHTML = "";
      sessionData.forEach((item, index) => {
        const div = document.createElement("div");
        div.className = "ocr-data-item";

        const header = document.createElement("div");
        header.className = "ocr-item-header";

        const title = document.createElement("div");
        title.className = "ocr-item-title";
        const isMobile = item.filename.startsWith("mobile_");
        title.textContent = `${isMobile ? "📱" : "💻"} Image ${index + 1}: ${
          item.filename
        }`;

        const removeBtn = document.createElement("button");
        removeBtn.className = "btn-danger";
        removeBtn.textContent = "Remove";
        removeBtn.onclick = () => {
          const event = new CustomEvent("removeOcrItem", {
            detail: item.imageId,
          });
          document.dispatchEvent(event);
        };

        header.appendChild(title);
        header.appendChild(removeBtn);

        const details = document.createElement("div");
        details.className = "ocr-item-details";
        details.innerHTML = `
                    <strong>Fields extracted:</strong> ${
                      Object.keys(item.mappedData).length
                    }<br>
                    <strong>Processed:</strong> ${new Date(
                      item.timestamp
                    ).toLocaleString()}
                `;

        div.appendChild(header);
        div.appendChild(details);
        uiElements.ocrDataDisplay.appendChild(div);
      });
    }
    await updateTotalSessionsInfo();
  } catch (error) {
    console.error("Error updating OCR data display:", error);
  }
}

export async function updateTotalSessionsInfo() {
  try {
    const result = await window.chrome.storage.session.get(["ocrDataStore"]);
    const ocrDataStore = result.ocrDataStore || {};
    const sessionCount = Object.keys(ocrDataStore).length;
    const totalItems = Object.values(ocrDataStore).reduce(
      (sum, sessionData) => sum + sessionData.length,
      0
    );

    uiElements.totalSessionsInfo.textContent = `Total: ${sessionCount} sessions, ${totalItems} OCR items stored`;
  } catch (error) {
    uiElements.totalSessionsInfo.textContent = "Unable to load session info";
  }
}

export function updateButtonStates(hasImages, extensionEnabled, hasOcrData) {
  uiElements.processImagesBtn.disabled = !hasImages || !extensionEnabled;
  uiElements.fillFormBtn.disabled = !hasOcrData || !extensionEnabled;
}

export function updateMobileUI(isSessionActive) {
  if (isSessionActive) {
    uiElements.mobilePhotoBtn.disabled = true;
    uiElements.stopMobileBtn.style.display = "inline-block";
  } else {
    uiElements.mobilePhotoBtn.disabled = false;
    uiElements.stopMobileBtn.style.display = "none";
    uiElements.qrContainer.style.display = "none";
    uiElements.mobilePhotos.innerHTML = "";
    // When stopping mobile UI, ensure the QR code image is cleared
    if (uiElements.qrCode) {
      uiElements.qrCode.innerHTML = "";
    }
  }
}

// --- NEW FUNCTION TO EXPORT ---
/**
 * Updates the display of image thumbnails.
 * @param {Array<Object>} images - An array of image objects, each with id, dataUrl, and name.
 * @param {Function} onRemove - Callback function when an image is removed.
 */
export function updateImageThumbnails(images, onRemove) {
  uiElements.imageThumbnails.innerHTML = ""; // Clear existing thumbnails

  if (images.length === 0) {
    return; // No images to display
  }

  images.forEach((image) => {
    const imageContainer = document.createElement("div");
    imageContainer.className = "image-container";

    const thumbnail = document.createElement("img");
    thumbnail.src = image.dataUrl;
    thumbnail.alt = image.name;
    thumbnail.className = "image-thumbnail";

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "X";
    removeBtn.onclick = () => onRemove(image.id); // Use the provided onRemove callback

    imageContainer.appendChild(thumbnail);
    imageContainer.appendChild(removeBtn);
    uiElements.imageThumbnails.appendChild(imageContainer);
  });
}
// --- END NEW FUNCTION ---

// Listen for progress updates from background script
window.chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateProgress") {
    const { current, total, percentage } = request;
    uiElements.progressFill.style.width = percentage + "%";
    uiElements.progressText.textContent = `${Math.round(
      percentage
    )}% (${current}/${total})`;
  }
});
