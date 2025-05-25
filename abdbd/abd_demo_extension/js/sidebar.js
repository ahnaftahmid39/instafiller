// js/sidebar.js
import {
  initializeSession,
  newSession,
  toggleExtension,
  removeOcrDataItem,
  getSessionId,
  getExtensionEnabled,
  hasOcrData,
} from "./session.js";
import { processImages } from "./ocrProcessor.js";
import { fillForm } from "./formFiller.js";
import { detectFormFields, fillDetectedFields } from "./formDetector.js";
import { uiElements, updateButtonStates } from "./ui.js";
import { clearSelectedImages, getSelectedImages } from "./imageHandler.js";
import { stopMobileSession, showMessage } from "./mobileCapture.js";

document.addEventListener("DOMContentLoaded", () => {
  // Initialize the application session
  initializeSession();

  // Set up file upload area click handler
  const fileUploadArea = document.getElementById("file-upload-area");
  const imageInput = document.getElementById("image-input");

  if (fileUploadArea && imageInput) {
    fileUploadArea.addEventListener("click", (e) => {
      if (e.target === imageInput) return; // Don't trigger if clicking the input itself
      e.preventDefault();
      imageInput.click();
    });
  }

  // Event Listeners for UI Elements
  uiElements.extensionToggle.addEventListener("change", (event) => {
    toggleExtension(event.target.checked);
  });

  uiElements.processImagesBtn.addEventListener("click", processImages);

  uiElements.fillFormBtn.addEventListener("click", fillForm);

  uiElements.newSessionBtn.addEventListener("click", newSession);

  // Form detection event listeners
  uiElements.detectFieldsBtn?.addEventListener("click", detectFormFields);

  uiElements.fillDetectedFieldsBtn?.addEventListener("click", async () => {
    // Get OCR data from current session
    const result = await window.chrome.storage.session.get(["ocrDataStore"]);
    const ocrDataStore = result.ocrDataStore || {};
    const sessionData = ocrDataStore[getSessionId()] || [];

    if (sessionData.length === 0) {
      showMessage(
        "No OCR data available. Please process images first.",
        "#d97706"
      );
      return;
    }

    // Combine all OCR data from the session
    const combinedOcrData = {};
    sessionData.forEach((item) => {
      Object.assign(combinedOcrData, item.mappedData);
    });

    await fillDetectedFields(combinedOcrData);
  });

  // Event listener for removing individual OCR data items (delegated from ui.js)
  document.addEventListener("removeOcrItem", (event) => {
    removeOcrDataItem(event.detail);
  });

  // Event listener for clearing selected images (triggered by session.js)
  document.addEventListener("clearSelectedImages", async () => {
    await clearSelectedImages();
  });

  // Upload option switching
  uiElements.computerOption.addEventListener("click", () => {
    uiElements.computerOption.classList.add("active");
    uiElements.mobileOption.classList.remove("active");
    uiElements.computerUpload.style.display = "block";
    uiElements.mobileUpload.style.display = "none";
    stopMobileSession(); // Stop mobile session if switching to computer upload
  });

  uiElements.mobileOption.addEventListener("click", () => {
    uiElements.mobileOption.classList.add("active");
    uiElements.computerOption.classList.remove("active");
    uiElements.computerUpload.style.display = "none";
    uiElements.mobileUpload.style.display = "block";
  });

  // Update button states initially and when images are selected/deselected
  // This will be called by imageHandler.js and session.js
  // For initial load, we need to manually update after session init
  setTimeout(async () => {
    updateButtonStates(
      getSelectedImages().length > 0,
      getExtensionEnabled(),
      await hasOcrData(getSessionId())
    );
  }, 100);

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    stopMobileSession();
  });
});
