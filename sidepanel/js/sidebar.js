// js/sidebar.js
import { fillForm } from "./formFiller.js";
import { clearSelectedImages, getSelectedImages } from "./imageHandler.js";
import { processImages } from "./ocrProcessor.js";
import {
  getExtensionEnabled,
  getSessionId,
  hasOcrData,
  initializeSession,
  removeOcrDataItem,
  toggleExtension,
} from "./session.js";
import { uiElements, updateButtonStates, updateMobileUI } from "./ui.js";
// Only import what's needed from mobileCapture now
import {
  initMobileCapture,
  stopMobileSession
} from "./mobileCapture.js";

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize the application session
  initializeSession();

  // Initialize mobile capture module (sets up its event listeners)
  initMobileCapture();

  // Set up file upload area click handler
  const fileUploadArea = document.getElementById("file-upload-area");
  const imageInput = document.getElementById("image-input");

  if (fileUploadArea && imageInput) {
    fileUploadArea.addEventListener("click", (e) => {
      if (e.target === imageInput) return;
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

  // Event listener for removing individual OCR data items (delegated from ui.js)
  document.addEventListener("removeOcrItem", (event) => {
    removeOcrDataItem(event.detail);
  });

  // Event listener for clearing selected images (triggered by session.js)
  document.addEventListener("clearSelectedImages", async () => {
    await clearSelectedImages();
  });

  // Navigation functionality
  document
    .getElementById("go-to-settings-btn")
    .addEventListener("click", () => {
      // Navigate to home.html
      window.location.href = "home.html";
    });

  // Upload option switching
  uiElements.computerOption.addEventListener("click", () => {
    uiElements.computerOption.classList.add("active");
    uiElements.mobileOption.classList.remove("active");
    uiElements.computerUpload.style.display = "block";
    uiElements.mobileUpload.style.display = "none";
    // No explicit stopMobileSession needed here anymore as there's no ongoing session
    updateMobileUI(false); // Ensure mobile UI elements are reset
  });

  uiElements.mobileOption.addEventListener("click", () => {
    uiElements.mobileOption.classList.add("active");
    uiElements.computerOption.classList.remove("active");
    uiElements.computerUpload.style.display = "none";
    uiElements.mobileUpload.style.display = "block";
    updateMobileUI(false); // Initialize mobile UI to its default state
  });

  // Update button states initially and when images are selected/deselected
  setTimeout(async () => {
    updateButtonStates(
      getSelectedImages().length > 0,
      getExtensionEnabled(),
      await hasOcrData(getSessionId())
    );
  }, 100);

  // Initialize the mobile UI state on DOMContentLoaded
  updateMobileUI(false);

  // Cleanup on page unload (stopMobileSession can be an empty stub or removed)
  window.addEventListener("beforeunload", () => {
    stopMobileSession(); // This will just reset UI state now
  });
});
