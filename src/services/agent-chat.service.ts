import { prisma } from "../helpers/prisma.js";
import type { Request, Response } from "express";
import { runAgentLoop } from "../helpers/agent-runner.js";
import { resolveLanguageModel } from "../helpers/model-provider.js";
import { embedText, rankDocsLexically, toVectorLiteral } from "../helpers/rag.js";
import { getRecentActions, recordAction } from "./agent-action.service.js";
import { findAgentDocsForLexicalSearch, findNearestAgentDocs } from "./agent-doc.service.js";
import { resolveSession, updateSessionMemory } from "./agent-session.service.js";
import { createAgentTools } from "./agent-tool.service.js";
import { resolveVisitor } from "./visitor.service.js";

const platformRules = [
  "You are running inside a public client demo platform.",
  "All tools are mock tools. Never claim that a real booking, payment, delivery, message, or external action occurred.",
  "Only use tools listed in the available tools section.",
  "Use retrieved RAG documents as business rules. If RAG context is missing, ask a clarifying question instead of inventing policy."
].join("\n");

const ragTopK = 4;

export async function runChatTurn(req: Request, res: Response, agentKey: string, message: string) {
  const visitor = await resolveVisitor(req, res);
  const agent = await prisma.agent.findUnique({ where: { agentKey } });

  if (!agent || agent.status !== "active") {
    return { statusCode: 404, body: { error: `Agent not found or inactive: ${agentKey}` } };
  }

  const session = await resolveSession(visitor, agentKey);

  await recordAction({
    sessionId: session.id,
    agentKey,
    eventType: "user_message",
    input: { message }
  });

  const recentActions = await getRecentActions(session.id);
  const ragQuery = [session.summary, message].filter(Boolean).join("\n");
  const embedding = await embedText(agent.modelProvider, ragQuery).catch(() => null);
  const vectorHits = embedding?.length ? await findNearestAgentDocs(agentKey, toVectorLiteral(embedding), ragTopK) : [];
  const lexicalDocs = vectorHits.length ? [] : await findAgentDocsForLexicalSearch(agentKey);
  const ragHits = vectorHits.length ? vectorHits : rankDocsLexically(lexicalDocs, ragQuery, ragTopK);

  await recordAction({
    sessionId: session.id,
    agentKey,
    eventType: "rag_lookup",
    input: { query: ragQuery },
    output: { documents: ragHits.map(({ id, title, category, score }) => ({ id, title, category, score })) }
  });

  const agentTools = await prisma.agentTool.findMany({
    where: { agentKey, enabled: true },
    orderBy: { toolKey: "asc" }
  });
  const tools = createAgentTools(agentTools, {
    sessionId: session.id,
    agentKey,
    recordAction
  });

  const result = await runAgentLoop({
    model: resolveLanguageModel(agent.modelProvider, agent.modelName),
    platformRules,
    systemPrompt: agent.systemPrompt,
    summary: session.summary ?? "",
    recentActions,
    ragHits,
    currentMessage: message,
    tools,
    temperature: Number(agent.temperature),
    maxOutputTokens: agent.maxTokens ?? 800
  });

  const toolResults = await result.toolResults;

  await recordAction({
    sessionId: session.id,
    agentKey,
    eventType: "assistant_message",
    output: { reply: result.text },
    metadata: {
      modelProvider: agent.modelProvider,
      modelName: agent.modelName,
      finishReason: result.finishReason,
      usage: await result.usage
    }
  });

  await updateSessionMemory(session.id, session.summary ?? "", [
    `User said: ${message}`,
    `Assistant replied: ${result.text}`
  ]);

  return {
    statusCode: 200,
    body: {
      reply: result.text,
      sessionId: session.id,
      actions: toolResults.map((toolResult) => ({
        type: "tool_result",
        name: "toolName" in toolResult ? toolResult.toolName : "tool",
        status: "success",
        output: "output" in toolResult ? toolResult.output : undefined
      }))
    }
  };
}
