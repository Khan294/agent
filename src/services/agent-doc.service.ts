import { prisma } from "../helpers/prisma.js";

export async function findAgentDocsForLexicalSearch(agentKey: string) {
  return prisma.agentDoc.findMany({
    where: { agentKey },
    take: 30,
    orderBy: { createdAt: "asc" }
  });
}

export async function findNearestAgentDocs(agentKey: string, vector: string, take: number) {
  return prisma.$queryRawUnsafe<Array<{ id: string; title: string; category: string; content: string; score?: number }>>(
    `
    SELECT id::text, title, category, content, 1 - (embedding <=> $1::vector) AS score
    FROM agent_docs
    WHERE agent_key = $2 AND embedding IS NOT NULL
    ORDER BY embedding <=> $1::vector
    LIMIT $3
    `,
    vector,
    agentKey,
    take
  );
}
