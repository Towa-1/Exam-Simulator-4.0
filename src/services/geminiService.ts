import { Question } from "../types";

const sanitizeModel = (modelName: string | null): string => {
  if (!modelName || modelName.includes("gemini-2.5-flash") || modelName === "gemini-1.5-pro") {
    return "gemini-2.0-flash";
  }
  return modelName;
};

const getApiConfig = () => {
  const provider = localStorage.getItem("emagyne_api_provider") || "gemini";
  const key = localStorage.getItem("emagyne_api_key") || (process.env as any).GEMINI_API_KEY || "";
  const customUrl = localStorage.getItem("emagyne_custom_url") || "";
  const rawModel = localStorage.getItem("emagyne_custom_model") || localStorage.getItem("emagyne_gemini_model") || "gemini-2.0-flash";
  const customModel = sanitizeModel(rawModel);

  return { provider, key, customUrl, customModel };
};

const getChatApiConfig = () => {
  const provider = localStorage.getItem("emagyne_chat_provider") || localStorage.getItem("emagyne_api_provider") || "gemini";
  const key = localStorage.getItem("emagyne_chat_api_key") || localStorage.getItem("emagyne_api_key") || (process.env as any).GEMINI_API_KEY || "";
  const customUrl = localStorage.getItem("emagyne_chat_custom_url") || localStorage.getItem("emagyne_custom_url") || "";
  const rawModel = localStorage.getItem("emagyne_chat_custom_model") || localStorage.getItem("emagyne_custom_model") || localStorage.getItem("emagyne_gemini_model") || "gemini-2.0-flash";
  const customModel = sanitizeModel(rawModel);

  return { provider, key, customUrl, customModel };
};

function formatAiError(err: any): string {
  if (!err) return "An unknown error occurred while contacting the AI service.";
  const rawMsg = typeof err === "string" ? err : err.message || String(err);

  if (rawMsg.includes("API_KEY_SERVICE_BLOCKED")) {
    return "API Key Service Blocked: The Generative Language API is disabled or restricted on this Google Cloud project. Please visit Google AI Studio (aistudio.google.com), create a new unrestricted key, or enable the Generative Language API in Google Cloud Console.";
  }
  if (rawMsg.includes("UNAUTHENTICATED") || rawMsg.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED")) {
    return "Gemini API Authentication Error: Your API key could not be authenticated by Google. Please open Settings (Gear icon) and verify your key from Google AI Studio (aistudio.google.com).";
  }
  if (rawMsg.includes("NOT_FOUND") || rawMsg.includes("is not found for API version")) {
    return "Gemini API Model Access Error: Please verify that your API Key has access to Gemini models at aistudio.google.com or create a new key.";
  }
  if (rawMsg.includes("API_KEY_INVALID") || rawMsg.includes("API key not valid")) {
    return "Invalid API Key. Please click the Settings gear icon in the top right to configure a valid API Key.";
  }
  if (rawMsg.includes("RESOURCE_EXHAUSTED") || rawMsg.includes("429") || rawMsg.includes("quota")) {
    return "Quota or rate limit exceeded. Please wait a moment or try switching providers in Settings.";
  }

  try {
    const parsed = JSON.parse(rawMsg);
    if (parsed?.error?.message) {
      return parsed.error.message;
    }
  } catch (e) {
    // Not raw JSON
  }

  return rawMsg;
}

