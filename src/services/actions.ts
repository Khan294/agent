import { prisma } from "../db/prisma.js";

type RecordActionInput = {
  sessionId: string;
  agentKey: string;
  eventType: string;
  actionName?: string;
  input?: unknown;
  output?: unknown;
  status?: string;
  metadata?: unknown;
};

export async function recordAction(input: RecordActionInput) {
  return prisma.agentAction.create({
    data: {
      sessionId: input.sessionId,
      agentKey: input.agentKey,
      eventType: input.eventType,
      actionName: input.actionName,
      input: input.input === undefined ? undefined : JSON.parse(JSON.stringify(input.input)),
      output: input.output === undefined ? undefined : JSON.parse(JSON.stringify(input.output)),
      status: input.status ?? "success",
      metadata: input.metadata === undefined ? undefined : JSON.parse(JSON.stringify(input.metadata))
    }
  });
}

export async function getRecentActions(sessionId: string, take = 20) {
  const actions = await prisma.agentAction.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take
  });

  return actions.reverse();
}
