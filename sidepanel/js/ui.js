// js/ui.js
export const uiElements = {
  imageInput: document.getElementById("image-input"),
  imageThumbnails: document.getElementById("image-thumbnails"),
  // processImagesBtn: document.getElementById("process-images-btn"),
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
  // Removed qrContainer and qrCode
  mobileStatus: document.getElementById("mobile-status"),
  mobileSessionInfo: document.getElementById("mobile-session-info"),
  mobilePhotos: document.getElementById("mobile-photos"),
  stopMobileBtn: document.getElementById("stop-mobile-btn"),
  // NEW DIALOG ELEMENTS
  mobileIpDialog: document.getElementById("mobile-ip-dialog"),
  closeServerIpDialogBtn: document.getElementById("close-server-ip-dialog"),
  connectServerIpBtn: document.getElementById("connect-server-ip-btn"),
  serverIpInput: document.getElementById("server-ip-input"),
  savedServerIpsList: document.getElementById("saved-server-ips-list"),
  imageUploadSettings: document.querySelector("#mobile-setting-button"),
};

// Add this function at the beginning of the file
export function initializeUIElements() {
  // Check if all required elements exist
  const requiredElements = [
    "image-input",
    "image-thumbnails",
    // "process-images-btn",
    "fill-form-btn",
    "new-session-btn",
    "response-container",
    "extension-toggle",
    "extension-status",
    "status-dot",
    "ocr-count",
    "ocr-data-display",
    "total-sessions-info",
    "progress-container",
    "progress-fill",
    "progress-text",
    "computer-option",
    "mobile-option",
    "computer-upload",
    "mobile-upload",
    "mobile-photo-btn",
    // "qr-container", // Removed
    // "qr-code",      // Removed
    "mobile-status",
    "mobile-session-info",
    "mobile-photos",
    "stop-mobile-btn",
    // New dialog elements
    "mobile-ip-dialog",
    "close-server-ip-dialog",
    "connect-server-ip-btn",
    "server-ip-input",
    "saved-server-ips-list",
  ];

  const missingElements = requiredElements.filter(
    (id) => !document.getElementById(id)
  );

  if (missingElements.length > 0) {
    console.warn("Missing UI elements:", missingElements);
  }

  return missingElements.length === 0;
}

export function showProgress(show, text = "Processing...") {
  const progressContainer =
    uiElements.progressContainer ||
    document.getElementById("progress-container");
  const progressFill =
    uiElements.progressFill || document.getElementById("progress-fill");
  const progressText =
    uiElements.progressText || document.getElementById("progress-text");

  if (show) {
    // Show the global progress bar
    document.body.classList.add("progress-active");
    progressContainer.classList.add("show");
    progressFill.style.width = "0%";
    progressFill.className = "global-progress-fill processing";
    progressText.textContent = text;

    // Clear any existing interval
    if (progressContainer.dataset.interval) {
      clearInterval(progressContainer.dataset.interval);
    }

    // Smooth progress animation
    let progress = 0;
    const interval = setInterval(() => {
      // Slower, more realistic progress increments
      const increment = Math.random() * 8 + 2; // 2-10% increments
      progress += increment;

      if (progress > 95) {
        progress = 95; // Stop at 95% until completion
      }

      progressFill.style.width = progress + "%";

      // Update text based on progress
      if (progress < 30) {
        progressText.textContent = `${text} ${Math.round(progress)}%`;
      } else if (progress < 70) {
        progressText.textContent = `Processing... ${Math.round(progress)}%`;
      } else {
        progressText.textContent = `Almost done... ${Math.round(progress)}%`;
      }
    }, 300); // Slower updates for smoother feel

    progressContainer.dataset.interval = interval;
  } else {
    // Complete the progress
    if (progressContainer.dataset.interval) {
      clearInterval(progressContainer.dataset.interval);
      delete progressContainer.dataset.interval;
    }

    // Smooth completion animation
    progressFill.style.width = "100%";
    progressFill.className = "global-progress-fill completing";
    progressText.textContent = "Complete! ✨";

    // Hide after completion animation
    setTimeout(() => {
      progressContainer.classList.remove("show");
      document.body.classList.remove("progress-active");

      // Reset for next use
      setTimeout(() => {
        progressFill.style.width = "0%";
        progressFill.className = "global-progress-fill";
        progressText.textContent = "Processing...";
      }, 600);
    }, 1200);
  }
}

