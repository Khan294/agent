import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import type { RagHit } from "../types.js";
import { env } from "./env.js";

type LexicalDoc = {
  id: string;
  title: string;
  category: string;
  content: string;
};

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

export function rankDocsLexically(docs: LexicalDoc[], query: string, take: number): RagHit[] {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((term) => term.length > 3)
    .slice(0, 8);

  return docs
    .map((doc) => {
      const haystack = `${doc.title} ${doc.category} ${doc.content}`.toLowerCase();
      const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
      return {
        id: doc.id,
        title: doc.title,
        category: doc.category,
        content: doc.content,
        score
      };
    })
    .filter((doc) => doc.score > 0)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, take);
}

export function formatRagContext(hits: RagHit[]) {
  if (!hits.length) {
    return "No matching RAG documents were found. Ask a clarifying question if policy details are required.";
  }

  return hits
    .map((hit, index) => {
      return `Document ${index + 1}: ${hit.title}\nCategory: ${hit.category}\n${hit.content}`;
    })
    .join("\n\n");
}
