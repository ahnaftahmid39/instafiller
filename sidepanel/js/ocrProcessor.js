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
    showMessage("Extension is disabled", "error");
    return;
  }

  const imagesToProcess = getSelectedImages();
  if (imagesToProcess.length === 0) {
    showMessage("Please select images first.", "#000");
    return;
  }

  showProgress(true);
  // uiElements.processImagesBtn.disabled = true;
  showMessage("Processing images...", "processing");

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
        "#000"
      );
      clearSelectedImages(); // Clear selected images after processing
      await updateOcrDataDisplay(getSessionId());
      // After clearing images, there should be no images selected
      updateButtonStates(
        false, // No images after clearing
        getExtensionEnabled(),
        await hasOcrData(getSessionId())
      );
      showMessage("Images processed successfully!", "success");
    } else {
      showMessage(`Error: ${response?.message || "Unknown error"}`, "error");
      // Keep current images state on error
      const hasImages = getSelectedImages().length > 0;
      updateButtonStates(
        hasImages,
        getExtensionEnabled(),
        await hasOcrData(getSessionId())
      );
    }
  } catch (error) {
    console.error("Error processing images:", error);
    showMessage(`Error: ${error.message}`, "error");
    // Keep current images state on error
    const hasImages = getSelectedImages().length > 0;
    updateButtonStates(
      hasImages,
      getExtensionEnabled(),
      await hasOcrData(getSessionId())
    );
  } finally {
    showProgress(false);
    // uiElements.processImagesBtn.disabled = false;
  }
}

export async function processNewMobilePhoto(imageData) {
  try {
    showProgress(true, "Processing mobile photo...");
    showMessage("Processing photo from mobile...", "#000");

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
      await updateOcrDataDisplay(getSessionId());
      // Check current images state after processing mobile photo
      const hasImages = getSelectedImages().length > 0;
      updateButtonStates(
        hasImages,
        getExtensionEnabled(),
        await hasOcrData(getSessionId())
      );
      showMessage("Mobile photo processed successfully!", "#000");
    } else {
      showMessage(
        `Error processing mobile photo: ${
          response?.message || "Unknown error"
        }`,
        "#000"
      );
    }
  } catch (error) {
    console.error("Error processing mobile photo:", error);
    showMessage(`Error processing mobile photo: ${error.message}`, "#000");
  } finally {
    showProgress(false);
  }
}