export function showMessage(message, type = "processing") {
  const statusContainer = document.getElementById("response-container");
  const statusElement = statusContainer.querySelector(".status");

  if (!statusContainer || !statusElement) {
    console.warn("Status elements not found");
    return;
  }

  // Clear any existing timeouts
  if (window.messageTimeout) {
    clearTimeout(window.messageTimeout);
  }

  // Force a reflow by accessing offsetHeight
  statusElement.className = "status";
  void statusElement.offsetHeight;

  // Add new classes and show message
  statusContainer.classList.add("visible");
  statusElement.className = `status ${type}`;

  // Add icons based on type
  let icon = "";
  switch (type) {
    case "success":
      icon = "✅ ";
      break;
    case "error":
      icon = "❌ ";
      break;
    case "processing":
      icon = "⏳ ";
      break;
    default:
      icon = "ℹ️ ";
  }

  statusElement.textContent = icon + message;

  // Auto-hide after delay (3s for success, 5s for others)
  const delay = type === "success" ? 3000 : 5000;
  if (type !== "error") {
    window.messageTimeout = setTimeout(() => {
      hideMessage();
    }, delay);
  }
}

function hideMessage() {
  const statusContainer = document.getElementById("response-container");
  if (statusContainer) {
    statusContainer.classList.remove("visible");
  }
}

export async function updateOcrDataDisplay(sessionId) {
  if (!uiElements.ocrCount || !uiElements.ocrDataDisplay) {
    console.warn("OCR display elements not found");
    return;
  }
  try {
    const result = await window.chrome.storage.session.get(["ocrDataStore"]);
    const ocrData = result.ocrDataStore || {};
    const sessionData = ocrData[sessionId] || [];

    uiElements.ocrCount.textContent = `${sessionData.length} items`;

    if (sessionData.length === 0) {
      uiElements.ocrDataDisplay.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📄</div>
          <div class="empty-state-text">No OCR data stored</div>
        </div>
      `;
    } else {
      uiElements.ocrDataDisplay.innerHTML = "";
      sessionData.forEach((item, index) => {
        const div = document.createElement("div");
        const deviceIcon = item.filename.startsWith("mobile_") ? "📱" : "💻";
        const titleText = `<strong> Image ${index + 1}: </strong> ${
          item.filename
        }`;
        div.className = "ocr-data-item";
        div.innerHTML = `
            <div class="main-icon">${deviceIcon}</div>
            <div class="content-wrapper">
              <div class="ocr-item-header">
                <div class="ocr-item-title">${titleText}</div>
              </div>
              <div class="ocr-item-details">
                <strong>Fields extracted:</strong> 
                ${Object.keys(item.mappedData).length}                
              </div>
              <div class="ocr-item-details">
                <strong>Processed:</strong> 
                ${new Date(item.timestamp).toLocaleString()}             
              </div>
            </div>
            <button class="btn-danger ocr-data-delete-button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c0 1 1 2 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg> 
            </button>
        `;

        const removeBtn = div.querySelector(".btn-danger");

        removeBtn.onclick = () => {
          const event = new CustomEvent("removeOcrItem", {
            detail: item.imageId,
          });
          document.dispatchEvent(event);
        };

        uiElements.ocrDataDisplay.appendChild(div);

        // const header = document.createElement("div");
        // header.className = "ocr-item-header";

        // const title = document.createElement("div");
        // title.className = "ocr-item-title";
        // // const isMobile = item.filename.startsWith("mobile_");
        // // title.textContent = `${isMobile ? "📱" : "💻"} Image ${index + 1}: ${
        // //   item.filename
        // // }`;

        // const removeBtn = document.createElement("button");
        // removeBtn.className = "btn-danger";
        // removeBtn.innerHTML = `
        //   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        //     <path d="M3 6h18"></path>
        //     <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
        //     <path d="M8 6V4c0-1 1-2 2-2h4c0 1 1 2 2 2v2"></path>
        //     <line x1="10" y1="11" x2="10" y2="17"></line>
        //     <line x1="14" y1="11" x2="14" y2="17"></line>
        //   </svg>
        //   Delete
        // `;
        // removeBtn.onclick = () => {
        //   const event = new CustomEvent("removeOcrItem", {
        //     detail: item.imageId,
        //   });
        //   document.dispatchEvent(event);
        // };

        // header.appendChild(title);
        // header.appendChild(removeBtn);

        // const details = document.createElement("div");
        // details.className = "ocr-item-details";
        // details.innerHTML = `
        //   <strong>Fields extracted:</strong> ${
        //     Object.keys(item.mappedData).length
        //   }<br>
        //   <strong>Processed:</strong> ${new Date(
        //     item.timestamp
        //   ).toLocaleString()}
        // `;

        // div.appendChild(header);
        // div.appendChild(details);
        // uiElements.ocrDataDisplay.appendChild(div);
      });
    }
    await updateTotalSessionsInfo();
  } catch (error) {
    console.error("Error updating OCR data display:", error);
  }
}