// Built-in offline client-side parser fallback
function parseLocally(rawText: string): Question[] {
  const blocks = rawText.split(/(?=\n(?:Q\d+[\.\:]?|\d+[\.\)]|\bQuestion\b\s*\d*[\.\:]?))/i).filter(b => b.trim().length > 0);
  const questions: Question[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!block.trim()) continue;

    const lines = block.split('\n');
    const questionLines: string[] = [];
    const options: string[] = [];
    let answer = '';
    let explanation = '';
    let isParsingOptions = false;
    let isParsingExplanation = false;

    for (let j = 0; j < lines.length; j++) {
      const line = lines[j];
      const trimmed = line.trim();
      if (!trimmed) {
        if (!isParsingOptions && questionLines.length > 0) {
          questionLines.push('');
        }
        continue;
      }

      if (/^[A-F][\.\)]\s*/i.test(trimmed)) {
        isParsingOptions = true;
        isParsingExplanation = false;
        let optText = trimmed.replace(/^[A-F][\.\)]\s*/i, '').trim();
        const optLetter = String.fromCharCode(65 + options.length);
        if (optText.toUpperCase().startsWith(`${optLetter} `)) {
          optText = optText.substring(2).trim();
        }
        options.push(optText);
      } else if (/^Answer:\s*/i.test(trimmed)) {
        isParsingOptions = true;
        isParsingExplanation = false;
        const rawAns = trimmed.replace(/^Answer:\s*/i, '').trim();
        if (/^[A-F]$/i.test(rawAns) && options.length > 0) {
          const idx = rawAns.toUpperCase().charCodeAt(0) - 65;
          answer = options[idx] || rawAns;
        } else {
          answer = rawAns;
        }
      } else if (/^Explanation:\s*/i.test(trimmed)) {
        isParsingOptions = true;
        isParsingExplanation = true;
        explanation = trimmed.replace(/^Explanation:\s*/i, '').trim();
      } else if (isParsingExplanation) {
        explanation += '\n' + line;
      } else if (!isParsingOptions) {
        questionLines.push(line);
      }
    }

    let fullQuestionText = questionLines.join('\n').trim();
    fullQuestionText = fullQuestionText.replace(/^(?:Q\d+[\.\:]?|\d+[\.\)]|\bQuestion\b\s*\d*[\.\:]?)\s*/i, '');

    if (!answer && options.length > 0) {
      answer = options[0];
    }

    questions.push({
      id: `q-local-${Date.now()}-${i}`,
      type: options.length > 0 ? 'MCQ' : 'NUM',
      question: fullQuestionText || `Question ${i + 1}`,
      options: options.length > 0 ? options : undefined,
      answer: answer || (options[0] || 'Option A'),
      explanation: explanation || 'Refer to exam materials for detailed breakdown.'
    });
  }

  return questions;
}

