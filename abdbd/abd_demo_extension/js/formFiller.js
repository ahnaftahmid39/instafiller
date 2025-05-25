// js/formFiller.js
import { getSessionId, getExtensionEnabled, hasOcrData } from "./session.js";
import {
  uiElements,
  showProgress,
  showMessage,
  updateButtonStates,
} from "./ui.js";

export async function fillForm() {
  if (!getExtensionEnabled()) {
    showMessage("Extension is disabled", "#ef4444");
    return;
  }

  showProgress(true, "Filling form...");
  uiElements.fillFormBtn.disabled = true;
  showMessage("Filling form...", "#2563eb");

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
      showMessage("Form filled successfully with stored OCR data!", "#059669");
    } else {
      showMessage(`Error: ${response?.message || "Unknown error"}`, "#ef4444");
    }
  } catch (error) {
    console.error("Error filling form:", error);
    showMessage(`Error: ${error.message}`, "#ef4444");
  } finally {
    showProgress(false);
    updateButtonStates(
      false,
      getExtensionEnabled(),
      await hasOcrData(getSessionId())
    );
  }
}

// Update fill button state periodically
setInterval(async () => {
  updateButtonStates(
    false,
    getExtensionEnabled(),
    await hasOcrData(getSessionId())
  );
}, 3000);
