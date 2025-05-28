// js/home.js

// DOM Elements
const apiKeyInput = document.getElementById("api-key-input");
const toggleVisibilityBtn = document.getElementById("toggle-visibility");
const saveKeyBtn = document.getElementById("save-key-btn");
const testKeyBtn = document.getElementById("test-key-btn");
const goToMainBtn = document.getElementById("go-to-main-btn");
const statusContainer = document.getElementById("status-container");
const navigationSection = document.getElementById("navigation-section");

// Initialize the home page
document.addEventListener("DOMContentLoaded", async () => {
  await initializeHomePage();
  setupEventListeners();
});

async function initializeHomePage() {
  // Check if API key already exists
  const existingKey = await getStoredApiKey();
  if (existingKey) {
    apiKeyInput.value = existingKey;
    updateButtonStates(true);
    showNavigationSection();
    showMessage(
      "API key found! You can proceed to the main extension.",
      "success"
    );
  }
}

function setupEventListeners() {
  // API key input validation
  apiKeyInput.addEventListener("input", (e) => {
    const value = e.target.value.trim();
    const isValid = validateApiKey(value);
    updateButtonStates(isValid);

    if (value && !isValid) {
      showMessage(
        'Invalid API key format. Should start with "AIzaSy"',
        "error"
      );
    } else if (isValid) {
      hideMessage();
    }
  });

  // Toggle password visibility
  toggleVisibilityBtn.addEventListener("click", () => {
    const isPassword = apiKeyInput.type === "password";
    apiKeyInput.type = isPassword ? "text" : "password";
    toggleVisibilityBtn.textContent = isPassword ? "🙈" : "👁️";
  });

  // Save API key
  saveKeyBtn.addEventListener("click", saveApiKey);

  // Test API key
  testKeyBtn.addEventListener("click", testApiKey);

  // Navigate to main page
  goToMainBtn.addEventListener("click", goToMainPage);

  // Enter key to save
  apiKeyInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !saveKeyBtn.disabled) {
      saveApiKey();
    }
  });
}

function validateApiKey(key) {
  // Basic validation for Gemini API key format
  return key && key.startsWith("AIzaSy") && key.length > 20;
}

function updateButtonStates(isValid) {
  saveKeyBtn.disabled = !isValid;
  testKeyBtn.disabled = !isValid;
}

async function saveApiKey() {
  const apiKey = apiKeyInput.value.trim();

  if (!validateApiKey(apiKey)) {
    showMessage("Please enter a valid Gemini API key", "error");
    return;
  }

  try {
    showMessage("Saving API key...", "info");
    saveKeyBtn.classList.add("loading");

    // Store in localStorage
    localStorage.setItem("gemini_api_key", apiKey);

    // Also store in chrome storage for background script access
    if (typeof chrome !== "undefined" && chrome.storage) {
      await chrome.storage.local.set({ gemini_api_key: apiKey });
    }

    setTimeout(() => {
      saveKeyBtn.classList.remove("loading");
      showMessage("API key saved successfully! 🎉", "success");
      showNavigationSection();
    }, 1000);
  } catch (error) {
    console.error("Error saving API key:", error);
    saveKeyBtn.classList.remove("loading");
    showMessage("Error saving API key. Please try again.", "error");
  }
}

async function testApiKey() {
  const apiKey = apiKeyInput.value.trim();

  if (!validateApiKey(apiKey)) {
    showMessage("Please enter a valid API key first", "error");
    return;
  }

  try {
    showMessage("Testing API key...", "info");
    testKeyBtn.classList.add("loading");

    // Test the API key with a simple request
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'Hello, this is a test. Please respond with "API key is working!"',
                },
              ],
            },
          ],
        }),
      }
    );

    testKeyBtn.classList.remove("loading");

    if (response.ok) {
      const result = await response.json();
      if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
        showMessage("✅ API key is working correctly!", "success");
      } else {
        showMessage(
          "⚠️ API key works but response format is unexpected",
          "warning"
        );
      }
    } else {
      const errorData = await response.json();
      throw new Error(
        `API Error: ${response.status} - ${
          errorData.error?.message || "Unknown error"
        }`
      );
    }
  } catch (error) {
    console.error("Error testing API key:", error);
    testKeyBtn.classList.remove("loading");

    if (error.message.includes("403") || error.message.includes("401")) {
      showMessage("❌ Invalid API key or insufficient permissions", "error");
    } else if (error.message.includes("429")) {
      showMessage(
        "⚠️ Rate limit exceeded. API key is valid but try again later.",
        "warning"
      );
    } else {
      showMessage(`❌ Test failed: ${error.message}`, "error");
    }
  }
}

async function getStoredApiKey() {
  try {
    // Try localStorage first
    const localKey = localStorage.getItem("gemini_api_key");
    if (localKey) return localKey;

    // Try chrome storage as fallback
    if (typeof chrome !== "undefined" && chrome.storage) {
      const result = await chrome.storage.local.get(["gemini_api_key"]);
      return result.gemini_api_key || null;
    }

    return null;
  } catch (error) {
    console.error("Error getting stored API key:", error);
    return null;
  }
}

function showNavigationSection() {
  navigationSection.style.display = "block";
  navigationSection.scrollIntoView({ behavior: "smooth" });
}

function goToMainPage() {
  // Navigate to the main extension page
  window.location.href = "sidebar.html";
}

function showMessage(message, type = "info") {
  statusContainer.style.display = "block";
  statusContainer.textContent = message;
  statusContainer.className = `status ${type}`;

  // Auto-hide success messages after 3 seconds
  if (type === "success") {
    setTimeout(() => {
      hideMessage();
    }, 3000);
  }
}

function hideMessage() {
  statusContainer.style.display = "none";
}

// Export functions for potential use by other modules
window.homePageUtils = {
  getStoredApiKey,
  validateApiKey,
};
