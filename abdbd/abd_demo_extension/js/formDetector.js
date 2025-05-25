// js/formDetector.js - Form field detection functionality
import { getExtensionEnabled } from "./session.js";
import { uiElements, showMessage, updateFormFieldsDisplay } from "./ui.js";

let detectedFields = [];
let isDetecting = false;

export function getDetectedFields() {
  return detectedFields;
}

export function clearDetectedFields() {
  detectedFields = [];
  updateFormFieldsDisplay([]);
}

export async function detectFormFields() {
  if (!getExtensionEnabled()) {
    showMessage("Extension is disabled", "#ef4444");
    return;
  }

  if (isDetecting) {
    showMessage("Field detection already in progress", "#d97706");
    return;
  }

  try {
    isDetecting = true;
    uiElements.detectFieldsBtn.disabled = true;
    showMessage("Detecting form fields...", "#2563eb");

    // Get the active tab
    const [tab] = await window.chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      throw new Error("Could not get active tab ID");
    }

    // Inject the content script if needed
    try {
      await window.chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content-form-analyzer.js"],
      });
    } catch (error) {
      // Content script might already be injected, continue
      console.log("Content script injection:", error.message);
    }

    // Send message to detect fields
    const response = await new Promise((resolve, reject) => {
      window.chrome.tabs.sendMessage(
        tab.id,
        { action: "detectFields" },
        (response) => {
          if (window.chrome.runtime.lastError) {
            reject(new Error(window.chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        }
      );
    });

    if (response && response.success) {
      detectedFields = response.fields || [];
      updateFormFieldsDisplay(detectedFields);
      showMessage(`Detected ${detectedFields.length} form fields!`, "#059669");
    } else {
      throw new Error(response?.error || "Failed to detect fields");
    }
  } catch (error) {
    console.error("Error detecting form fields:", error);
    showMessage(`Error: ${error.message}`, "#ef4444");
    detectedFields = [];
    updateFormFieldsDisplay([]);
  } finally {
    isDetecting = false;
    uiElements.detectFieldsBtn.disabled = false;
  }
}

// Event listeners
uiElements.detectFieldsBtn?.addEventListener("click", detectFormFields);
