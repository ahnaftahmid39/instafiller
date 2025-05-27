(() => {
  function waitForElem(
    waitFor,
    callback,
    minElements = 1,
    isVariable = false,
    timer = 10000,
    frequency = 25
  ) {
    let elements = isVariable
      ? window[waitFor]
      : document.querySelectorAll(waitFor);
    if (timer <= 0) return;
    (!isVariable && elements.length >= minElements) ||
    (isVariable && typeof window[waitFor] !== "undefined")
      ? callback(elements)
      : setTimeout(
          () =>
            waitForElem(
              waitFor,
              callback,
              minElements,
              isVariable,
              timer - frequency
            ),
          frequency
        );
  }
  const apiKey = "AIzaSyDTVB7OyqPGb28RpXRk6jzuPR5Q1q5OdAU"; // 🔒 Never use this in production frontend

  async function getGeminiProptTextResult(promptText) {
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: promptText }, // use the function argument here
          ],
        },
      ],
    };

    return fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
        apiKey,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    )
      .then((res) => res.json())
      .then((res) => {
        // Return the text from the first candidate's first content part
        return res.candidates?.[0]?.content?.parts?.[0].text || null;
      });
  }

  function addedValueToElements(data) {
    console.log("Adding values to elements:", data);
    data.forEach((item) => {
      const element = item.element;
      const { name, value } = item.value;

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
  function mainJs([body]) {
    setTimeout(() => {
      const { html, inputList } = filterFieldsInForm();
      console.log(inputList);
      //     label: labelText.replace(/[\n\r*]/g, '').trim(), // Default label if none found
      //   element: currentElement,
      //   type: type,
      //   id: new Date().getTime() + Math.random().toString(36).substring(2, 15), // Unique ID for the field
      //   tag: tag,
      getdataFromImage().then((data) => {
        getGeminiProptTextResult(`
                I have three pieces of data:

                1.  **Extracted form fields from a website (as a JSON array of objects, each with 'name' and 'id'):**
                    ${JSON.stringify(
                      inputList.map((item) => ({
                        name: item.label,
                        id: item.id,
                        type: item.type,
                        tag: item.element.tagName.toLowerCase(),
                      }))
                    )}
                
                2.  **JSON data extracted from an OCR'd document (as a JSON string):**
                    ${JSON.stringify(data)}

                3.  **This is a a manupulated tree on the webpage:**
                    ${JSON.stringify(html)}
                
                Please provide a JSON object where the **keys are the 'id' from the extracted form fields** and the **values are the corresponding, most relevant data from the OCR'd document's JSON**.
                
                **Important Considerations for Mapping:**
                
                * **Prioritize direct and logical matches.** For example, "First Name: *" should map to "name" in the OCR data if it represents a person's name.
                * **Handle complex names:** If the OCR data has a full name (e.g., "ABDULLAH IBNE MASUD") and the form has "First Name" and "Last Name," try to intelligently split and map them. If it's ambiguous, map the full name to "First Name" and leave "Last Name" as 'null'.
                * **Country/Region:** Map "Country/Region of Residence:*" to "country" from the OCR data.
                * **Unmatched Fields:** If a form field has no clear or logical counterpart in the OCR data (e.g., "Email Address: *", "Choose Password: *", "show_button", "show_conf_button", "Notification:"), its value in the output JSON should be 'null'.
                * **Case Sensitivity:** Assume that text comparison for mapping should be case-insensitive for better matching.
                * based on the date input please care about the input element structure and give me proper result 
                * we also need name and value for each value. so that for select field we can set the value based on the options. like for a select we will get a name like "bangladesh" and value will be "BD" and will taken from the options of the select field. and for non select field we will get the value for both name and value field
                * I only need the json nothing else the result start with "{" and end with "}"
                `)
          .then((response) => {
            const cleanedResponse = response
              .replace(/^```json\n/, "") // Remove the opening ```json
              .replace(/\n```$/, "") // Remove the closing ```
              .replace(/```$/, "") // Remove any trailing backticks
              .replaceAll("`", ""); // Remove any remaining backticks
            console.log("Cleaned Response:", cleanedResponse);

            try {
              const parsedResponse = JSON.parse(cleanedResponse);

              const filteredData = inputList
                .map((item) => {
                  const key = item.id;
                  const value = parsedResponse[key.replaceAll(" ", "")] || null;
                  return { ...item, value: value };
                })
                .filter((item) => item.value !== null);

              addedValueToElements(filteredData);
              console.log(
                "Response from Gemini (parsed object):",
                filteredData
              );
            } catch (parseError) {
              console.error("Error parsing JSON:", parseError);
            }
          })
          .catch((error) => {
            console.error("Error calling Gemini:", error);
          });
      });
    }, 8000);

    console.log(
      "%cname: v-01",
      "background: black;border: 2px solid green;color: white;display: block;text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);text-align: center;font-weight: bold;padding : 10px;margin : 10px"
    );
    console.log("name: v-01");
  }

  waitForElem(
    'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])',
    mainJs
  );
})();
