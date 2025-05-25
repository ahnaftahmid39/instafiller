// js/session.js
import {
  updateExtensionStatus,
  updateOcrDataDisplay,
  updateButtonStates,
  showMessage,
} from "./ui.js";

let currentSessionId = null;
let extensionEnabled = true; // Default to true

export function generateSessionId() {
  return (
    "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
  );
}

export function getSessionId() {
  return currentSessionId;
}

export function getExtensionEnabled() {
  return extensionEnabled;
}

export async function initializeSession() {
  try {
    const result = await window.chrome.storage.session.get([
      "currentSessionId",
      "extensionEnabled",
    ]);

    currentSessionId = result.currentSessionId || generateSessionId();
    extensionEnabled = result.extensionEnabled !== false; // Default to true

    if (!result.currentSessionId) {
      await window.chrome.storage.session.set({
        currentSessionId: currentSessionId,
      });
    }

    updateExtensionStatus(extensionEnabled);
    await updateOcrDataDisplay(currentSessionId);
    updateButtonStates(
      false,
      extensionEnabled,
      await hasOcrData(currentSessionId)
    );
    showMessage("Extension loaded successfully", "#059669");
  } catch (error) {
    console.error("Error initializing session:", error);
    showMessage("Error initializing extension", "#ef4444");
  }
}

export async function newSession() {
  const confirmed = confirm(
    "This will clear ALL stored OCR data and start a new session. Continue?"
  );
  if (!confirmed) return;

  try {
    // Dispatch custom event to notify mobile capture to stop
    document.dispatchEvent(new CustomEvent("stopMobileSession"));

    await window.chrome.storage.session.clear();
    currentSessionId = generateSessionId();
    await window.chrome.storage.session.set({
      currentSessionId: currentSessionId,
      extensionEnabled: extensionEnabled, // Retain extension enabled state
    });

    // Dispatch custom event to clear images
    document.dispatchEvent(new CustomEvent("clearSelectedImages"));

    await updateOcrDataDisplay(currentSessionId);
    updateButtonStates(false, extensionEnabled, false);
    showMessage("New session started - all data cleared!", "#059669");
  } catch (error) {
    console.error("Error starting new session:", error);
    showMessage("Error starting new session", "#ef4444");
  }
}

export async function toggleExtension(checked) {
  extensionEnabled = checked;
  await window.chrome.storage.session.set({ extensionEnabled });
  updateExtensionStatus(extensionEnabled);
  updateButtonStates(
    false,
    extensionEnabled,
    await hasOcrData(currentSessionId)
  );
  showMessage(
    extensionEnabled ? "Extension enabled" : "Extension disabled",
    extensionEnabled ? "#059669" : "#ef4444"
  );
}

export async function removeOcrDataItem(imageId) {
  try {
    const result = await window.chrome.storage.session.get(["ocrDataStore"]);
    const ocrDataStore = result.ocrDataStore || {};
    const sessionData = ocrDataStore[currentSessionId] || [];

    const updatedSessionData = sessionData.filter(
      (item) => item.imageId !== imageId
    );
    ocrDataStore[currentSessionId] = updatedSessionData;

    await window.chrome.storage.session.set({ ocrDataStore });
    await updateOcrDataDisplay(currentSessionId);
    updateButtonStates(
      false,
      extensionEnabled,
      await hasOcrData(currentSessionId)
    );
    showMessage("OCR data item removed", "#d97706");
  } catch (error) {
    console.error("Error removing OCR data item:", error);
    showMessage("Error removing data", "#ef4444");
  }
}

export async function hasOcrData(sessionId) {
  try {
    const result = await window.chrome.storage.session.get(["ocrDataStore"]);
    const ocrData = result.ocrDataStore || {};
    const sessionData = ocrData[sessionId] || [];
    return sessionData.length > 0;
  } catch (error) {
    console.error("Error checking OCR data:", error);
    return false;
  }
}
