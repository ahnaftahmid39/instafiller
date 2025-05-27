const GEMINI_API_KEY = "AIzaSyDqkZDUaK1NjsaNy45PPvhQViw-cdbZcNg"; // Replace with your actual API key

if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
  console.error(
    "Gemini API Key is not set in background.js! Please replace 'YOUR_GEMINI_API_KEY' with your actual key."
  );
}

export async function performOcrWithGemini(base64Image, mimeType) {
  const contents = [
    {
      parts: [
        {
          text: "Extract all text from this image as accurately as possible. Extracted text will be used for filling forms later. Provide only the extracted text, no additional comments or formatting. If there are key-value pairs or structured data, try to present them clearly on separate lines or in a parsable format.",
        },
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image,
          },
        },
      ],
    },
  ];

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Gemini OCR API error: ${response.status} ${
          response.statusText
        } - ${JSON.stringify(errorData)}`
      );
    }

    const result = await response.json();
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      return result.candidates[0].content.parts[0].text;
    }
    return null;
  } catch (error) {
    console.error("Error performing OCR with Gemini:", error);
    throw error;
  }
}

export async function mapOcrToGeneralFieldsWithGemini(ocrText) {
  const prompt = `Extract key-value pairs or structured data from the following OCR text as a JSON object. Identify common field names like 'name', 'firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'zip', 'country', 'date', 'amount', 'total', 'invoiceNumber', 'company', etc.

OCR Text:
---
${ocrText}
---

Respond with only a JSON object, no additional text or explanation. Example format:
{"name": "John Doe", "email": "john@example.com", "phone": "123-456-7890"}`;

  return await callGeminiForMapping(prompt);
}

export async function mapOcrToFormFieldsWithGemini(ocrText, html, inputList) {
  console.log(html, inputList);
  // const fieldListSection = formFieldList
  //   ? `Available form fields on the webpage:\n---\n${formFieldList}\n---`
  //   : "";

  // const mappingInstruction = formFieldList
  //   ? `For each relevant piece of information in the OCR text, identify the best matching form field from the provided list. Respond with a JSON object where keys are the identified form field names (exactly as they appear in the provided list) and values are the corresponding extracted data from the OCR text.`
  //   : `Extract key-value pairs or structured data from the OCR text as a JSON object, identifying common field names.`;

  const prompt = `
                I have three pieces of data:

                1.  **Extracted form fields from a website (as a JSON array of objects, each with 'name' and 'id'):**
                    ${JSON.stringify(
                      inputList.map((item) => ({
                        name: item.label,
                        id: item.id,
                        type: item.type,
                        tag: item.tag,
                      }))
                    )}
                
                2.  **JSON data extracted from an OCR'd document (as a JSON string):**
                    ${JSON.stringify(ocrText)}

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
                `;

  console.log("Mapping prompt:", prompt);
  return await callGeminiForMapping(prompt);
}

export async function callGeminiForMapping(prompt) {
  const contents = [{ role: "user", parts: [{ text: prompt }] }];

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Gemini Mapping API error: ${response.status} ${
          response.statusText
        } - ${JSON.stringify(errorData)}`
      );
    }

    const result = await response.json();
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      const jsonString = result.candidates[0].content.parts[0].text;
      try {
        const cleanedJsonString = jsonString
          .replace(/```json\n|```/g, "")
          .trim();
        return JSON.parse(cleanedJsonString);
      } catch (jsonError) {
        console.warn(
          "Failed to parse JSON from Gemini mapping:",
          jsonString,
          jsonError
        );
        return {};
      }
    }
    return {};
  } catch (error) {
    console.error("Error mapping with Gemini:", error);
    throw error;
  }
}
