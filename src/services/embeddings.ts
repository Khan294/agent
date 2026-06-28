import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { env } from "../config/env.js";

export async function embedText(provider: string, text: string): Promise<number[] | null> {
  if (provider === "openai") {
    if (!env.OPENAI_API_KEY) {
      return null;
    }

    const response = await embed({
      model: openai.embeddingModel(env.OPENAI_EMBEDDING_MODEL),
      value: text
    });
    return response.embedding;
  }

  const response = await fetch(`${env.OLLAMA_BASE_URL}/api/embeddings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: env.OLLAMA_EMBEDDING_MODEL,
      prompt: text
    })
  });

  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as { embedding?: number[] };
  return body.embedding ?? null;
}

export function toVectorLiteral(values: number[]) {
  return `[${values.join(",")}]`;
}
