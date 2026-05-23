import { GoogleGenAI } from "@google/genai";

const proxyBaseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
const proxyApiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
const directApiKey = process.env.GEMINI_API_KEY;

function makeDefaultClient(): GoogleGenAI | null {
  if (proxyBaseUrl) {
    return new GoogleGenAI({
      apiKey: proxyApiKey ?? "replit-managed",
      httpOptions: { apiVersion: "", baseUrl: proxyBaseUrl },
    });
  }
  if (directApiKey) {
    return new GoogleGenAI({ apiKey: directApiKey });
  }
  return null;
}

const _ai = makeDefaultClient();

export const ai: GoogleGenAI = new Proxy({} as GoogleGenAI, {
  get(_target, prop) {
    if (!_ai) {
      throw new Error(
        "Gemini AI is not configured. Set either:\n" +
        "  - AI_INTEGRATIONS_GEMINI_BASE_URL + AI_INTEGRATIONS_GEMINI_API_KEY (Replit AI integration)\n" +
        "  - GEMINI_API_KEY (your own Google Gemini API key)",
      );
    }
    const value = (_ai as any)[prop];
    return typeof value === "function" ? value.bind(_ai) : value;
  },
});

export function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

export type { GoogleGenAI };
