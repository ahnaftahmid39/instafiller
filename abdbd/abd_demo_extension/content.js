// This function fills the form fields with the OCR data, but skips already filled fields.
function fillFormFieldsWithOcrData(mappedData) {
  const forms = document.querySelectorAll("form");
  let fieldsFilledCount = 0;
  let fieldsSkippedCount = 0;

  forms.forEach((form) => {
    const fields = form.querySelectorAll("input, select, textarea");

    fields.forEach((field) => {
      // Skip if field is already filled (has a value)
      if (field.value && field.value.trim() !== "") {
        fieldsSkippedCount++;
        console.log(
          `⏭️ Skipped already filled field: '${
            field.name || field.id || field.placeholder
          }'`
        );
        return;
      }

      // Skip if field is disabled or readonly
      if (field.disabled || field.readOnly) {
        console.log(
          `⏭️ Skipped disabled/readonly field: '${
            field.name || field.id || field.placeholder
          }'`
        );
        return;
      }

      // Prioritize filling from OCR mapped data
      const fieldIdentifier = field.name || field.id || field.placeholder;
      // Also check if mappedData contains a key matching the associated label text, if available
      let labelText = "";
      if (field.id) {
        const labelElement = document.querySelector(`label[for="${field.id}"]`);
        if (labelElement) {
          labelText = labelElement.textContent.trim();
        }
      }
      if (!labelText && field.closest("label")) {
        labelText = field
          .closest("label")
          .textContent.replace(field.textContent, "")
          .trim();
      }

      // Determine the best key to look for in mappedData
      let valueToFill = undefined;
      if (fieldIdentifier && mappedData[fieldIdentifier]) {
        valueToFill = mappedData[fieldIdentifier];
      } else if (labelText && mappedData[labelText]) {
        // Try matching by label text
        valueToFill = mappedData[labelText];
      } else {
        // As a fallback, try to find a value that loosely matches common names/labels
        // This is a very loose match and might need refinement for accuracy
        const commonNames = [
          "name",
          "firstName",
          "lastName",
          "email",
          "phone",
          "address",
          "city",
          "state",
          "zip",
          "country",
          "date",
          "number",
          "total",
          "invoice",
          "company",
        ];
        for (const commonName of commonNames) {
          if (
            fieldIdentifier?.toLowerCase().includes(commonName) &&
            mappedData[commonName]
          ) {
            valueToFill = mappedData[commonName];
            break;
          }
          if (
            labelText?.toLowerCase().includes(commonName) &&
            mappedData[commonName]
          ) {
            valueToFill = mappedData[commonName];
            break;
          }
        }
      }

      if (valueToFill !== undefined) {
        try {
          // Special handling for checkboxes and radio buttons
          if (field.type?.toLowerCase() === "checkbox") {
            // Check if mapped value is 'true', '1', or 'yes' (case-insensitive)
            field.checked = ["true", "1", "yes"].includes(
              String(valueToFill).toLowerCase()
            );
          } else if (field.type?.toLowerCase() === "radio") {
            // Only check if its value matches the mapped data
            if (field.value === valueToFill) {
              field.checked = true;
            }
          } else if (field.tagName.toLowerCase() === "select") {
            // Check if the option exists before setting value
            const optionExists = Array.from(field.options).some(
              (option) =>
                option.value === valueToFill || option.text === valueToFill
            );
            if (optionExists) {
              field.value = valueToFill;
            } else {
              console.warn(
                `Mapped value "${valueToFill}" for select field "${
                  fieldIdentifier || labelText
                }" does not exist in options. Attempting partial match if any.`
              );
              // Optional: Attempt a partial/fuzzy match for select options
              const bestMatchOption = Array.from(field.options).find(
                (option) =>
                  String(option.value)
                    .toLowerCase()
                    .includes(String(valueToFill).toLowerCase()) ||
                  String(option.text)
                    .toLowerCase()
                    .includes(String(valueToFill).toLowerCase())
              );
              if (bestMatchOption) {
                field.value = bestMatchOption.value;
                console.log(
                  `Fuzzy matched "${valueToFill}" to option "${
                    bestMatchOption.text
                  }" for field "${fieldIdentifier || labelText}"`
                );
              }
            }
          } else {
            field.value = valueToFill;
          }

          // Dispatch events to trigger any dynamic listeners on the page
          field.dispatchEvent(new Event("input", { bubbles: true }));
          field.dispatchEvent(new Event("change", { bubbles: true }));
          fieldsFilledCount++;
          console.log(
            `✅ Filled '${fieldIdentifier || labelText}' with: '${valueToFill}'`
          );
        } catch (err) {
          console.warn(
            `Could not fill field '${fieldIdentifier || labelText}':`,
            err
          );
        }
      }
    });
  });

  if (fieldsFilledCount > 0 || fieldsSkippedCount > 0) {
    console.log(
      `✨ Form autofill complete: ${fieldsFilledCount} fields filled, ${fieldsSkippedCount} fields skipped (already filled).`
    );
  } else {
    console.log("🤷 No matching form fields found or filled from OCR data.");
  }
}

// Add a message listener to content.js to receive data from background.js
window.chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "autofillForm" && request.mappedData) {
    try {
      fillFormFieldsWithOcrData(request.mappedData);
      sendResponse({ status: "success" }); // Acknowledge successful processing
    } catch (e) {
      console.error("Error filling form in content script:", e);
      sendResponse({ status: "error", message: e.message }); // Send error back to background
    }
    return true; // Indicates an asynchronous response
  }
});