export async function parseQuestions(rawText: string, signal?: AbortSignal): Promise<Question[]> {
  const { provider, key, customUrl, customModel } = getApiConfig();

  // Try local client-side parsing first if no API key is set
  if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
    const local = parseLocally(rawText);
    if (local.length > 0) return local;
    throw new Error("MISSING_API_KEY");
  }

  if (signal?.aborted) {
    throw new DOMException("Operation cancelled by user", "AbortError");
  }

  const prompt = `You are an expert exam parser. Your job is to convert raw, unstructured exam questions (e.g., copy-pasted text from documents, PDFs, exams, or books) into a structured JSON array matching the Question type definition:

interface Question {
  id: string; // Generate a unique string id (e.g. q-1, q-2, etc.)
  type: 'MCQ' | 'NUM'; // MCQ for Multiple Choice questions, NUM for numerical/open fill-in-the-blank answers
  question: string; // The text of the question. CRITICAL: You MUST include all code blocks, function definitions, python/java/c++/sql code, and code examples verbatim in the 'question' string using markdown code blocks (e.g. \`\`\`python\ndef flow_rate(v, D=0.1, rho=1000):\n    return rho * v * D\n\`\`\`). Style inline variables/numbers with backticks (\`code\`). Keep math equations inside LaTeX delimiters ($...$).
  options?: string[]; // For MCQ: An array of options. Wrap code snippets/numbers with backticks (\`code\`).
  unit?: string; // For NUM: The unit string if applicable.
  answer: string; // The correct answer text. For MCQ, this must match one of the values in the 'options' array.
  explanation: string; // A detailed explanation of why the answer is correct. Wrap code snippets in backticks (\`code\`).
}

Instructions:
1. **Preserve Code Blocks**: If the input contains code blocks, functions, or multiline code snippets, you MUST include the full code block formatted with markdown triple backticks inside the 'question' string. NEVER omit, strip, or summarize code blocks!
2. **Respond with JSON**: Respond ONLY with a valid JSON array of Question objects. Do not include markdown code fences or conversational text outside the JSON.

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
      model = customModel || "google/gemini-2.0-flash-001";
    } else {
      url = `${customUrl.replace(/\/$/, "")}/chat/completions`;
      model = customModel || "gpt-4o-mini";
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        signal: signal,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that parses exam questions. You must respond with a JSON array."
            },
            {
              role: "user",
              content: prompt
            }
          ],
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
                            options: { type: ["array", "null"], items: { type: "string" } },
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
        throw new Error(formatAiError(errMsg));
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty response from AI provider");

      const parsed = JSON.parse(content);
      const questionsList = Array.isArray(parsed) ? parsed : parsed.questions || parsed;
      if (!Array.isArray(questionsList)) throw new Error("Response is not an array");

      return questionsList.map((q: any, idx: number) => ({
        ...q,
        id: q.id || `q-${Date.now()}-${idx}`,
        options: q.options === null ? undefined : q.options,
        unit: q.unit === null ? undefined : q.unit,
      }));
    } catch (err) {
      const local = parseLocally(rawText);
      if (local.length > 0) return local;
      throw err;
    }
  } else {
    // Direct native fetch to Google Gemini REST API
    const primaryModel = sanitizeModel(customModel) || "gemini-2.0-flash";
    const candidateModels = Array.from(new Set([
      primaryModel,
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-2.0-flash-lite"
    ])).filter(m => m && !m.includes("2.5-flash") && m !== "gemini-1.5-pro");

    let lastError: any = null;

    for (const modelName of candidateModels) {
      if (signal?.aborted) {
        throw new DOMException("Operation cancelled by user", "AbortError");
      }
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(key.trim())}`;
        const res = await fetch(url, {
          method: "POST",
          signal: signal,
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const msg = errData?.error?.message || `HTTP error ${res.status}`;
          throw new Error(msg);
        }

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Empty text response from Gemini API");

        // Clean markdown backticks if returned inside ```json ... ```
        const cleanText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(cleanText);
        const questionsList = Array.isArray(parsed) ? parsed : parsed.questions || parsed;
        if (!Array.isArray(questionsList)) throw new Error("Response is not an array");

        return questionsList.map((q: any, idx: number) => ({
          ...q,
          id: q.id || `q-${Date.now()}-${idx}`
        }));
      } catch (err: any) {
        lastError = err;
        console.warn(`Gemini model ${modelName} failed:`, err?.message || err);
      }
    }

    // Try local fallback parser before throwing error
    const localFallback = parseLocally(rawText);
    if (localFallback.length > 0) {
      return localFallback;
    }

    console.error("All Gemini model fallbacks failed", lastError);
    throw new Error(formatAiError(lastError));
  }
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export async function generateChatResponse(
  messages: ChatMessage[], 
  systemInstruction?: string,
  signal?: AbortSignal
): Promise<string> {
  const { provider, key, customUrl, customModel } = getChatApiConfig();

  if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
    throw new Error("MISSING_API_KEY");
  }

  if (signal?.aborted) {
    throw new DOMException("Operation cancelled by user", "AbortError");
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
      model = customModel || "google/gemini-2.0-flash-001";
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
      signal: signal,
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
      throw new Error(formatAiError(errMsg));
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty response from AI provider");
    return content;
  } else {
    // Native fetch for Gemini chat
    const primaryModel = sanitizeModel(customModel) || "gemini-2.0-flash";
    const candidateModels = Array.from(new Set([
      primaryModel,
      "gemini-2.0-flash",
      "gemini-1.5-flash"
    ])).filter(m => m && !m.includes("2.5-flash") && m !== "gemini-1.5-pro");

    let lastError: any = null;

    for (const modelName of candidateModels) {
      if (signal?.aborted) {
        throw new DOMException("Operation cancelled by user", "AbortError");
      }
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(key.trim())}`;
        const contentsPayload = messages.map(msg => ({
          role: msg.role === "model" ? "model" : "user",
          parts: [{ text: msg.content }]
        }));

        const res = await fetch(url, {
          method: "POST",
          signal: signal,
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: contentsPayload,
            systemInstruction: systemInstruction ? {
              parts: [{ text: systemInstruction }]
            } : undefined
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const msg = errData?.error?.message || `HTTP error ${res.status}`;
          throw new Error(msg);
        }

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Empty text response from Gemini API");
        return text;
      } catch (err: any) {
        lastError = err;
        console.warn(`Gemini chat model ${modelName} failed:`, err?.message || err);
      }
    }

    throw new Error(formatAiError(lastError));
  }
}
