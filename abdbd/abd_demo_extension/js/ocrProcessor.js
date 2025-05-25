// js/ocrProcessor.js
import { getSessionId, getExtensionEnabled, hasOcrData } from "./session.js";
import { getSelectedImages, clearSelectedImages } from "./imageHandler.js";
import {
  uiElements,
  showProgress,
  showMessage,
  updateOcrDataDisplay,
  updateButtonStates,
} from "./ui.js";

export async function processImages() {
  if (!getExtensionEnabled()) {
    showMessage("Extension is disabled", "#ef4444");
    return;
  }

  const imagesToProcess = getSelectedImages();
  if (imagesToProcess.length === 0) {
    showMessage("Please select images first.", "#d97706");
    return;
  }

  showProgress(true);
  uiElements.processImagesBtn.disabled = true;
  showMessage("Processing images...", "#2563eb");

  try {
    console.log(
      "Sending message to background script with",
      imagesToProcess.length,
      "images"
    );

    const response = await new Promise((resolve, reject) => {
      window.chrome.runtime.sendMessage(
        {
          action: "processMultipleImages",
          images: imagesToProcess,
          sessionId: getSessionId(),
        },
        (response) => {
          if (window.chrome.runtime.lastError) {
            reject(new Error(window.chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        }
      );
    });

    console.log("Received response:", response);

    if (response && response.status === "success") {
      showMessage(
        `Successfully processed ${imagesToProcess.length} images!`,
        "#059669"
      );
      clearSelectedImages(); // Clear selected images after processing
      await updateOcrDataDisplay(getSessionId());
      updateButtonStates(
        false,
        getExtensionEnabled(),
        await hasOcrData(getSessionId())
      );
    } else {
      showMessage(`Error: ${response?.message || "Unknown error"}`, "#ef4444");
    }
  } catch (error) {
    console.error("Error processing images:", error);
    showMessage(`Error: ${error.message}`, "#ef4444");
  } finally {
    showProgress(false);
    uiElements.processImagesBtn.disabled = false;
  }
}

export async function processNewMobilePhoto(imageData) {
  try {
    showProgress(true, "Processing mobile photo...");
    showMessage("Processing photo from mobile...", "#2563eb");

    const response = await new Promise((resolve, reject) => {
      window.chrome.runtime.sendMessage(
        {
          action: "processMultipleImages",
          images: [imageData],
          sessionId: getSessionId(),
        },
        (response) => {
          if (window.chrome.runtime.lastError) {
            reject(new Error(window.chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        }
      );
    });

    if (response && response.status === "success") {
      // No need to filter selectedImages here as it's handled by imageHandler.js
      await updateOcrDataDisplay(getSessionId());
      updateButtonStates(
        false,
        getExtensionEnabled(),
        await hasOcrData(getSessionId())
      );
      showMessage("Mobile photo processed successfully!", "#059669");
    } else {
      showMessage(
        `Error processing mobile photo: ${
          response?.message || "Unknown error"
        }`,
        "#ef4444"
      );
    }
  } catch (error) {
    console.error("Error processing mobile photo:", error);
    showMessage(`Error processing mobile photo: ${error.message}`, "#ef4444");
  } finally {
    showProgress(false);
  }
}
