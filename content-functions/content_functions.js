// functions in this files are injected into content and run by service worker

/**
 * Filters a form to only include allowed elements and attributes
 * @returns {string} - The filtered form clone as an HTML string
 */
export function filterFieldsInForm() {
  const allowedElements = [
    "input",
    "textarea",
    "select",
    "option",
    "optgroup",
    "button",
    "label",
    "fieldset",
    "legend",
    "datalist",
  ];

  const allowedAttributes = [
    "id",
    "name",
    "type",
    "for",
    "value",
    "placeholder",
    "checked",
    "selected",
    "disabled",
    "role",
  ];

  let generatedNameCounter = 1;

  /**
   * Recursively traverses the form and filters elements/attributes
   * @param {Element} currentElement - Current element being processed
   * @param {Element|null} parentClone - Parent element in the cloned structure
   * @param {Element} rootClone - Root cloned form element
   */
  function dfs(currentElement, parentClone, rootClone) {
    // Skip text nodes and other non-element nodes
    if (currentElement.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    if (!currentElement) return;

    const tagName = currentElement.tagName.toLowerCase();

    // Check if current element is allowed
    if (allowedElements.includes(tagName)) {
      // Create a clone of the allowed element
      const clonedElement = document.createElement(tagName);

      // Copy only allowed attributes
      for (const attr of currentElement.attributes) {
        if (allowedAttributes.includes(attr.name)) {
          clonedElement.setAttribute(attr.name, attr.value);
        }
      }
      // if name not exists, generate a new one
      if (
        ["input", "textarea", "select"].includes(tagName) &&
        !clonedElement.hasAttribute("name")
      ) {
        clonedElement.setAttribute(
          "name",
          `generated-name-${generatedNameCounter}`
        );
        currentElement.setAttribute(
          "name",
          `generated-name-${generatedNameCounter}`
        );
        generatedNameCounter++;
      }

      // Copy text content for elements that typically contain text
      if (["option", "button", "label", "legend"].includes(tagName)) {
        clonedElement.textContent = currentElement.textContent;
      }

      // Append to the appropriate parent
      if (parentClone) {
        parentClone.appendChild(clonedElement);
      } else {
        rootClone.appendChild(clonedElement);
      }

      // Continue DFS with this element as the new parent
      for (const child of currentElement.children) {
        dfs(child, clonedElement, rootClone);
      }
    } else {
      // Element not allowed, but continue traversing its children
      // using the current parent (skip this element in the clone)
      for (const child of currentElement.children) {
        dfs(child, parentClone, rootClone);
      }
    }
  }

  const form = document.querySelector("form");
  if (!form) return;
  const clonedForm = document.createElement("form");

  // Copy allowed attributes from the original form
  for (const attr of form.attributes) {
    if (allowedAttributes.includes(attr.name)) {
      clonedForm.setAttribute(attr.name, attr.value);
    }
  }

  // Start DFS traversal
  for (const child of form.children) {
    dfs(child, null, clonedForm, allowedElements, allowedAttributes);
  }
  return clonedForm.outerHTML;
}

// // Example usage:
// const originalForm = getForm();
// const filteredForm = filterFieldsInForm(originalForm);
// console.log(filteredForm);

// mappedData = {
//   name: "Masud",
//   phone: "01771021129"
// };

/**
 * Fills form fields with mapped data from OCR results
 * @param {{ [key: string]: string }} mappedData - The data to fill in the form fields
 */
export function fillFormValues(mappedData) {
  console.log("Filling form values with mapped data:", mappedData);
  Object.entries(mappedData).forEach((data) => {
    const [name, value] = data;
    if (!name || value === undefined) {
      console.warn("Skipping invalid mapped data:", data);
      return;
    }
    const [element] = document.getElementsByName(name);

    if (element) {
      switch (element.tagName.toLowerCase()) {
        case "input":
          if (element.type === "checkbox" || element.type === "radio") {
            element.checked = value === "true";
          } else {
            element.value = value;
          }
          break;
        case "textarea":
          element.value = value;
          break;
        case "select":
          const option = Array.from(element.options).find(
            (opt) => opt.value === value
          );
          if (option) {
            option.selected = true;
          }
          break;
        default:
          break;
      }
      // Trigger events to notify the page of changes
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
}
