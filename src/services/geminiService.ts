import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "../types";

const getApiConfig = () => {
  const provider = localStorage.getItem("emagyne_api_provider") || "gemini";
  const key = localStorage.getItem("emagyne_api_key") || (process.env as any).GEMINI_API_KEY || "";
  const customUrl = localStorage.getItem("emagyne_custom_url") || "";
  const customModel = localStorage.getItem("emagyne_custom_model") || "";

  return { provider, key, customUrl, customModel };
};

const getChatApiConfig = () => {
  const provider = localStorage.getItem("emagyne_chat_provider") || localStorage.getItem("emagyne_api_provider") || "gemini";
  const key = localStorage.getItem("emagyne_chat_api_key") || localStorage.getItem("emagyne_api_key") || (process.env as any).GEMINI_API_KEY || "";
  const customUrl = localStorage.getItem("emagyne_chat_custom_url") || localStorage.getItem("emagyne_chat_custom_url") || "";
  const customModel = localStorage.getItem("emagyne_chat_custom_model") || localStorage.getItem("emagyne_chat_custom_model") || "";

  return { provider, key, customUrl, customModel };
};


export async function parseQuestions(rawText: string): Promise<Question[]> {
  const { provider, key, customUrl, customModel } = getApiConfig();

  if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
    throw new Error("MISSING_API_KEY");
  }

  const prompt = `You are an expert exam parser. Your job is to convert raw, unstructured exam questions (e.g., copy-pasted text from documents, PDFs, exams, or books) into a structured JSON array matching the Question type definition:

interface Question {
  id: string; // Generate a unique string id (e.g. q-1, q-2, etc.)
  type: 'MCQ' | 'NUM'; // MCQ for Multiple Choice questions, NUM for numerical/open fill-in-the-blank answers
  question: string; // The text of the question. You MUST style all code snippets, variables, keywords, functions, numbers, code examples, or syntax keywords with backticks (\`code\`) so they render as highlighted code pills (e.g., \`1234567.89\`, \`f"{n:,.1f}"\`, \`print()\`).
  options?: string[]; // For MCQ: An array of options (DO NOT include option letter prefixes like "A. ", "B. ", "a) ", "1. ", just the option text itself). Wrap code snippets, numbers, or code variables inside options with backticks (\`code\`). For NUM: omit or set to null.
  unit?: string; // For NUM: The unit string if applicable (e.g., "kg", "m/s", "pixels"). For MCQ: omit or set to null.
  answer: string; // The correct answer text. For MCQ, this must exactly match one of the values in the 'options' array. For NUM, the correct numerical value.
  explanation: string; // A detailed explanation of why the answer is correct. Wrap code snippets, variables, numbers, and code blocks in the explanation with backticks (\`code\`).
}

Instructions:
1. **Unstructured Input**: Read the user's unstructured input text, identify each question, its options, correct answer, and explanation.
2. **Formatting Code/Syntax**: You MUST identify code elements, programming syntax, SQL queries, console commands, variables (like x, n, total), keywords, function names, class names, numbers, or outputs in the question, options, and explanation and wrap them in backticks (e.g. \`f"{n:,.1f}"\`). This is crucial for rendering the code elements inside the app beautifully highlighted.
3. **LaTeX**: If the question contains mathematical formulas (like integrals, derivatives, greek letters, fractions), keep them inside LaTeX delimiters (e.g., $x^2$, $\\pi$). Do not mix LaTeX math mode and backticks for the same term.
4. **Answer Matching**: Ensure that for MCQ, the 'answer' field matches one of the values in the 'options' array exactly (including the backticks if that option contains them).

Input text to parse:
${rawText}`;

  if (provider === "openai" || provider === "deepseek" || provider === "openrouter" || provider === "custom") {
    let url = "";
    let model = "";

    if (provider === "openai") {
      url = "/openai-api/v1/chat/completions";
      model = "gpt-4o-mini";
    } else if (provider === "deepseek") {
      url = "/deepseek-api/chat/completions";
      model = "deepseek-chat";
    } else if (provider === "openrouter") {
      url = "https://openrouter.ai/api/v1/chat/completions";
      model = customModel || "google/gemini-2.5-flash:free";
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

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export async function generateChatResponse(messages: ChatMessage[], systemInstruction?: string): Promise<string> {
  const { provider, key, customUrl, customModel } = getChatApiConfig();

  if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
    throw new Error("MISSING_API_KEY");
  }

  if (provider === "openai" || provider === "deepseek" || provider === "openrouter" || provider === "custom") {
    let url = "";
    let model = "";

    if (provider === "openai") {
      url = "/openai-api/v1/chat/completions";
      model = "gpt-4o-mini";
    } else if (provider === "deepseek") {
      url = "/deepseek-api/chat/completions";
      model = "deepseek-chat";
    } else if (provider === "openrouter") {
      url = "https://openrouter.ai/api/v1/chat/completions";
      model = customModel || "google/gemini-2.5-flash:free";
    } else {
      url = `${customUrl.replace(/\/$/, "")}/chat/completions`;
      model = customModel || "gpt-4o-mini";
    }

    const apiMessages = [];
    if (systemInstruction) {
      apiMessages.push({ role: "system", content: systemInstruction });
    }
    for (const msg of messages) {
      apiMessages.push({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.content
      });
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: model,
        messages: apiMessages
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
    return content;
  } else {
    // Gemini
    const ai = new GoogleGenAI({ apiKey: key });
    const contents = messages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: systemInstruction ? {
        systemInstruction: systemInstruction
      } : undefined
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    return text;
  }
}

