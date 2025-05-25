function getForm() {
  return document.querySelector("form");
}

/**
 *
 * @param {HTMLFormElement} form
 */
function findFieldsInForm(form) {
  const clonedForm = document.createElement('form');
}

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
  "required",
  "checked",
  "selected",
  "disabled",
];
