import type { Visitor } from "@prisma/client";
import { prisma } from "../helpers/prisma.js";

export async function resolveSession(visitor: Visitor, agentKey: string) {
  const existing = await prisma.agentSession.findFirst({
    where: {
      visitorId: visitor.id,
      agentKey,
      status: "active"
    },
    orderBy: { updatedAt: "desc" }
  });

  if (existing) {
    return existing;
  }

  return prisma.agentSession.create({
    data: {
      visitorId: visitor.id,
      agentKey,
      status: "active",
      summary: "",
      state: {}
    }
  });
}

export async function updateSessionMemory(sessionId: string, currentSummary: string, newFacts: string[]) {
  const merged = [currentSummary, ...newFacts]
    .filter(Boolean)
    .join("\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-12)
    .join("\n");

  return prisma.agentSession.update({
    where: { id: sessionId },
    data: { summary: merged || currentSummary || "" }
  });
}
