// js/mobileCapture.js
import { uiElements, updateMobileUI } from "./ui.js";
import { addImage } from "./imageHandler.js"; // <-- CORRECTED: Import 'addImage' instead

// Stores the currently used server URL, not a 'session' ID
let currentServerUrl = "";

// --- Utility Functions for Storage ---
async function getStoredServerUrl() {
  const result = await chrome.storage.local.get("savedServerIp");
  return result.savedServerIp || "";
}

async function setStoredServerUrl(url) {
  await chrome.storage.local.set({ savedServerIp: url });
}

async function getSavedServerIPs() {
  const result = await chrome.storage.local.get("recentServerIps");
  return result.recentServerIps || [];
}

async function addRecentServerIP(ip) {
  let recentIps = await getSavedServerIPs();
  recentIps = recentIps.filter((item) => item !== ip); // Remove if already exists
  recentIps.unshift(ip); // Add to the beginning
  recentIps = recentIps.slice(0, 5); // Keep only the latest 5
  await chrome.storage.local.set({ recentServerIps: recentIps });
  renderSavedServerIPs(); // Re-render the list
}

// --- UI Dialog Functions ---
let isDialogOpen = false;

export async function showMobileIpDialog() {
  uiElements.mobileIpDialog.style.display = "flex";
  isDialogOpen = true;
  await initializeIPAddress();
}

export async function initializeIPAddress() {
  currentServerUrl = await getStoredServerUrl();
  uiElements.serverIpInput.value = currentServerUrl;
  renderSavedServerIPs();
}

export function hideMobileIpDialog() {
  uiElements.mobileIpDialog.style.display = "none";
  isDialogOpen = false;
}

async function removeServerIP(ipToRemove) {
  let recentIps = await getSavedServerIPs();
  recentIps = recentIps.filter((ip) => ip !== ipToRemove);
  await chrome.storage.local.set({ recentServerIps: recentIps });
  renderSavedServerIPs();
  showMessage("Server IP removed", "success");
}

function renderSavedServerIPs() {
  getSavedServerIPs().then((ips) => {
    uiElements.savedServerIpsList.innerHTML = "";

    if (ips.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.classList.add("saved-ip-item");
      emptyItem.textContent = "No saved IPs";
      uiElements.savedServerIpsList.appendChild(emptyItem);
      return;
    }

    ips.forEach((ip) => {
      const li = document.createElement("li");
      li.classList.add("saved-ip-item");

      const textSpan = document.createElement("span");
      textSpan.classList.add("saved-ip-item-text");
      textSpan.textContent = ip;
      textSpan.title = "Click to use this IP";

      const deleteBtn = document.createElement("span");
      deleteBtn.classList.add("saved-ip-item-delete");
      deleteBtn.textContent = "×";
      deleteBtn.title = "Remove this IP";

      li.appendChild(textSpan);
      li.appendChild(deleteBtn);

      // Click handlers
      textSpan.addEventListener("click", () => {
        uiElements.serverIpInput.value = ip;
      });

      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removeServerIP(ip);
      });

      uiElements.savedServerIpsList.appendChild(li);
    });
  });
}

// --- Core Photo Fetching Logic ---
async function fetchPhotoFromMobile(serverIp) {
  if (!serverIp) {
    uiElements.mobileStatus.textContent = "Error: Server IP not set.";
    uiElements.mobileStatus.style.color = "#dc3545";
    return;
  }

  currentServerUrl = serverIp; // Set the URL for this fetch operation
  // await setStoredServerUrl(currentServerUrl); // Persist the chosen IP
  // await addRecentServerIP(currentServerUrl); // Add to recent IPs list

  const photoFetchUrl = `${currentServerUrl}/last_photo`;
  // uiElements.mobileStatus.textContent = "Fetching latest photo...";
  // uiElements.mobileStatus.style.color = "#007bff";
  // Clear previous photo display while fetching

  chrome.runtime.sendMessage(
    { action: "fetchPhoto", serverUrl: photoFetchUrl },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("Runtime error:", chrome.runtime.lastError.message);
        // uiElements.mobileStatus.textContent = `Error: ${chrome.runtime.lastError.message}`;
        // uiElements.mobileStatus.style.color = "#dc3545";
        return;
      }

      if (response && response.success) {
        console.log("Photo received!");
        // uiElements.mobileStatus.textContent = "Photo received!";
        // uiElements.mobileStatus.style.color = "#28a745";

        // Create an image data object compatible with your addImage function
        const imageData = {
          id: Date.now() + Math.random(), // Unique ID for the image
          name: `mobile_photo_${Date.now()}.png`, // A generic name
          base64: response.dataUrl.split(",")[1], // Extract base64 part
          mimeType: response.dataUrl.split(",")[0].split(":")[1].split(";")[0], // Extract mime type
          dataUrl: response.dataUrl,
          fromMobile: true, // Indicate it's from mobile
        };

        // Add the image using your existing addImage function
        addImage(imageData);
        console.log("Mobile photo added to image handler.");

        // Also display the received photo in the mobile section
      } else {
        uiElements.mobileStatus.textContent = `Error: ${
          response.error || "Failed to fetch photo."
        }`;
        uiElements.mobileStatus.style.color = "#dc3545";
        console.error(
          "Error fetching photo from background script:",
          response.error
        );
      }
    }
  );
}

