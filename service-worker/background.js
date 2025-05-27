import {
  fillFormValues,
  filterFieldsInForm,
} from "../content-functions/content_functions.js";
import {
  mapOcrToFormFieldsWithGemini,
  mapOcrToGeneralFieldsWithGemini,
  performOcrWithGemini,
} from "./ai.js";

// Open sidebar when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// routing for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request.action);
  switch (request.action) {
    case "processMultipleImages":
      handleMultipleImageProcessing(request, sendResponse);
      return true; // Keep the message channel open for async response

    case "fillFormWithStoredData":
      handleFormFillingWithStoredData(request, sendResponse);
      return true;

    case "performOcrAndAutofill":
      handleSingleImageProcessing(request, sendResponse);
      return true;

    default:
      console.warn(`Unknown action: ${request.action}`);
      sendResponse({ status: "error", message: "Unknown action" });
      return false;
  }
});

async function handleMultipleImageProcessing(request, sendResponse) {
  const { images, sessionId } = request;
  console.log(`Processing ${images.length} images for session ${sessionId}`);

  try {
    const processedData = [];
    const totalImages = images.length;

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      console.log(`Processing image ${i + 1}/${images.length}: ${image.name}`);

      // Send progress update
      const percentage = ((i + 1) / totalImages) * 100;
      try {
        chrome.runtime.sendMessage({
          action: "updateProgress",
          current: i + 1,
          total: totalImages,
          percentage: percentage,
        });
      } catch (e) {
        // Ignore if sidebar is not open
      }

      try {
        // Perform OCR
        const ocrText = await performOcrWithGemini(
          image.base64,
          image.mimeType
        );
        if (!ocrText) {
          console.warn(`OCR failed for image: ${image.name}`);
          continue;
        }

        console.log(
          `OCR successful for ${image.name}, text length: ${ocrText.length}`
        );

        // Create a general mapping without specific form fields
        const mappedData = await mapOcrToGeneralFieldsWithGemini(ocrText);
        console.log(
          `Mapped ${Object.keys(mappedData).length} fields for ${image.name}`
        );

        processedData.push({
          imageId: image.id,
          filename: image.name,
          ocrText: ocrText,
          mappedData: mappedData,
          timestamp: Date.now(),
        });
      } catch (imageError) {
        console.error(`Error processing image ${image.name}:`, imageError);
        // Continue with other images even if one fails
      }
    }

    if (processedData.length === 0) {
      throw new Error("No images were successfully processed");
    }

    // Store the processed data
    await storeOcrData(sessionId, processedData);

    sendResponse({
      status: "success",
      message: `Processed ${processedData.length} images successfully`,
      processedCount: processedData.length,
    });
  } catch (error) {
    console.error("Error processing multiple images:", error);
    sendResponse({ status: "error", message: error.message });
  }
}

async function handleFormFillingWithStoredData(request, sendResponse) {
  const { sessionId, tabId } = request;

  try {
    // Check if extension is enabled
    const result = await chrome.storage.session.get(["extensionEnabled"]);
    if (result.extensionEnabled === false) {
      sendResponse({ status: "error", message: "Extension is disabled" });
      return;
    }

    // Get stored OCR data
    const ocrResult = await chrome.storage.session.get(["ocrDataStore"]);
    const ocrDataStore = ocrResult.ocrDataStore || {};
    const sessionData = ocrDataStore[sessionId] || [];

    if (sessionData.length === 0) {
      sendResponse({
        status: "error",
        message: "No OCR data found for current session",
      });
      return;
    }

    // Get form fields from the current page
    const [{ result: filteredForm }] = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: filterFieldsInForm,
    });

    // Combine all OCR data and create a comprehensive mapping
    const combinedMappedData = await createCombinedMapping(
      sessionData,
      filteredForm
    );

    console.log(
      `Combined mapping for session ${sessionId}:`,
      combinedMappedData
    );

    // Inject content script and fill form
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: fillFormValues,
      args: [combinedMappedData],
    });

    sendResponse({ status: "success", message: "Form filled successfully" });
  } catch (error) {
    console.error("Error filling form with stored data:", error);
    sendResponse({ status: "error", message: error.message });
  }
}

async function handleSingleImageProcessing(request, sendResponse) {
  // Keep original functionality for backward compatibility
  const { imageData, tabId } = request;

  try {
    const ocrText = await performOcrWithGemini(
      imageData.base64,
      imageData.mimeType
    );
    if (!ocrText) {
      throw new Error("OCR failed or returned no text.");
    }

    // const formFieldNames =  await chrome.scripting.executeScript({
    //   target: { tabId: tabId },
    //   function: getFormFieldNames,
    // });
    const formFieldNames = [];

    const fields = formFieldNames?.[0]?.result || [];
    const mappedData = await mapOcrToFormFieldsWithGemini(ocrText, fields);

    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content-scripts/content.js"],
    });

    const contentScriptResponse = await new Promise((resolve) => {
      chrome.tabs.sendMessage(
        tabId,
        { action: "autofillForm", mappedData: mappedData },
        (res) => {
          if (chrome.runtime.lastError) {
            resolve({
              status: "error",
              message: chrome.runtime.lastError.message,
            });
          } else {
            resolve(res);
          }
        }
      );
    });

    sendResponse(contentScriptResponse);
  } catch (error) {
    console.error("Error during single image processing:", error);
    sendResponse({ status: "error", message: error.message });
  }
}

async function storeOcrData(sessionId, newData) {
  try {
    const result = await chrome.storage.session.get(["ocrDataStore"]);
    const ocrDataStore = result.ocrDataStore || {};

    if (!ocrDataStore[sessionId]) {
      ocrDataStore[sessionId] = [];
    }

    ocrDataStore[sessionId].push(...newData);

    await chrome.storage.session.set({ ocrDataStore });
    console.log(
      `Stored ${newData.length} OCR data items for session ${sessionId}`
    );
  } catch (error) {
    console.error("Error storing OCR data:", error);
    throw error;
  }
}

async function createCombinedMapping(sessionData, filteredForm) {
  // Combine all OCR text from the session
  const allOcrText = sessionData
    .map((item) => `From ${item.filename}:\n${item.ocrText}`)
    .join("\n\n---\n\n");

  // Create a comprehensive mapping using all available data
  return await mapOcrToFormFieldsWithGemini(allOcrText, filteredForm);
}
