export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: number;
  organId?: string;
  organName?: string;
  isError?: boolean;
}

export type GeminiModelOption = "gemini-2.5-flash" | "gemini-1.5-flash" | "gemini-1.5-pro";

export const DEFAULT_GEMINI_MODEL: GeminiModelOption = "gemini-2.5-flash";

const API_KEY_STORAGE_KEY = "anatomy_gemini_api_key_v1";
const MODEL_STORAGE_KEY = "anatomy_gemini_model_v1";
const CHAT_HISTORY_STORAGE_KEY = "anatomy_chat_history_v1";

let cachedApiKeyRaw: string | null = null;
let cachedChatHistoryRaw: string | null = null;
let cachedChatHistory: ChatMessage[] = [];
const EMPTY_CHAT_HISTORY: ChatMessage[] = [];

// ================= API Key Store =================
export function subscribeApiKey(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("local-gemini-key-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("local-gemini-key-change", callback);
  };
}

export function getApiKeySnapshot(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem(API_KEY_STORAGE_KEY) || "";
    if (raw !== cachedApiKeyRaw) {
      cachedApiKeyRaw = raw;
    }
    return cachedApiKeyRaw;
  } catch {
    return "";
  }
}

export function getApiKeyServerSnapshot(): string {
  return "";
}

export function saveApiKey(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const trimmed = key.trim();
    localStorage.setItem(API_KEY_STORAGE_KEY, trimmed);
    cachedApiKeyRaw = trimmed;
    window.dispatchEvent(new Event("local-gemini-key-change"));
    return true;
  } catch {
    return false;
  }
}

export function removeApiKey(): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    cachedApiKeyRaw = "";
    window.dispatchEvent(new Event("local-gemini-key-change"));
    return true;
  } catch {
    return false;
  }
}

export function hasApiKey(): boolean {
  const key = getApiKeySnapshot();
  return Boolean(key && key.length > 5);
}

// ================= Model Selection Store =================
export function getSelectedModel(): GeminiModelOption {
  if (typeof window === "undefined") return DEFAULT_GEMINI_MODEL;
  try {
    const stored = localStorage.getItem(MODEL_STORAGE_KEY);
    if (stored === "gemini-2.5-flash" || stored === "gemini-1.5-flash" || stored === "gemini-1.5-pro") {
      return stored;
    }
    return DEFAULT_GEMINI_MODEL;
  } catch {
    return DEFAULT_GEMINI_MODEL;
  }
}

export function saveSelectedModel(model: GeminiModelOption): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MODEL_STORAGE_KEY, model);
  } catch {
    // Ignore storage errors
  }
}

// ================= Chat History Store =================
export function subscribeChatHistory(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("local-chat-history-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("local-chat-history-change", callback);
  };
}

export function getChatHistorySnapshot(): ChatMessage[] {
  if (typeof window === "undefined") return EMPTY_CHAT_HISTORY;
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY) || "[]";
    if (raw !== cachedChatHistoryRaw) {
      cachedChatHistoryRaw = raw;
      const parsed = JSON.parse(raw);
      cachedChatHistory = Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
    }
    return cachedChatHistory;
  } catch {
    return EMPTY_CHAT_HISTORY;
  }
}

export function getChatHistoryServerSnapshot(): ChatMessage[] {
  return EMPTY_CHAT_HISTORY;
}

export function saveChatHistory(messages: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    // Keep at most last 50 messages to prevent storage bloat
    const trimmed = messages.slice(-50);
    const raw = JSON.stringify(trimmed);
    localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, raw);
    cachedChatHistoryRaw = raw;
    cachedChatHistory = trimmed;
    window.dispatchEvent(new Event("local-chat-history-change"));
  } catch {
    // Storage quota might be reached
  }
}

export function clearChatHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
    cachedChatHistoryRaw = "[]";
    cachedChatHistory = [];
    window.dispatchEvent(new Event("local-chat-history-change"));
  } catch {
    // Ignore storage error
  }
}
