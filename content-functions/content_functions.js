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

  function handleCheckboxRadioNaming(
    originalElement,
    clonedElement,
    parentClone
  ) {
    const inputType =
      originalElement.type || originalElement.getAttribute("type") || "";

    if (inputType === "radio") {
      // Check if this is a hidden input that's part of a custom radio group
      const isHiddenCustomInput = isHiddenCustomFormControl(originalElement);

      if (isHiddenCustomInput) {
        // Find the associated visible control (button/div with role="radio")
        const associatedControl = findAssociatedCustomControl(
          originalElement,
          "radio"
        );
        const groupName = getCustomRadioGroupName(
          originalElement,
          associatedControl,
          parentClone
        );

        clonedElement.setAttribute("name", groupName);
        originalElement.setAttribute("name", groupName);
      } else {
        // Handle regular radio inputs
        const groupKey = findRadioGroupKey(originalElement, parentClone);
        const groupName = `radio-group-${getOrCreateGroupId(
          radioGroups,
          groupKey
        )}`;

        clonedElement.setAttribute("name", groupName);
        originalElement.setAttribute("name", groupName);
      }
    } else if (inputType === "checkbox") {
      const isHiddenCustomInput = isHiddenCustomFormControl(originalElement);

      if (isHiddenCustomInput) {
        const associatedControl = findAssociatedCustomControl(
          originalElement,
          "checkbox"
        );
        const groupName = getCustomCheckboxGroupName(
          originalElement,
          associatedControl,
          parentClone
        );

        clonedElement.setAttribute("name", groupName);
        originalElement.setAttribute("name", groupName);
      } else {
        // Handle regular checkboxes
        const name = `checkbox-${generatedNameCounter}`;
        clonedElement.setAttribute("name", name);
        originalElement.setAttribute("name", name);
        generatedNameCounter++;
      }
    }
  }

  function isHiddenCustomFormControl(inputElement) {
    const style = inputElement.style;
    const computedStyle = window.getComputedStyle(inputElement);

    // Check for common hiding patterns used by UI libraries
    return (
      inputElement.hasAttribute("aria-hidden") ||
      style.opacity === "0" ||
      style.position === "absolute" ||
      style.transform?.includes("translateX(-100%)") ||
      computedStyle.opacity === "0" ||
      computedStyle.position === "absolute" ||
      inputElement.getAttribute("tabindex") === "-1"
    );
  }

  function findAssociatedCustomControl(hiddenInput, controlType) {
    const parent = hiddenInput.parentElement;
    if (!parent) return null;

    // Look for button or div with appropriate role
    const roleSelector = `[role="${controlType}"], button[data-state], div[data-state]`;

    // First check siblings
    const sibling = parent.querySelector(roleSelector);
    if (sibling && sibling !== hiddenInput) {
      return sibling;
    }

    // Check parent's siblings or nearby elements
    const parentSibling = parent.parentElement?.querySelector(roleSelector);
    return parentSibling;
  }

  function getCustomRadioGroupName(hiddenInput, visibleControl, parentClone) {
    // Try to determine group name from various sources
    let groupIdentifier = null;

    // Check for data attributes that might indicate grouping
    if (visibleControl) {
      groupIdentifier =
        visibleControl.getAttribute("data-slot") ||
        visibleControl.getAttribute("data-group") ||
        visibleControl.getAttribute("name") ||
        visibleControl.getAttribute("data-radix-collection-item");
    }

    // Check the hidden input itself
    if (!groupIdentifier) {
      groupIdentifier = hiddenInput.getAttribute("name");
    }

    // Fallback to parent-based grouping
    if (!groupIdentifier) {
      const parentId = parentClone?.id || parentClone?.className || "default";
      groupIdentifier = `custom-radio-${parentId}`;
    }

    // Extract base name from data-slot or similar
    if (groupIdentifier && groupIdentifier.includes("radio-group")) {
      return groupIdentifier.replace("-item", "");
    }

    return `custom-radio-group-${groupIdentifier}`;
  }

  function getCustomCheckboxGroupName(
    hiddenInput,
    visibleControl,
    parentClone
  ) {
    // Similar logic for checkboxes
    let identifier =
      visibleControl?.getAttribute("data-slot") ||
      visibleControl?.getAttribute("name") ||
      hiddenInput.getAttribute("name") ||
      `custom-checkbox-${generatedNameCounter}`;

    generatedNameCounter++;
    return identifier;
  }

  // Helper function for group ID management
  const radioGroups = new Map();
  const checkboxGroups = new Map();

  function getOrCreateGroupId(groupMap, key) {
    if (!groupMap.has(key)) {
      groupMap.set(key, groupMap.size + 1);
    }
    return groupMap.get(key);
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
      // if name not exists, generate a new one
      if (
        ["input", "textarea", "select"].includes(tagName) &&
        !clonedElement.hasAttribute("name")
      ) {
        const inputType =
          currentElement.type || currentElement.getAttribute("type") || "";

        if (
          tagName === "input" &&
          (inputType === "checkbox" || inputType === "radio")
        ) {
          // Handle checkbox and radio inputs (including custom UI library ones)
          handleCheckboxRadioNaming(currentElement, clonedElement, parentClone);
        } else {
          // Handle other input types
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

  const forms = document.querySelectorAll("form");
  let formsHtml = "";
  forms.forEach((form) => {
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

    formsHtml += clonedForm.outerHTML;
  });
  return formsHtml;
}

// // Example usage:
// const originalForm = getForm();
// const filteredForm = filterFieldsInForm(originalForm);
// console.log(filteredForm);

// mappedData = {
//   name: "Masud",
//   phone: "01771021129"
// };

export function fillFormValues(mappedData) {
  console.log("Filling form values with mapped data:", mappedData);
  // document.querySelectorAll(`.ui-selectonemenu span`).forEach((e) => {
  //   e.click();
  //   e.click();
  // });
  Object.entries(mappedData).forEach((data) => {
    const [name, value] = data;
    if (!name || value === undefined) {
      console.warn("Skipping invalid mapped data:", data);
      return;
    }
    const elements = document.getElementsByName(name);
    const [element] = elements;

    if (element) {
      switch (element.tagName.toLowerCase()) {
        case "input":
          const inputType = element.type.toLowerCase();

          if (inputType === "checkbox") {
            // Handle checkbox - value should be an array of strings
            if (Array.isArray(value)) {
              // Check if any checkbox with this name is already checked
              const checkboxes = Array.from(elements);
              const hasCheckedCheckbox = checkboxes.some((cb) => cb.checked);
              console.log({ checkboxes, hasCheckedCheckbox, value });
              if (!hasCheckedCheckbox) {
                // No checkbox is checked, so update all matching values
                checkboxes.forEach((checkbox) => {
                  checkbox.checked = value.includes(checkbox.value);
                  // Trigger events for each updated checkbox
                  checkbox.dispatchEvent(new Event("input", { bubbles: true }));
                  checkbox.dispatchEvent(
                    new Event("change", { bubbles: true })
                  );
                });
              }
              // If any checkbox is already checked, ignore the update
            }
          } else if (inputType === "radio") {
            // Handle radio - value should be a string
            if (typeof value === "string") {
              // Check if any radio button with this name is already selected
              const radios = Array.from(elements);
              const hasSelectedRadio = radios.some((radio) => radio.checked);

              if (!hasSelectedRadio) {
                // No radio is selected, so select the matching value
                const targetRadio = radios.find(
                  (radio) => radio.value === value
                );
                if (targetRadio) {
                  targetRadio.checked = true;
                  targetRadio.dispatchEvent(
                    new Event("input", { bubbles: true })
                  );
                  targetRadio.dispatchEvent(
                    new Event("change", { bubbles: true })
                  );
                }
              }
              // If any radio is already selected, ignore the update
            }
          } else {
            // Handle other input types (text, email, etc.)
            if (!element.value) {
              element.value = value;
              element.dispatchEvent(new Event("input", { bubbles: true }));
              element.dispatchEvent(new Event("change", { bubbles: true }));
            }
          }
          break;

        case "textarea":
          // don't override
          if (!element.value) {
            element.value = value;
            element.dispatchEvent(new Event("input", { bubbles: true }));
            element.dispatchEvent(new Event("change", { bubbles: true }));
          }
          break;

        case "select":
          const option = Array.from(element.options).find(
            (opt) => opt.value === value
          );
          if (option) {
            option.selected = true;
            element.dispatchEvent(new Event("input", { bubbles: true }));
            element.dispatchEvent(new Event("change", { bubbles: true }));
          }

          break;

        default:
          break;
      }
    }
  });
}
