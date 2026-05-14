import OpenAI from "openai";

const baseURL = process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL;
const apiKey = process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY;

export const openrouter: OpenAI | null =
  baseURL && apiKey ? new OpenAI({ baseURL, apiKey }) : null;
