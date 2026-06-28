import type { Agent } from "@prisma/client";
import { generateText, isStepCount } from "ai";
import type { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import type { AgentToolsConfig } from "../types.js";
import { getRecentActions, recordAction } from "./actions.js";
import { resolveLanguageModel } from "./modelProvider.js";
import { buildMessages } from "./prompt.js";
import { retrieveRagContext } from "./rag.js";
import { resolveSession, updateSessionMemory } from "./sessions.js";
import { createAgentTools } from "./tools.js";
import { resolveVisitor } from "./visitors.js";

const platformRules = [
  "You are running inside a public client demo platform.",
  "All tools are mock tools. Never claim that a real booking, payment, delivery, message, or external action occurred.",
  "Only use tools listed in the available tools section.",
  "Use retrieved RAG documents as business rules. If RAG context is missing, ask a clarifying question instead of inventing policy."
].join("\n");

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
  const ragHits = await retrieveRagContext(agentKey, agent.modelProvider, ragQuery);

  await recordAction({
    sessionId: session.id,
    agentKey,
    eventType: "rag_lookup",
    input: { query: ragQuery },
    output: { documents: ragHits.map(({ id, title, category, score }) => ({ id, title, category, score })) }
  });

  const toolsConfig = parseToolsConfig(agent);
  const tools = createAgentTools(toolsConfig.allowedTools, {
    sessionId: session.id,
    agentKey,
    recordAction
  });

  const promptMessages = buildMessages({
      platformRules,
      systemPrompt: agent.systemPrompt,
      summary: session.summary ?? "",
      recentActions,
      ragHits,
      currentMessage: message,
      toolNames: Object.keys(tools)
    });
  const instructions = promptMessages.find((promptMessage) => promptMessage.role === "system")?.content;
  const messages = promptMessages.filter((promptMessage) => promptMessage.role !== "system");

  const result = await generateText({
    model: resolveLanguageModel(agent.modelProvider, agent.modelName),
    instructions,
    messages,
    tools,
    stopWhen: isStepCount(4),
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

function parseToolsConfig(agent: Agent): AgentToolsConfig {
  const raw = agent.toolsConfig as Partial<AgentToolsConfig>;
  return { allowedTools: Array.isArray(raw.allowedTools) ? raw.allowedTools : [] };
}
