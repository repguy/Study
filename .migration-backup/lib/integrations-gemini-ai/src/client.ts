import { GoogleGenAI } from "@google/genai";

const proxyBaseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
const proxyApiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
const directApiKey = process.env.GEMINI_API_KEY;

if (!proxyBaseUrl && !directApiKey) {
  throw new Error(
    "Gemini AI is not configured. Set either:\n" +
    "  - AI_INTEGRATIONS_GEMINI_BASE_URL + AI_INTEGRATIONS_GEMINI_API_KEY (Replit AI integration)\n" +
    "  - GEMINI_API_KEY (your own Google Gemini API key)",
  );
}

export const ai = proxyBaseUrl
  ? new GoogleGenAI({
      apiKey: proxyApiKey ?? "replit-managed",
      httpOptions: {
        apiVersion: "",
        baseUrl: proxyBaseUrl,
      },
    })
  : new GoogleGenAI({
      apiKey: directApiKey!,
    });

export function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

export type { GoogleGenAI };
