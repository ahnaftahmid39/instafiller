const GEMINI_API_KEY = "AIzaSyDqkZDUaK1NjsaNy45PPvhQViw-cdbZcNg"; // Replace with your actual API key

if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
  console.error(
    "Gemini API Key is not set in background.js! Please replace 'YOUR_GEMINI_API_KEY' with your actual key."
  );
}

// Open sidebar when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request.action);

  if (request.action === "processMultipleImages") {
    handleMultipleImageProcessing(request, sendResponse);
    return true;
  } else if (request.action === "fillFormWithStoredData") {
    handleFormFillingWithStoredData(request, sendResponse);
    return true;
  } else if (request.action === "performOcrAndAutofill") {
    handleSingleImageProcessing(request, sendResponse);
    return true;
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
    const formFieldNames = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: getFormFieldNames,
    });

    const fields = formFieldNames[0]?.result || [];

    // Combine all OCR data and create a comprehensive mapping
    const combinedMappedData = await createCombinedMapping(sessionData, fields);

    // Inject content script and fill form
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content.js"],
    });

    const contentScriptResponse = await new Promise((resolve) => {
      chrome.tabs.sendMessage(
        tabId,
        {
          action: "autofillForm",
          mappedData: combinedMappedData,
        },
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

    const formFieldNames = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: getFormFieldNames,
    });

    const fields = formFieldNames[0]?.result || [];
    const mappedData = await mapOcrToFormFieldsWithGemini(ocrText, fields);

    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content.js"],
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

async function createCombinedMapping(sessionData, formFields) {
  // Combine all OCR text from the session
  const allOcrText = sessionData
    .map((item) => `From ${item.filename}:\n${item.ocrText}`)
    .join("\n\n---\n\n");

  // Create a comprehensive mapping using all available data
  return await mapOcrToFormFieldsWithGemini(allOcrText, formFields);
}

async function performOcrWithGemini(base64Image, mimeType) {
  const contents = [
    {
      parts: [
        {
          text: "Extract all text from this image as accurately as possible. Provide only the extracted text, no additional comments or formatting. If there are key-value pairs or structured data, try to present them clearly on separate lines or in a parsable format.",
        },
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image,
          },
        },
      ],
    },
  ];

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Gemini OCR API error: ${response.status} ${
          response.statusText
        } - ${JSON.stringify(errorData)}`
      );
    }

    const result = await response.json();
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      return result.candidates[0].content.parts[0].text;
    }
    return null;
  } catch (error) {
    console.error("Error performing OCR with Gemini:", error);
    throw error;
  }
}

async function mapOcrToGeneralFieldsWithGemini(ocrText) {
  const prompt = `Extract key-value pairs or structured data from the following OCR text as a JSON object. Identify common field names like 'name', 'firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'zip', 'country', 'date', 'amount', 'total', 'invoiceNumber', 'company', etc. 

OCR Text:
---
${ocrText}
---

Respond with only a JSON object, no additional text or explanation. Example format:
{"name": "John Doe", "email": "john@example.com", "phone": "123-456-7890"}`;

  return await callGeminiForMapping(prompt);
}

async function mapOcrToFormFieldsWithGemini(ocrText, formFields) {
  const formFieldList = formFields
    .map(
      (field) =>
        `- ${
          field.name ||
          field.id ||
          field.placeholder ||
          field.label ||
          field.tagName
        }`
    )
    .filter((value, index, self) => self.indexOf(value) === index)
    .join("\n");

  const fieldListSection = formFieldList
    ? `Available form fields on the webpage:\n---\n${formFieldList}\n---`
    : "";

  const mappingInstruction = formFieldList
    ? `For each relevant piece of information in the OCR text, identify the best matching form field from the provided list. Respond with a JSON object where keys are the identified form field names (exactly as they appear in the provided list) and values are the corresponding extracted data from the OCR text.`
    : `Extract key-value pairs or structured data from the OCR text as a JSON object, identifying common field names.`;

  const prompt = `I have the following OCR text from images:
---
${ocrText}
---

${fieldListSection}

${mappingInstruction}

Respond with only a JSON object, no additional text or explanation.`;

  return await callGeminiForMapping(prompt);
}

async function callGeminiForMapping(prompt) {
  const contents = [{ role: "user", parts: [{ text: prompt }] }];

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Gemini Mapping API error: ${response.status} ${
          response.statusText
        } - ${JSON.stringify(errorData)}`
      );
    }

    const result = await response.json();
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      const jsonString = result.candidates[0].content.parts[0].text;
      try {
        const cleanedJsonString = jsonString
          .replace(/```json\n|```/g, "")
          .trim();
        return JSON.parse(cleanedJsonString);
      } catch (jsonError) {
        console.warn(
          "Failed to parse JSON from Gemini mapping:",
          jsonString,
          jsonError
        );
        return {};
      }
    }
    return {};
  } catch (error) {
    console.error("Error mapping with Gemini:", error);
    throw error;
  }
}

function getFormFieldNames() {
  const fields = document.querySelectorAll("input, select, textarea");
  const fieldInfo = [];

  fields.forEach((field) => {
    const name =
      field.name ||
      field.id ||
      field.placeholder ||
      field.getAttribute("aria-label") ||
      field.getAttribute("title");

    let label = "";
    if (field.id) {
      const labelElement = document.querySelector(`label[for="${field.id}"]`);
      if (labelElement) {
        label = labelElement.textContent.trim();
      }
    }
    if (!label && field.closest("label")) {
      label = field
        .closest("label")
        .textContent.replace(field.textContent, "")
        .trim();
    }

    const type = field.type?.toLowerCase();
    const tagName = field.tagName.toLowerCase();

    if (name || label) {
      fieldInfo.push({
        name: name ? name.trim() : "",
        label: label,
        type: type,
        tagName: tagName,
      });
    }
  });

  return fieldInfo;
}
