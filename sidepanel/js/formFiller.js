// js/formFiller.js
import { getSelectedImages } from "./imageHandler.js";
import { getExtensionEnabled, getSessionId, hasOcrData } from "./session.js";
import {
  showMessage,
  showProgress,
  uiElements,
  updateButtonStates,
} from "./ui.js";

export async function fillForm() {
  if (!getExtensionEnabled()) {
    showMessage("Extension is disabled", "error");
    return;
  }

  showProgress(true, "Filling form...");
  uiElements.fillFormBtn.disabled = true;
  showMessage("Filling form...", "processing"); // Changed type

  try {
    const [tab] = await window.chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) {
      throw new Error("Could not get active tab ID.");
    }

    const response = await new Promise((resolve, reject) => {
      window.chrome.runtime.sendMessage(
        {
          action: "fillFormWithStoredData",
          sessionId: getSessionId(),
          tabId: tab.id,
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
      showMessage("Form filled successfully with stored OCR data!", "success");
    } else {
      showMessage(`Error: ${response?.message || "Unknown error"}`, "error");
    }
  } catch (error) {
    console.error("Error filling form:", error);
    showMessage(`Error: ${error.message}`, "error");
  } finally {
    showProgress(false);
    // Preserve current images state when updating button states
    const hasImages = getSelectedImages().length > 0;
    updateButtonStates(
      hasImages,
      getExtensionEnabled(),
      await hasOcrData(getSessionId())
    );
  }
}

// Update fill button state periodically
setInterval(async () => {
  const hasImages = getSelectedImages().length > 0;
  updateButtonStates(
    hasImages,
    getExtensionEnabled(),
    await hasOcrData(getSessionId())
  );
}, 3000);
