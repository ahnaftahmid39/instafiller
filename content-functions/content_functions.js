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
    // "id",
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
  let inputList = [
    // label: labelText,
    // element: el,
    // type: type,
    // id: new Date().getTime() + Math.random().toString(36).substring(2, 15), // Unique ID for the field
  ];

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

      if (
        !currentElement.hasAttribute("disabled") &&
        currentElement.getAttribute("type") !== "hidden"
      ) {
        // if type not input or textarea or select, return
        if (!["input", "textarea", "select"].includes(tagName.toLowerCase()))
          return;
        const tag = currentElement.tagName.toLowerCase();
        const type = currentElement.type || tag;

        const isVisuallyHidden =
          currentElement.offsetParent === null ||
          window.getComputedStyle(currentElement).visibility === "hidden" ||
          window.getComputedStyle(currentElement).display === "none";

        if (isVisuallyHidden) return;

        let labelText = "";

        // 1. Label using 'for' attribute
        if (currentElement.id) {
          const label = document.querySelector(
            `label[for="${currentElement.id}"]`
          );
          if (label) {
            labelText = label.innerText.trim();
          }
        }

        // 2. Label wrapping the element
        if (!labelText) {
          const wrapperLabel = currentElement.closest("label");
          if (wrapperLabel) {
            labelText = wrapperLabel.innerText.trim();
          }
        }

        // 3. Aria/placeholder/fallback
        if (!labelText) {
          labelText =
            currentElement.getAttribute("aria-label") ||
            currentElement.getAttribute("placeholder") ||
            currentElement.getAttribute("name") ||
            "";
        }

        // 4. Nearby text fallback
        if (!labelText) {
          const parent = currentElement.closest("div, td, th, p");
          if (parent) {
            const textNodes = Array.from(parent.childNodes).filter(
              (node) =>
                node.nodeType === Node.TEXT_NODE &&
                node.textContent.trim().length > 1
            );
            if (textNodes.length > 0) {
              labelText = textNodes[0].textContent.trim();
            }
          }
        }

        const fieldData = {
          //remove \n and \r from and * and replace with "" and trim the labelText
          label: labelText.replace(/[\n\r*]/g, "").trim(), // Default label if none found
          element: currentElement,
          type: type,
          id:
            new Date().getTime() + Math.random().toString(36).substring(2, 15), // Unique ID for the field
          tag: tag,
        };

        // If it's a <select>, get all its options
        if (tag === "select") {
          fieldData.options = Array.from(currentElement.options).map((opt) => ({
            value: opt.value,
            text: opt.text,
          }));
        }
        if (fieldData.label && fieldData.label !== "") {
          inputList.push(fieldData);
          // clonedElement.setAttribute("id", fieldData.id);
        }
      }

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

  const formList = document.querySelectorAll("form");
  if (formList.length < 1) return;

  const formWrapper = document.createElement("div");

  formList.forEach((form) => {
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
    formWrapper.insertAdjacentElement("beforeend", clonedForm.cloneNode(true));
  });

  const returnValue = {
    html: formWrapper.innerHTML,
    inputList: inputList,
  };
  window.formFillerValue = returnValue;
  return returnValue;
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
// export function fillFormValues(mappedData) {
//   console.log("Filling form values with mapped data:", mappedData);
//   Object.entries(mappedData).forEach((data) => {
//     const [name, value] = data;
//     if (!name || value === undefined) {
//       console.warn("Skipping invalid mapped data:", data);
//       return;
//     }
//     const [element] = document.getElementsByName(name);

//     if (element) {
//       switch (element.tagName.toLowerCase()) {
//         case "input":
//           if (element.type === "checkbox" || element.type === "radio") {
//             element.checked = value === "true";
//           } else {
//             element.value = value;
//           }
//           break;
//         case "textarea":
//           element.value = value;
//           break;
//         case "select":
//           const option = Array.from(element.options).find(
//             (opt) => opt.value === value
//           );
//           if (option) {
//             option.selected = true;
//           }
//           break;
//         default:
//           break;
//       }
//       // Trigger events to notify the page of changes
//       element.dispatchEvent(new Event("input", { bubbles: true }));
//       element.dispatchEvent(new Event("change", { bubbles: true }));
//     }
//   });
// }

export function fillFormValues(data) {
  console.log(window.formFillerValue);
  console.log("Adding values to elements:", data);
  const finalData = window.formFillerValue.inputList.map((el) => {
    return {
      ...el,
      value: data[el.id],
    };
  });
  console.log(finalData);
  finalData.forEach((item) => {
    console.log(item);
    const element = item.element;
    const { name, value = "" } = item.value;

    if (element.tagName.toLowerCase() === "select") {
      // For select elements, set the value based on the options
      const optionToSelect = Array.from(element.options).find(
        (opt) => opt.text === value
      );
      if (optionToSelect) {
        element.value = optionToSelect.value;
      }
    } else {
      // For input and textarea, set the value directly
      element.value = value;
    }

    // Trigger input event to ensure any listeners are notified
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
