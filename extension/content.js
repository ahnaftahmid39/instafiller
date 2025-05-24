function getRandomValueForField(field) {
  const type = field.type?.toLowerCase();
  const tag = field.tagName.toLowerCase();

  if (tag === "textarea") {
    return "Lorem ipsum dolor sit amet.";
  }

  if (tag === "select") {
    if (field.options.length > 0) {
      const randomIndex = Math.floor(Math.random() * field.options.length);
      return field.options[randomIndex].value;
    }
    return "";
  }

  switch (type) {
    case "text":
    case "":
      return "Sample Text";
    case "email":
      return `user${Math.floor(Math.random() * 1000)}@example.com`;
    case "number":
      return Math.floor(Math.random() * 100).toString();
    case "date":
      return new Date().toISOString().split("T")[0];
    case "tel":
      return "1234567890";
    case "url":
      return "https://example.com";
    case "checkbox":
      field.checked = true;
      return;
    case "radio":
      // Only check if not already checked
      if (!field.checked) {
        field.checked = true;
      }
      return;
    case "password":
      return "P@ssw0rd123";
    default:
      return "Sample Input";
  }
}

function fillFormFields() {
  const forms = document.querySelectorAll("form");

  forms.forEach((form, formIndex) => {
    const fields = form.querySelectorAll("input, select, textarea");

    fields.forEach((field) => {
      try {
        const value = getRandomValueForField(field);
        if (value !== undefined) {
          field.value = value;

          // Dispatch input/change event to trigger any listeners
          field.dispatchEvent(new Event("input", { bubbles: true }));
          field.dispatchEvent(new Event("change", { bubbles: true }));
        }
      } catch (err) {
        console.warn("Could not fill field", field, err);
      }
    });

    console.log(`✅ Form ${formIndex + 1} filled.`);
  });
}

fillFormFields();