// --- Event Handler for Dialog Connect Button ---
async function handleConnectAndFetch() {
  let ipAddress = uiElements.serverIpInput.value.trim();

  if (!ipAddress) {
    showMessage("Please enter a server IP address", "error");
    return;
  }

  try {
    showMessage("Connecting to mobile device...", "processing");

    // 1. Ensure http:// protocol
    if (!ipAddress.startsWith("http://") && !ipAddress.startsWith("https://")) {
      ipAddress = `http://${ipAddress}`;
    }

    // 2. Check if a port is already present.
    // We'll use URL object for robust parsing.
    let urlObj;
    try {
      urlObj = new URL(ipAddress);
    } catch (e) {
      // If ipAddress isn't a valid URL format initially,
      // e.g., just "192.168.0.145", the URL constructor might throw.
      // In this case, we'll construct it manually.
      console.warn(
        "Invalid URL format, trying to parse manually:",
        ipAddress,
        e
      );
      // Re-add http:// just in case for consistent base
      if (
        !ipAddress.startsWith("http://") &&
        !ipAddress.startsWith("https://")
      ) {
        ipAddress = `http://${ipAddress}`;
      }
      urlObj = new URL(ipAddress); // This should now work, or throw a more specific error if it's truly malformed
    }

    // 3. If no port is explicitly provided by the user, add the fixed port 8080.
    // The `port` property of URL object will be an empty string if no port is specified.
    if (!urlObj.port) {
      // Append the fixed port 8080
      // We reconstruct the URL to properly include the port
      ipAddress = `${urlObj.protocol}//${urlObj.hostname}:8080${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
    }

    // 4. Remove trailing slash for consistency if any
    if (ipAddress.endsWith("/")) {
      ipAddress = ipAddress.slice(0, -1);
    }

    console.log("Formatted server URL for fetch:", ipAddress); // Log for debugging

    await fetchPhotoFromMobile(ipAddress); // Use the now correctly formatted IP with port
    hideMobileIpDialog();
    showMessage("Successfully connected to mobile device!", "success");
  } catch (error) {
    showMessage(`Connection error: ${error.message}`, "error");
  }
}

function toggleMobileIpDialog() {
  const dialog = uiElements.mobileIpDialog;
  const isVisible = dialog.style.display === "flex";

  if (isVisible) {
    hideMobileIpDialog();
  } else {
    showMobileIpDialog();
  }
}

// --- Initialization ---
export function initMobileCapture() {
  // Update event listener to use toggle function
  uiElements.imageUploadSettings.addEventListener(
    "click",
    toggleMobileIpDialog
  );

  // Get Photos from Mobile button
  uiElements.mobilePhotoBtn.addEventListener("click", handleConnectAndFetch);

  // Dialog buttons
  uiElements.closeServerIpDialogBtn.addEventListener(
    "click",
    hideMobileIpDialog
  );
  uiElements.connectServerIpBtn.addEventListener("click", addIpToMemory);

  // Server IP input Enter key handling
  uiElements.serverIpInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addIpToMemory();
    }
  });

  // Close dialog when clicking outside
  uiElements.mobileIpDialog.addEventListener("click", (event) => {
    if (event.target === uiElements.mobileIpDialog) {
      hideMobileIpDialog();
    }
  });

  // Initial load of recent IPs
  renderSavedServerIPs();
}

export function stopMobileSession() {
  console.log("stopMobileSession called (no active session concept).");
  uiElements.mobileStatus.textContent = "Ready to fetch photos.";
  uiElements.mobileStatus.style.color = "#6c757d";
  updateMobileUI(false);
}

export async function addIpToMemory() {
  let ipAddress = uiElements.serverIpInput.value.trim();

  if (!ipAddress) {
    showMessage("Please enter a server IP address", "error");
    return;
  }

  await setStoredServerUrl(ipAddress);
  await addRecentServerIP(ipAddress);
  showMessage("IP address saved", "success");
}
