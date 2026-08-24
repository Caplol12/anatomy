import type { Organ } from "../i18n/merge";
import type { ChatMessage, GeminiModelOption } from "./gemini-storage";

export interface StreamChatParams {
  apiKey: string;
  model: GeminiModelOption;
  messages: ChatMessage[];
  currentOrgan?: Organ;
  localeCode: string;
  onChunk: (chunk: string) => void;
  signal?: AbortSignal;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Validates a user-provided Google Gemini API key by making a lightweight models list call.
 */
export async function validateGeminiApiKey(apiKey: string): Promise<ValidationResult> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { valid: false, error: "کلید نمی‌تواند خالی باشد / API Key cannot be empty" };
  }

  try {
    const res = await fetch(`${GEMINI_API_BASE}/models?key=${encodeURIComponent(trimmed)}&pageSize=1`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      return { valid: true };
    }

    const data = await res.json().catch(() => null);
    const apiError = data?.error?.message || `HTTP ${res.status}: ${res.statusText}`;

    if (res.status === 400 || res.status === 403) {
      return {
        valid: false,
        error: "کلید وارد شده نامعتبر است یا دسترسی به آن مسدود شده است. / Invalid API key or permission denied.",
      };
    }

    if (res.status === 429) {
      return {
        valid: false,
        error: "محدودیت تعداد درخواست (Rate Limit) برای این کلید به پایان رسیده است. / Quota exceeded.",
      };
    }

    return { valid: false, error: apiError };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      valid: false,
      error: `خطا در اتصال به سرور گوگل (بررسی اینترنت یا تحریم/VPN): ${message}`,
    };
  }
}

/**
 * Constructs an anatomical and pedagogical system instruction for Gemini.
 */
function buildSystemInstruction(currentOrgan?: Organ, localeCode = "fa"): string {
  let contextProse = "";
  if (currentOrgan) {
    contextProse = `
CURRENTLY ACTIVE ORGAN IN 3D EXPLORER:
- Name: ${currentOrgan.name} (${currentOrgan.id})
- System: ${currentOrgan.system} (${currentOrgan.systemId})
- Primary Function: ${currentOrgan.function}
- Microscopic Tissue Structure: ${currentOrgan.tissue}
- Blood Supply / Vascularity: ${currentOrgan.bloodSupply}
- Location & Relations: ${currentOrgan.location}
- Dimensions & Weight: Size: ${currentOrgan.size}, Weight: ${currentOrgan.weight}
- Common Clinical Conditions: ${currentOrgan.conditions.join(", ")}
- Clinical/Medical Fact: ${currentOrgan.medical}
- Curiosity/Fun Fact: ${currentOrgan.funFact}
`;
  }

  return `You are "Digi Anatomy AI" (دستیار هوشمند دیجی آناتومی), an elite anatomy, physiology, and medical sciences educator embedded in an interactive 3D human anatomy atlas.

Role & Personality:
1. Provide accurate, clear, engaging, and scientifically rigorous explanations of human anatomy, physiology, histopathology, and clinical correlates.
2. Adapt your tone to be encouraging, structured, and easy to read.
3. Use Markdown formatting effectively: **bold** key anatomical terms, bullet points for lists, and neat headers.
4. When the user asks about the organ currently selected, leverage the provided organ details naturally.
5. If the user asks for a quiz, generate interactive questions with options (A, B, C, D) and explanations.
6. Always communicate primarily in the language corresponding to locale: "${localeCode}" (if "fa", answer in fluent, standard Persian; if "en", answer in English, etc.).
7. Safety: You are an educational tutor, not a primary diagnostic physician for personal medical emergencies. Include educational context.

${contextProse}`;
}

/**
 * Formats client ChatMessage history into the Gemini API contents array.
 */
function formatGeminiContents(messages: ChatMessage[]) {
  // Take up to last 15 messages to preserve context window cleanly
  const history = messages.slice(-15);
  return history.map((msg) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.text }],
  }));
}

/**
 * Streams chat responses directly from Google Gemini API.
 */
export async function streamGeminiChat({
  apiKey,
  model,
  messages,
  currentOrgan,
  localeCode,
  onChunk,
  signal,
}: StreamChatParams): Promise<string> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error("API Key is missing.");
  }

  const endpoint = `${GEMINI_API_BASE}/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(cleanKey)}`;

  const systemInstruction = buildSystemInstruction(currentOrgan, localeCode);
  const contents = formatGeminiContents(messages);

  const requestBody = {
    contents,
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    let errorDetail = "";
    try {
      const errJson = await response.json();
      errorDetail = errJson?.error?.message || response.statusText;
    } catch {
      errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    }

    if (response.status === 400 || response.status === 403) {
      throw new Error(`خطای کلید API: ${errorDetail}`);
    } else if (response.status === 429) {
      throw new Error("سقف سهمیه یا محدودیت نرخ درخواست Gemini شما تمام شده است (Rate Limit / Quota Exceeded).");
    } else {
      throw new Error(`خطای سرور گوگل (${response.status}): ${errorDetail}`);
    }
  }

  if (!response.body) {
    throw new Error("No response body received from Gemini API.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let accumulatedText = "";
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Keep the last incomplete fragment in the buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) continue; // SSE comment / ping

        if (trimmed.startsWith("data:")) {
          const jsonStr = trimmed.slice(5).trim();
          if (jsonStr === "[DONE]") continue;

          try {
            const data = JSON.parse(jsonStr);
            const candidate = data.candidates?.[0];
            const textPart = candidate?.content?.parts?.[0]?.text;
            if (textPart) {
              accumulatedText += textPart;
              onChunk(textPart);
            }
          } catch {
            // Incomplete JSON or malformed line, ignore
          }
        }
      }
    }
  } catch (err: unknown) {
    if (signal?.aborted) {
      return accumulatedText;
    }
    throw err;
  }

  return accumulatedText;
}
