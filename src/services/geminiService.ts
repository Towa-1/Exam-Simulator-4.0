import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "../types";

const getApiConfig = () => {
  const provider = localStorage.getItem("emagyne_api_provider") || "gemini";
  const key = localStorage.getItem("emagyne_api_key") || (process.env as any).GEMINI_API_KEY || "";
  const customUrl = localStorage.getItem("emagyne_custom_url") || "";
  const customModel = localStorage.getItem("emagyne_custom_model") || "";

  return { provider, key, customUrl, customModel };
};

export async function parseQuestions(rawText: string): Promise<Question[]> {
  const { provider, key, customUrl, customModel } = getApiConfig();

  if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
    throw new Error("MISSING_API_KEY");
  }

  const prompt = `Parse the following text into a structured JSON array of exam questions.
  The input might be in a 5-column pipe format: Type | Question | Options/Unit | Answer | Explanation
  Or it might be raw unstructured text.
  
  Rules:
  - Type: 'MCQ' or 'NUM'.
  - Question: The question text (can include LaTeX).
  - Options: For MCQ, an array of strings. For NUM, null.
  - Unit: For NUM, the unit string (e.g., 'kg', 'm/s'). For MCQ, null.
  - Answer: The correct answer (string).
  - Explanation: Detailed explanation (can include LaTeX).
  
  Input Text:
  ${rawText}`;

  if (provider === "openai" || provider === "deepseek" || provider === "custom") {
    let url = "";
    let model = "";

    if (provider === "openai") {
      url = "/openai-api/v1/chat/completions";
      model = "gpt-4o-mini";
    } else if (provider === "deepseek") {
      url = "/deepseek-api/chat/completions";
      model = "deepseek-chat";
    } else {
      url = `${customUrl.replace(/\/$/, "")}/chat/completions`;
      model = customModel || "gpt-4o-mini";
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that parses exam questions. You must respond with a JSON object containing a 'questions' array. Each question in the array must have: id (string), type ('MCQ' or 'NUM'), question (string), options (array of strings, or null), unit (string, or null), answer (string), explanation (string)."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        // Use JSON Schema for OpenAI, and JSON Mode for DeepSeek/Custom
        response_format: provider === "openai" 
          ? {
              type: "json_schema",
              json_schema: {
                name: "exam_questions",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    questions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          type: { type: "string", enum: ["MCQ", "NUM"] },
                          question: { type: "string" },
                          options: { 
                            type: ["array", "null"], 
                            items: { type: "string" } 
                          },
                          unit: { type: ["string", "null"] },
                          answer: { type: "string" },
                          explanation: { type: "string" }
                        },
                        required: ["id", "type", "question", "options", "unit", "answer", "explanation"],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ["questions"],
                  additionalProperties: false
                }
              }
            }
          : { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `HTTP error ${response.status}`;
      throw new Error(`API Error: ${errMsg}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty response from AI provider");

    try {
      const parsed = JSON.parse(content);
      const questionsList = parsed.questions || parsed;
      if (!Array.isArray(questionsList)) throw new Error("Response is not an array");

      return questionsList.map((q: any, idx: number) => ({
        ...q,
        id: q.id || `q-${Date.now()}-${idx}`,
        options: q.options === null ? undefined : q.options,
        unit: q.unit === null ? undefined : q.unit,
      }));
    } catch (e) {
      console.error("Failed to parse AI response", e);
      throw new Error("The AI response was not in the correct format. Please try again.");
    }
  } else {
    // Gemini
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['MCQ', 'NUM'] },
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              unit: { type: Type.STRING },
              answer: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: ['id', 'type', 'question', 'answer', 'explanation'],
          },
        },
      },
    });

    try {
      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      
      const parsed = JSON.parse(text);
      return parsed.map((q: any, idx: number) => ({
        ...q,
        id: q.id || `q-${Date.now()}-${idx}`
      }));
    } catch (e) {
      console.error("Failed to parse Gemini response", e);
      throw new Error("The AI response was not in the correct format. Please try again.");
    }
  }
}
