document.addEventListener("DOMContentLoaded", () => {
  const imageInput = document.getElementById("image-input");
  const imageThumbnails = document.getElementById("image-thumbnails");
  const processImagesBtn = document.getElementById("process-images-btn");
  const fillFormBtn = document.getElementById("fill-form-btn");
  const newSessionBtn = document.getElementById("new-session-btn");
  const responseContainer = document.getElementById("response-container");
  const extensionToggle = document.getElementById("extension-toggle");
  const extensionStatus = document.getElementById("extension-status");
  const statusDot = document.getElementById("status-dot");
  const ocrCount = document.getElementById("ocr-count");
  const ocrDataDisplay = document.getElementById("ocr-data-display");
  const totalSessionsInfo = document.getElementById("total-sessions-info");

  // New elements for the progress pop-up
  const progressContainer = document.getElementById("progress-container");
  const progressFill = document.getElementById("progress-fill");
  const progressText = document.getElementById("progress-text");
  const overlay = document.createElement("div"); // Create an overlay element
  overlay.className = "overlay";
  document.body.appendChild(overlay); // Append overlay to the body

  let selectedImages = [];
  let sessionId = null;
  let extensionEnabled = true;

  // Select all buttons that should be disabled when the extension is disabled
  const allActionButtons = [
    processImagesBtn,
    fillFormBtn,
    newSessionBtn,
    imageInput, // Also disable file input
  ];

  // Initialize
  initializeExtension();

  async function initializeExtension() {
    try {
      // Load extension state
      const result = await window.chrome.storage.session.get([
        "currentSessionId",
        "ocrDataStore",
        "extensionEnabled",
      ]);

      sessionId = result.currentSessionId || generateSessionId();
      extensionEnabled = result.extensionEnabled !== false; // Default to true

      if (!result.currentSessionId) {
        await window.chrome.storage.session.set({
          currentSessionId: sessionId,
        });
      }

      // Update UI
      extensionToggle.checked = extensionEnabled;
      updateExtensionStatus();
      updateOcrDataDisplay();
      updateButtonStates();
      showMessage("Extension loaded successfully", "#059669");
    } catch (error) {
      console.error("Error initializing extension:", error);
      showMessage("Error initializing extension", "#ef4444");
    }
  }

  function generateSessionId() {
    return (
      "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  // Extension toggle
  extensionToggle.addEventListener("change", async () => {
    extensionEnabled = extensionToggle.checked;
    await window.chrome.storage.session.set({ extensionEnabled });
    updateExtensionStatus();
    updateButtonStates(); // Call this to update all buttons
    showMessage(
      extensionEnabled ? "Extension enabled" : "Extension disabled",
      extensionEnabled ? "#059669" : "#ef4444"
    );
  });

  function updateExtensionStatus() {
    if (extensionEnabled) {
      extensionStatus.textContent = "Enabled";
      extensionStatus.className = "status-text";
      statusDot.className = "status-dot";
      // Re-enable other buttons if extension is enabled
      allActionButtons.forEach((button) => (button.disabled = false));
    } else {
      extensionStatus.textContent = "Disabled";
      extensionStatus.className = "status-text disabled";
      statusDot.className = "status-dot disabled";
      // Disable all other buttons if extension is disabled
      allActionButtons.forEach((button) => (button.disabled = true));
    }
  }

  // Handle multiple image selection
  imageInput.addEventListener("change", (event) => {
    const files = Array.from(event.target.files);

    if (files.length === 0) return;

    files.forEach((file) => {
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageData = {
            id: Date.now() + Math.random(),
            name: file.name,
            base64: e.target.result.split(",")[1],
            mimeType: file.type,
            dataUrl: e.target.result,
          };
          selectedImages.push(imageData);
          updateImageThumbnails();
          updateButtonStates();
        };
        reader.readAsDataURL(file);
      }
    });
  });

  function updateImageThumbnails() {
    imageThumbnails.innerHTML = "";
    selectedImages.forEach((image) => {
      const container = document.createElement("div");
      container.className = "image-container";

      const img = document.createElement("img");
      img.src = image.dataUrl;
      img.className = "image-thumbnail";
      img.title = image.name;

      const removeBtn = document.createElement("div");
      removeBtn.className = "remove-btn";
      removeBtn.innerHTML = "×";
      removeBtn.onclick = () => removeSelectedImage(image.id);

      container.appendChild(img);
      container.appendChild(removeBtn);
      imageThumbnails.appendChild(container);
    });
  }

  function removeSelectedImage(imageId) {
    selectedImages = selectedImages.filter((img) => img.id !== imageId);
    updateImageThumbnails();
    updateButtonStates();
  }

  // Process images for OCR
  processImagesBtn.addEventListener("click", async () => {
    if (!extensionEnabled) {
      showMessage("Extension is disabled", "#ef4444");
      return;
    }

    if (selectedImages.length === 0) {
      showMessage("Please select images first.", "#d97706");
      return;
    }

    showProgress(true); // Show progress bar
    disableAllButtons(true); // Disable all buttons during processing
    showMessage("Processing images...", "#2563eb");

    try {
      console.log(
        "Sending message to background script with",
        selectedImages.length,
        "images"
      );

      const response = await new Promise((resolve, reject) => {
        window.chrome.runtime.sendMessage(
          {
            action: "processMultipleImages",
            images: selectedImages,
            sessionId: sessionId,
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
          `Successfully processed ${selectedImages.length} images!`,
          "#059669"
        );
        selectedImages = []; // Clear selected images after processing
        imageInput.value = ""; // Clear file input
        updateImageThumbnails();
        updateOcrDataDisplay();
        updateButtonStates();
      } else {
        showMessage(
          `Error: ${response?.message || "Unknown error"}`,
          "#ef4444"
        );
      }
    } catch (error) {
      console.error("Error processing images:", error);
      showMessage(`Error: ${error.message}`, "#ef4444");
    } finally {
      showProgress(false); // Hide progress bar
      disableAllButtons(false); // Re-enable all buttons
      updateButtonStates(); // Ensure correct state based on extensionEnabled and other conditions
    }
  });

  // Fill form with stored OCR data
  fillFormBtn.addEventListener("click", async () => {
    if (!extensionEnabled) {
      showMessage("Extension is disabled", "#ef4444");
      return;
    }

    showProgress(true, "Filling form..."); // Show progress bar
    disableAllButtons(true); // Disable all buttons during filling
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
            sessionId: sessionId,
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
        showMessage(
          "Form filled successfully with stored OCR data!",
          "#059669"
        );
      } else {
        showMessage(
          `Error: ${response?.message || "Unknown error"}`,
          "#ef4444"
        );
      }
    } catch (error) {
      console.error("Error filling form:", error);
      showMessage(`Error: ${error.message}`, "#ef4444");
    } finally {
      showProgress(false); // Hide progress bar
      disableAllButtons(false); // Re-enable all buttons
      updateButtonStates(); // Ensure correct state based on extensionEnabled and other conditions
    }
  });

  // New session - clears all data
  newSessionBtn.addEventListener("click", async () => {
    const confirmed = confirm(
      "This will clear ALL stored OCR data and start a new session. Continue?"
    );
    if (!confirmed) return;

    showProgress(true, "Starting new session..."); // Show progress bar
    disableAllButtons(true); // Disable all buttons during session clear
    showMessage("Starting new session...", "#2563eb");

    try {
      await window.chrome.storage.session.clear();
      sessionId = generateSessionId();
      await window.chrome.storage.session.set({
        currentSessionId: sessionId,
        extensionEnabled: extensionEnabled,
      });
      selectedImages = [];
      imageInput.value = "";
      updateImageThumbnails();
      updateOcrDataDisplay();
      showMessage("New session started - all data cleared!", "#059669");
    } catch (error) {
      console.error("Error starting new session:", error);
      showMessage("Error starting new session", "#ef4444");
    } finally {
      showProgress(false); // Hide progress bar
      disableAllButtons(false); // Re-enable all buttons
      updateButtonStates(); // Ensure correct state based on extensionEnabled and other conditions
    }
  });

  // Remove individual OCR data item
  async function removeOcrDataItem(imageId) {
    try {
      const result = await window.chrome.storage.session.get(["ocrDataStore"]);
      const ocrDataStore = result.ocrDataStore || {};
      const sessionData = ocrDataStore[sessionId] || [];

      // Remove the specific item
      const updatedSessionData = sessionData.filter(
        (item) => item.imageId !== imageId
      );
      ocrDataStore[sessionId] = updatedSessionData;

      await window.chrome.storage.session.set({ ocrDataStore });
      updateOcrDataDisplay();
      updateButtonStates();
      showMessage("OCR data item removed", "#d97706");
    } catch (error) {
      console.error("Error removing OCR data item:", error);
      showMessage("Error removing data", "#ef4444");
    }
  }

  async function updateOcrDataDisplay() {
    try {
      const result = await window.chrome.storage.session.get(["ocrDataStore"]);
      const ocrData = result.ocrDataStore || {};
      const sessionData = ocrData[sessionId] || [];

      ocrCount.textContent = `${sessionData.length} items`;

      if (sessionData.length === 0) {
        ocrDataDisplay.textContent = "No OCR data stored";
      } else {
        ocrDataDisplay.innerHTML = "";
        sessionData.forEach((item, index) => {
          const div = document.createElement("div");
          div.className = "ocr-data-item";

          const header = document.createElement("div");
          header.className = "ocr-item-header";

          const title = document.createElement("div");
          title.className = "ocr-item-title";
          title.textContent = `Image ${index + 1}: ${item.filename}`;

          const removeBtn = document.createElement("button");
          removeBtn.className = "btn-danger";
          removeBtn.textContent = "Remove";
          removeBtn.onclick = () => removeOcrDataItem(item.imageId);
          // Disable remove button if extension is disabled
          if (!extensionEnabled) {
            removeBtn.disabled = true;
          }

          header.appendChild(title);
          header.appendChild(removeBtn);

          const details = document.createElement("div");
          details.className = "ocr-item-details";
          details.innerHTML = `
                        <strong>Fields extracted:</strong> ${
                          Object.keys(item.mappedData).length
                        }<br>
                        <strong>Processed:</strong> ${new Date(
                          item.timestamp
                        ).toLocaleString()}
                    `;

          div.appendChild(header);
          div.appendChild(details);
          ocrDataDisplay.appendChild(div);
        });
      }

      updateTotalSessionsInfo();
    } catch (error) {
      console.error("Error updating OCR data display:", error);
    }
  }

  function updateButtonStates() {
    const hasImages = selectedImages.length > 0;
    const isExtensionEnabled = extensionEnabled;

    // General rule: If extension is disabled, all action buttons are disabled.
    // Otherwise, apply specific conditions.
    processImagesBtn.disabled = !isExtensionEnabled || !hasImages;
    newSessionBtn.disabled = !isExtensionEnabled;
    imageInput.disabled = !isExtensionEnabled;

    // Dynamically update states of "Remove" buttons in OCR data display
    const removeButtons = document.querySelectorAll(
      ".ocr-data-item .btn-danger"
    );
    removeButtons.forEach((button) => {
      button.disabled = !isExtensionEnabled;
    });

    updateFillButtonState(); // This function already checks extensionEnabled
  }

  async function updateFillButtonState() {
    try {
      const result = await window.chrome.storage.session.get(["ocrDataStore"]);
      const ocrData = result.ocrDataStore || {};
      const sessionData = ocrData[sessionId] || [];
      fillFormBtn.disabled = sessionData.length === 0 || !extensionEnabled;
    } catch (error) {
      fillFormBtn.disabled = true;
    }
  }

  // Function to disable/enable all main action buttons
  function disableAllButtons(disable) {
    allActionButtons.forEach((button) => {
      button.disabled = disable;
    });
    // Also disable individual OCR data remove buttons
    const removeButtons = document.querySelectorAll(
      ".ocr-data-item .btn-danger"
    );
    removeButtons.forEach((button) => {
      button.disabled = disable;
    });
  }

  function showProgress(show, text = "Processing...") {
    if (show) {
      overlay.classList.add("visible"); // Show the overlay
      progressContainer.style.display = "flex"; // Show the progress bar container
      progressFill.style.width = "0%";
      progressText.textContent = "0%";

      // Simulate progress (you might remove this if background script sends real updates)
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 10; // Slower simulation for better visibility
        if (progress > 95) {
          // Cap at 95% to allow final update from background
          progress = 95;
        }
        progressFill.style.width = progress + "%";
        progressText.textContent = Math.round(progress) + "%";
      }, 200);

      // Store interval for cleanup
      progressContainer.dataset.interval = interval;
    } else {
      if (progressContainer.dataset.interval) {
        clearInterval(progressContainer.dataset.interval);
      }

      // Ensure progress completes to 100% before hiding
      progressFill.style.width = "100%";
      progressText.textContent = "100%";

      setTimeout(() => {
        progressContainer.style.display = "none"; // Hide the progress bar container
        overlay.classList.remove("visible"); // Hide the overlay
      }, 500); // Give a small delay to show 100%
    }
  }

  function showMessage(message, color) {
    responseContainer.textContent = message;
    responseContainer.style.color = color;
    responseContainer.style.borderLeftColor = color;
  }

  async function updateTotalSessionsInfo() {
    try {
      const result = await window.chrome.storage.session.get(["ocrDataStore"]);
      const ocrDataStore = result.ocrDataStore || {};
      const sessionCount = Object.keys(ocrDataStore).length;
      const totalItems = Object.values(ocrDataStore).reduce(
        (sum, sessionData) => sum + sessionData.length,
        0
      );

      totalSessionsInfo.textContent = `Total: ${sessionCount} sessions, ${totalItems} OCR items stored`;
    } catch (error) {
      totalSessionsInfo.textContent = "Unable to load session info";
    }
  }

  // Listen for progress updates from background script
  window.chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
      if (request.action === "updateProgress") {
        const { current, total, percentage } = request;
        progressFill.style.width = percentage + "%";
        progressText.textContent = `${Math.round(
          percentage
        )}% (${current}/${total})`;
      }
    }
  );

  // Update fill button state periodically
  setInterval(updateFillButtonState, 3000);
});