export async function updateTotalSessionsInfo() {
  if (!uiElements.totalSessionsInfo) {
    return; // Element no longer exists, skip update
  }
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
  if (!uiElements.fillFormBtn) {
    console.warn("Button elements not found");
    return;
  }
  // uiElements.processImagesBtn.disabled = !hasImages || !extensionEnabled;
  uiElements.fillFormBtn.disabled = !hasOcrData || !extensionEnabled;
  if (uiElements.detectFieldsBtn) {
    uiElements.detectFieldsBtn.disabled = !extensionEnabled;
  }
}

export function updateMobileUI(isConnected) {
  if (isConnected) {
    // uiElements.mobilePhotoBtn.style.display = "none";
    // uiElements.stopMobileBtn.style.display = 'inline-block'; // No longer needed
    // uiElements.mobileSessionInfo.style.display = 'block'; // No longer needed
    // uiElements.mobileStatus.style.display = "block"; // Show status
  } else {
    // uiElements.mobilePhotoBtn.style.display = "inline-block";
    // uiElements.stopMobileBtn.style.display = 'none'; // No longer needed
    // uiElements.mobileSessionInfo.style.display = 'none'; // No longer needed
    // uiElements.mobileStatus.style.display = "block"; // Still show status, but reset text
    // uiElements.mobileStatus.textContent = "Ready to fetch photos from mobile.";
    // uiElements.mobileStatus.style.color = "#6c757d";
    // uiElements.mobilePhotos.innerHTML = ""; // Clear displayed photo
  }
}

export function updateImageThumbnails(images = [], onRemove = null) {
  if (!uiElements.imageThumbnails) {
    console.error("Image thumbnails container not found");
    return;
  }

  // uiElements.imageThumbnails.innerHTML = ""; // Clear existing thumbnails

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
    thumbnail.title = `${image.name} ${
      image.fromMobile ? "(Mobile)" : "(Computer)"
    }`;

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.setAttribute("aria-label", "Remove image");
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      if (onRemove) {
        onRemove(image.id);
      }
    };

    if (image.fromMobile) {
      thumbnail.style.border = "2px solid #8b5cf6";
    }

    imageContainer.appendChild(thumbnail);
    imageContainer.appendChild(removeBtn);
    uiElements.imageThumbnails.appendChild(imageContainer);
  });
}

// Add this with other exported functions
export function updateExtensionStatus(extensionEnabled) {
  if (!uiElements.extensionStatus || !uiElements.statusDot) {
    console.warn("Extension status elements not found");
    return;
  }

  uiElements.extensionStatus.textContent = extensionEnabled
    ? "Enabled"
    : "Disabled";
  uiElements.extensionStatus.className = extensionEnabled
    ? "status-enabled"
    : "status-disabled";

  if (uiElements.statusDot) {
    uiElements.statusDot.className = extensionEnabled
      ? "status-dot enabled"
      : "status-dot disabled";
  }
}

// Listen for progress updates from background script
window.chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateProgress") {
    const { current, total, percentage } = request;
    const progressFill = document.getElementById("progress-fill");
    const progressText = document.getElementById("progress-text");

    if (progressFill && progressText) {
      // Smooth transition to the new percentage
      progressFill.style.width = percentage + "%";
      progressText.textContent = `Processing image ${current}/${total} (${Math.round(
        percentage
      )}%)`;

      // Add processing animation if not already present
      if (!progressFill.classList.contains("processing")) {
        progressFill.classList.add("processing");
      }
    }
  }
});
