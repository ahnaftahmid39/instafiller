const getGeminiApiKey = async () => {
  const result = await chrome.storage.local.get("gemini_api_key");
  return result.gemini_api_key || null;
};

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
    const gemini_api_key = await getGeminiApiKey()
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${gemini_api_key}`;

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

export async function mapOcrToFormFieldsWithGemini(ocrText, filteredForm) {
  // const fieldListSection = formFieldList
  //   ? `Available form fields on the webpage:\n---\n${formFieldList}\n---`
  //   : "";

  // const mappingInstruction = formFieldList
  //   ? `For each relevant piece of information in the OCR text, identify the best matching form field from the provided list. Respond with a JSON object where keys are the identified form field names (exactly as they appear in the provided list) and values are the corresponding extracted data from the OCR text.`
  //   : `Extract key-value pairs or structured data from the OCR text as a JSON object, identifying common field names.`;

  const prompt = `I have the following OCR text from images:
---
${ocrText}
---

Your job is to map this OCR text to form fields on a webpage.
Here is the form's HTML string:

---
${filteredForm}
---

For each relevant piece of information in the OCR text, identify the best matching form field from the provided list. Respond with a JSON object where keys are the identified form field names (exactly as they appear in the provided list) and values are the corresponding extracted data from the OCR text. Sometimes name could be generated. For example, name='generated-name-1'. Do not mix name with labels. Do not change name attribute. Value could be space separated. For checkboxes value should be array of strings. Respond with only a PLAIN JSON string, No additional text or explanation. NO formatting. NO markdown blocks. Your response will be object of name and corresponding value pair. Example: {"name":"John Doe", "email":"john@gmail.com"}`;

  console.log("Mapping prompt:", prompt);
  return await callGeminiForMapping(prompt);
}

export async function callGeminiForMapping(prompt) {
  const contents = [{ role: "user", parts: [{ text: prompt }] }];

  try {
    const gemini_api_key = await getGeminiApiKey()

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${gemini_api_key}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.7 },
      }),
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
