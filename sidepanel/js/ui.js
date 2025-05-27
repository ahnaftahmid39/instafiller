// js/ui.js
export const uiElements = {
  imageInput: document.getElementById("image-input"),
  imageThumbnails: document.getElementById("image-thumbnails"),
  processImagesBtn: document.getElementById("process-images-btn"),
  fillFormBtn: document.getElementById("fill-form-btn"),
  clearFormBtn: document.getElementById("clear-form-btn"),
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
  // Form detection elements
  detectFieldsBtn: document.getElementById("detect-fields-btn"),
  formFieldsDisplay: document.getElementById("form-fields-display"),
  formFieldsCount: document.getElementById("form-fields-count"),

  // NEW DIALOG ELEMENTS
  mobileIpDialog: document.getElementById("mobile-ip-dialog"),
  closeServerIpDialogBtn: document.getElementById("close-server-ip-dialog"),
  connectServerIpBtn: document.getElementById("connect-server-ip-btn"),
  serverIpInput: document.getElementById("server-ip-input"),
  savedServerIpsList: document.getElementById("saved-server-ips-list"),
};

// Add this function at the beginning of the file
export function initializeUIElements() {
  // Check if all required elements exist
  const requiredElements = [
    "image-input",
    "image-thumbnails",
    "process-images-btn",
    "fill-form-btn",
    "clear-form-btn",
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
    "detect-fields-btn",
    "form-fields-display",
    "form-fields-count",
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

export function showMessage(message, color, type = "info") {
  // Show the status container
  uiElements.responseContainer.style.display = "block";
  uiElements.responseContainer.textContent = message;
  uiElements.responseContainer.style.color = color;
  uiElements.responseContainer.style.borderLeftColor = color;

  // Remove existing status classes
  uiElements.responseContainer.classList.remove(
    "success",
    "error",
    "warning",
    "info"
  );

  // Add appropriate status class based on color or type
  if (color === "#059669" || type === "success") {
    uiElements.responseContainer.classList.add("success");
  } else if (color === "#ef4444" || type === "error") {
    uiElements.responseContainer.classList.add("error");
  } else if (color === "#d97706" || type === "warning") {
    uiElements.responseContainer.classList.add("warning");
  } else if (color === "#2563eb" || type === "info") {
    uiElements.responseContainer.classList.add("info");
  }

  // Auto-hide after 5 seconds for non-error messages
  if (type !== "error" && color !== "#ef4444") {
    setTimeout(() => {
      uiElements.responseContainer.style.display = "none";
    }, 5000);
  }
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
        removeBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c0 1 1 2 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
          Delete
        `;
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

export function updateFormFieldsDisplay(fields) {
  if (!uiElements.formFieldsDisplay || !uiElements.formFieldsCount) {
    console.warn("Form fields display elements not found");
    return;
  }

  uiElements.formFieldsCount.textContent = `${fields.length} fields`;

  if (fields.length === 0) {
    uiElements.formFieldsDisplay.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <div class="empty-state-text">No form fields detected</div>
      </div>
    `;
  } else {
    uiElements.formFieldsDisplay.innerHTML = "";
    fields.forEach((field, index) => {
      const div = document.createElement("div");
      div.className = "form-field-item";

      const header = document.createElement("div");
      header.className = "form-field-header";

      const title = document.createElement("div");
      title.className = "form-field-title";
      const fieldIcon = getFieldIcon(field.type);
      title.textContent = `${fieldIcon} ${
        field.label || field.name || field.id || `Field ${index + 1}`
      }`;

      const typeLabel = document.createElement("span");
      typeLabel.className = "field-type-label";
      typeLabel.textContent = field.type;

      header.appendChild(title);
      header.appendChild(typeLabel);

      const details = document.createElement("div");
      details.className = "form-field-details";
      details.innerHTML = `
        <strong>Type:</strong> ${field.type}<br>
        ${
          field.placeholder
            ? `<strong>Placeholder:</strong> ${field.placeholder}<br>`
            : ""
        }
        ${field.required ? `<strong>Required:</strong> Yes<br>` : ""}
        ${
          field.options.length > 0
            ? `<strong>Options:</strong> ${field.options.length} choices<br>`
            : ""
        }
        <strong>Selector:</strong> <code>${field.selector}</code>
      `;

      div.appendChild(header);
      div.appendChild(details);
      uiElements.formFieldsDisplay.appendChild(div);
    });
  }
}

function getFieldIcon(fieldType) {
  const icons = {
    text: "📝",
    email: "📧",
    password: "🔒",
    tel: "📞",
    number: "🔢",
    date: "📅",
    time: "⏰",
    url: "🔗",
    search: "🔍",
    textarea: "📄",
    select: "📋",
    checkbox: "☑️",
    radio: "🔘",
    file: "📁",
    range: "🎚️",
    color: "🎨",
  };
  return icons[fieldType] || "📝";
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
  if (uiElements.detectFieldsBtn) {
    uiElements.detectFieldsBtn.disabled = !extensionEnabled;
  }
  if (uiElements.clearFormBtn) {
    uiElements.clearFormBtn.disabled = !extensionEnabled;
  }
}

export function updateMobileUI(isConnected) {
  if (isConnected) {
    uiElements.mobilePhotoBtn.style.display = "none";
    // uiElements.stopMobileBtn.style.display = 'inline-block'; // No longer needed
    // uiElements.mobileSessionInfo.style.display = 'block'; // No longer needed
    uiElements.mobileStatus.style.display = "block"; // Show status
  } else {
    uiElements.mobilePhotoBtn.style.display = "inline-block";
    // uiElements.stopMobileBtn.style.display = 'none'; // No longer needed
    // uiElements.mobileSessionInfo.style.display = 'none'; // No longer needed
    uiElements.mobileStatus.style.display = "block"; // Still show status, but reset text
    uiElements.mobileStatus.textContent = "Ready to fetch photos from mobile.";
    uiElements.mobileStatus.style.color = "#6c757d";
    uiElements.mobilePhotos.innerHTML = ""; // Clear displayed photo
  }
}

export function updateImageThumbnails(images = [], onRemove = null) {
  if (!uiElements.imageThumbnails) {
    console.error("Image thumbnails container not found");
    return;
  }

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
