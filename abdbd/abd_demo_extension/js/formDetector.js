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

export async function fillDetectedFields(mappedData) {
  if (!getExtensionEnabled()) {
    showMessage("Extension is disabled", "#ef4444");
    return;
  }

  if (detectedFields.length === 0) {
    showMessage(
      "No form fields detected. Please detect fields first.",
      "#d97706"
    );
    return;
  }

  try {
    showMessage("Filling detected form fields...", "#2563eb");

    // Get the active tab
    const [tab] = await window.chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      throw new Error("Could not get active tab ID");
    }

    // Create field mappings based on detected fields and OCR data
    const fieldMappings = createFieldMappings(detectedFields, mappedData);

    // Send message to fill form
    const response = await new Promise((resolve, reject) => {
      window.chrome.tabs.sendMessage(
        tab.id,
        { action: "fillForm", mappings: fieldMappings },
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
        `Successfully filled ${response.filledCount} form fields!`,
        "#059669"
      );
    } else {
      throw new Error(response?.error || "Failed to fill form");
    }
  } catch (error) {
    console.error("Error filling form fields:", error);
    showMessage(`Error: ${error.message}`, "#ef4444");
  }
}

function createFieldMappings(fields, ocrData) {
  const mappings = {};

  fields.forEach((field) => {
    const fieldKey = field.selector || field.id || field.name;
    if (!fieldKey) return;

    // Try to match field with OCR data
    const matchedValue = findMatchingValue(field, ocrData);
    if (matchedValue !== null) {
      mappings[fieldKey] = {
        value: matchedValue,
        confidence: 1.0,
        source: "ocr",
      };
    }
  });

  return mappings;
}

function findMatchingValue(field, ocrData) {
  const fieldIdentifiers = [
    field.label?.toLowerCase(),
    field.name?.toLowerCase(),
    field.id?.toLowerCase(),
    field.placeholder?.toLowerCase(),
  ].filter(Boolean);

  // Direct key matching
  for (const identifier of fieldIdentifiers) {
    if (ocrData[identifier]) {
      return ocrData[identifier];
    }
  }

  // Fuzzy matching for common field types
  const fieldType = field.type?.toLowerCase();
  const label = field.label?.toLowerCase() || "";

  // Email fields
  if (
    fieldType === "email" ||
    label.includes("email") ||
    label.includes("e-mail")
  ) {
    for (const [key, value] of Object.entries(ocrData)) {
      if (
        key.toLowerCase().includes("email") ||
        key.toLowerCase().includes("e-mail")
      ) {
        return value;
      }
    }
  }

  // Phone fields
  if (fieldType === "tel" || label.includes("phone") || label.includes("tel")) {
    for (const [key, value] of Object.entries(ocrData)) {
      if (
        key.toLowerCase().includes("phone") ||
        key.toLowerCase().includes("tel")
      ) {
        return value;
      }
    }
  }

  // Name fields
  if (label.includes("name")) {
    if (label.includes("first")) {
      return ocrData.firstName || ocrData.firstname || ocrData["first name"];
    }
    if (label.includes("last")) {
      return ocrData.lastName || ocrData.lastname || ocrData["last name"];
    }
    return ocrData.name || ocrData.fullName || ocrData["full name"];
  }

  // Address fields
  if (label.includes("address")) {
    return ocrData.address || ocrData.street || ocrData["street address"];
  }

  // City fields
  if (label.includes("city")) {
    return ocrData.city;
  }

  // State fields
  if (label.includes("state") || label.includes("province")) {
    return ocrData.state || ocrData.province;
  }

  // ZIP/Postal code fields
  if (label.includes("zip") || label.includes("postal")) {
    return (
      ocrData.zip ||
      ocrData.zipcode ||
      ocrData.postalcode ||
      ocrData["postal code"]
    );
  }

  // Country fields
  if (label.includes("country")) {
    return ocrData.country;
  }

  return null;
}

// Event listeners
uiElements.detectFieldsBtn?.addEventListener("click", detectFormFields);
