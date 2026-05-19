import { GoogleGenAI, Modality } from "@google/genai";

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

const imageAi = proxyBaseUrl
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

export { imageAi as ai };

export async function generateImage(
  prompt: string
): Promise<{ b64_json: string; mimeType: string }> {
  const response = await imageAi.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
  });

  const candidate = response.candidates?.[0];
  const imagePart = candidate?.content?.parts?.find(
    (part: { inlineData?: { data?: string; mimeType?: string } }) => part.inlineData
  );

  if (!imagePart?.inlineData?.data) {
    throw new Error("No image data in response");
  }

  return {
    b64_json: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || "image/png",
  };
}
