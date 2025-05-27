// js/formCleaner.js - Form clearing functionality
import { getExtensionEnabled } from "./session.js";
import { showMessage } from "./ui.js";

export async function clearForm() {
  if (!getExtensionEnabled()) {
    showMessage("Extension is disabled", "#ef4444");
    return;
  }

  try {
    showMessage("Clearing form fields...", "#2563eb");

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
        files: ["content-scripts/content-form-analyzer.js"],
      });
    } catch (error) {
      // Content script might already be injected, continue
      console.log("Content script injection:", error.message);
    }

    // Send message to clear form
    const response = await new Promise((resolve, reject) => {
      window.chrome.tabs.sendMessage(
        tab.id,
        { action: "clearForm" },
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
      showMessage(
        `Successfully cleared ${response.clearedCount} form fields!`,
        "#059669"
      );
    } else {
      throw new Error(response?.error || "Failed to clear form");
    }
  } catch (error) {
    console.error("Error clearing form:", error);
    showMessage(`Error: ${error.message}`, "#ef4444");
  }
}
