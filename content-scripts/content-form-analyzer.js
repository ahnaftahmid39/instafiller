// Content script for DOM interaction and form detection
class FormAnalyzer {
  constructor() {
    this.setupMessageListener();
    this.init();
  }

  init() {
    // Auto-detect fields if enabled
    this.checkAutoDetect();
  }

  async checkAutoDetect() {
    const settings = await chrome.storage.sync.get(["autoDetect"]);
    if (settings.autoDetect) {
      // Wait for page to fully load
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
          setTimeout(() => this.detectFields(), 1000);
        });
      } else {
        setTimeout(() => this.detectFields(), 1000);
      }
    }
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case "detectFields":
          this.handleDetectFields(sendResponse);
          return true; // Keep message channel open

        case "fillForm":
          this.handleFillForm(request.mappings, sendResponse);
          return true;

        case "clearForm":
          this.handleClearForm(sendResponse);
          return true;

        default:
          sendResponse({ success: false, error: "Unknown action" });
      }
    });
  }

  handleDetectFields(sendResponse) {
    try {
      const fields = this.detectFields();
      sendResponse({ success: true, fields: fields });
    } catch (error) {
      console.error("Error detecting fields:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  detectFields() {
    const fields = [];
    const processedElements = new Set();

    // Find all form elements
    const formElements = document.querySelectorAll("input, select, textarea");

    formElements.forEach((element) => {
      // Skip hidden, disabled, or readonly elements
      if (
        element.type === "hidden" ||
        element.disabled ||
        element.readOnly ||
        element.style.display === "none" ||
        element.style.visibility === "hidden"
      ) {
        return;
      }

      // Skip buttons and submit inputs
      if (
        element.type === "button" ||
        element.type === "submit" ||
        element.type === "reset" ||
        element.type === "image"
      ) {
        return;
      }

      // Create unique identifier
      const identifier =
        element.id || element.name || this.generateSelector(element);

      if (processedElements.has(identifier)) {
        return;
      }
      processedElements.add(identifier);

      const fieldInfo = this.analyzeField(element);
      if (fieldInfo) {
        fields.push(fieldInfo);
      }
    });

    console.log("Detected fields:", fields);
    return fields;
  }

  analyzeField(element) {
    const field = {
      id: element.id,
      name: element.name,
      type: element.type || element.tagName.toLowerCase(),
      tagName: element.tagName.toLowerCase(),
      selector: this.generateSelector(element),
      label: this.getFieldLabel(element),
      placeholder: element.placeholder || "",
      required: element.required || false,
      value: element.value || "",
      options: this.getFieldOptions(element),
      validation: this.getValidationInfo(element),
      context: this.getFieldContext(element),
    };

    return field;
  }

  getFieldLabel(element) {
    // Try multiple methods to find the label
    let label = "";

    // Method 1: Associated label element
    if (element.id) {
      const labelElement = document.querySelector(`label[for="${element.id}"]`);
      if (labelElement) {
        label = labelElement.textContent.trim();
      }
    }

    // Method 2: Parent label element
    if (!label) {
      const parentLabel = element.closest("label");
      if (parentLabel) {
        label = parentLabel.textContent
          .replace(element.textContent || "", "")
          .trim();
      }
    }

    // Method 3: Previous sibling text
    if (!label) {
      const sibling = element.previousElementSibling;
      if (
        sibling &&
        (sibling.tagName === "LABEL" || sibling.tagName === "SPAN")
      ) {
        label = sibling.textContent.trim();
      }
    }

    // Method 4: Nearby text content
    if (!label) {
      const parent = element.parentElement;
      if (parent) {
        const textNodes = Array.from(parent.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent.trim())
          .filter((text) => text.length > 0);

        if (textNodes.length > 0) {
          label = textNodes[0];
        }
      }
    }

    // Method 5: Use name, id, or placeholder as fallback
    if (!label) {
      label = element.name || element.id || element.placeholder || "";
    }

    return label;
  }

  getFieldOptions(element) {
    if (element.tagName.toLowerCase() === "select") {
      return Array.from(element.options).map((option) => ({
        value: option.value,
        text: option.textContent.trim(),
      }));
    }
    return [];
  }

  getValidationInfo(element) {
    const validation = {};

    if (element.pattern) validation.pattern = element.pattern;
    if (element.minLength) validation.minLength = element.minLength;
    if (element.maxLength) validation.maxLength = element.maxLength;
    if (element.min) validation.min = element.min;
    if (element.max) validation.max = element.max;
    if (element.step) validation.step = element.step;

    return validation;
  }

  getFieldContext(element) {
    // Get surrounding context to understand the field better
    const context = {
      formTitle: this.getFormTitle(element),
      section: this.getFieldSection(element),
      nearby: this.getNearbyText(element),
    };

    return context;
  }

  getFormTitle(element) {
    const form = element.closest("form");
    if (form) {
      // Look for form title in various ways
      const titleSelectors = [
        "h1",
        "h2",
        "h3",
        ".title",
        ".form-title",
        '[class*="title"]',
      ];
      for (const selector of titleSelectors) {
        const titleElement = form.querySelector(selector);
        if (titleElement) {
          return titleElement.textContent.trim();
        }
      }
    }
    return document.title || "";
  }

  getFieldSection(element) {
    // Look for fieldset or section grouping
    const fieldset = element.closest("fieldset");
    if (fieldset) {
      const legend = fieldset.querySelector("legend");
      if (legend) {
        return legend.textContent.trim();
      }
    }

    const section = element.closest("section");
    if (section) {
      const heading = section.querySelector("h1, h2, h3, h4, h5, h6");
      if (heading) {
        return heading.textContent.trim();
      }
    }

    return "";
  }

  getNearbyText(element) {
    // Get text content near the field for additional context
    const parent = element.parentElement;
    if (parent) {
      return parent.textContent.trim().substring(0, 100);
    }
    return "";
  }

  generateSelector(element) {
    // Generate a unique CSS selector for the element
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.name) {
      return `[name="${element.name}"]`;
    }

    // Generate path-based selector as fallback
    const path = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.nodeName.toLowerCase();

      if (current.className) {
        selector += "." + current.className.split(" ").join(".");
      }

      path.unshift(selector);
      current = current.parentNode;

      if (path.length > 5) break; // Limit depth
    }

    return path.join(" > ");
  }

  handleFillForm(mappings, sendResponse) {
    try {
      let filledCount = 0;

      Object.entries(mappings).forEach(([fieldSelector, mapping]) => {
        const element = this.findElement(fieldSelector);
        if (element && mapping.value !== null) {
          this.fillField(element, mapping.value);
          filledCount++;
        }
      });

      sendResponse({
        success: true,
        message: `Filled ${filledCount} fields`,
        filledCount: filledCount,
      });
    } catch (error) {
      console.error("Error filling form:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  findElement(selector) {
    // Try multiple ways to find the element
    try {
      // Try as CSS selector first
      let element = document.querySelector(selector);
      if (element) return element;

      // Try by ID
      if (selector.startsWith("#")) {
        element = document.getElementById(selector.substring(1));
        if (element) return element;
      }

      // Try by name
      element = document.querySelector(`[name="${selector}"]`);
      if (element) return element;

      // Try by ID without #
      element = document.getElementById(selector);
      if (element) return element;
    } catch (error) {
      console.error("Error finding element:", error);
    }

    return null;
  }

  fillField(element, value) {
    // Handle different field types
    switch (element.type) {
      case "checkbox":
        element.checked = this.parseBoolean(value);
        break;

      case "radio":
        if (element.value === value || this.parseBoolean(value)) {
          element.checked = true;
        }
        break;

      case "select-one":
      case "select-multiple":
        this.fillSelect(element, value);
        break;

      default:
        element.value = value;
        break;
    }

    // Trigger events to notify the page of changes
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  fillSelect(selectElement, value) {
    // Try to match by value first
    let option = Array.from(selectElement.options).find(
      (opt) => opt.value.toLowerCase() === value.toLowerCase()
    );

    // If not found, try to match by text content
    if (!option) {
      option = Array.from(selectElement.options).find((opt) =>
        opt.textContent.toLowerCase().includes(value.toLowerCase())
      );
    }

    if (option) {
      option.selected = true;
    }
  }

  parseBoolean(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      return ["true", "yes", "1", "on", "checked"].includes(
        value.toLowerCase()
      );
    }
    return !!value;
  }

  handleClearForm(sendResponse) {
    try {
      const formElements = document.querySelectorAll("input, select, textarea");
      let clearedCount = 0;

      formElements.forEach((element) => {
        if (element.type === "hidden" || element.disabled || element.readOnly) {
          return;
        }

        switch (element.type) {
          case "checkbox":
          case "radio":
            element.checked = false;
            break;
          case "select-one":
          case "select-multiple":
            element.selectedIndex = -1;
            break;
          default:
            element.value = "";
            break;
        }

        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        clearedCount++;
      });

      sendResponse({
        success: true,
        message: `Cleared ${clearedCount} fields`,
        clearedCount: clearedCount,
      });
    } catch (error) {
      console.error("Error clearing form:", error);
      sendResponse({ success: false, error: error.message });
    }
  }
}

// Initialize the form analyzer
if (typeof chrome !== "undefined" && chrome.runtime) {
  new FormAnalyzer();
} else {
  console.warn(
    "Chrome runtime environment not detected. FormAnalyzer may not function correctly."
  );
}
