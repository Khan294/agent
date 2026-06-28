import { openai } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { env } from "../config/env.js";

const ollama = createOpenAICompatible({
  name: "ollama",
  baseURL: `${env.OLLAMA_BASE_URL}/v1`,
  apiKey: "ollama"
});

export function resolveLanguageModel(provider: string, modelName: string): LanguageModel {
  if (provider === "openai") {
    return openai(modelName);
  }

  return ollama.chatModel(modelName);
}
