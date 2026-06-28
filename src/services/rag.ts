import type { RagHit } from "../types.js";
import { prisma } from "../db/prisma.js";
import { embedText, toVectorLiteral } from "./embeddings.js";

const topK = 4;

export async function retrieveRagContext(agentKey: string, provider: string, query: string): Promise<RagHit[]> {
  const embedding = await embedText(provider, query).catch(() => null);

  if (embedding?.length) {
    const vector = toVectorLiteral(embedding);
    const rows = await prisma.$queryRawUnsafe<RagHit[]>(
      `
      SELECT id::text, title, category, content, 1 - (embedding <=> $1::vector) AS score
      FROM rag_documents
      WHERE agent_key = $2 AND embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $3
      `,
      vector,
      agentKey,
      topK
    );

    if (rows.length) {
      return rows;
    }
  }

  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((term) => term.length > 3)
    .slice(0, 8);

  const docs = await prisma.ragDocument.findMany({
    where: { agentKey },
    take: 30,
    orderBy: { createdAt: "asc" }
  });

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
    .slice(0, topK);
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
