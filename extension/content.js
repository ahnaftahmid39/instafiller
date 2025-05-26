(function() {
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
    "role"
  ];

function getForm() {
  return document.querySelector("form");
}

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

    // Copy text content for elements that typically contain text
    if (['option', 'button', 'label', 'legend'].includes(tagName)) {
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

/**
 * Filters a form to only include allowed elements and attributes
 * @param {HTMLFormElement} form - The form to filter
 * @returns {HTMLFormElement} - The filtered form clone
 */
function filterFieldsInForm(form) {
  if (!form) return
  const clonedForm = document.createElement('form');

  // Copy allowed attributes from the original form
  for (const attr of form.attributes) {
    if (allowedAttributes.includes(attr.name)) {
      clonedForm.setAttribute(attr.name, attr.value);
    }
  }

  // Start DFS traversal
  for (const child of form.children) {
    dfs(child, null, clonedForm);
  }

  return clonedForm;
}

  // Example usage:
  const originalForm = getForm();
  const filteredForm = filterFieldsInForm(originalForm);
  console.log(filteredForm);
})();
