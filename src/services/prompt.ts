import type { AgentAction } from "@prisma/client";
import type { RagHit } from "../types.js";
import { formatRagContext } from "./rag.js";

type PromptInput = {
  platformRules: string;
  systemPrompt: string;
  summary: string;
  recentActions: AgentAction[];
  ragHits: RagHit[];
  currentMessage: string;
  toolNames: string[];
};

export function buildMessages(input: PromptInput) {
  const recentHistory = input.recentActions
    .filter((action) => ["user_message", "assistant_message", "tool_result"].includes(action.eventType))
    .slice(-12)
    .map((action) => {
      return `${action.eventType}${action.actionName ? `:${action.actionName}` : ""}\ninput=${JSON.stringify(action.input)}\noutput=${JSON.stringify(action.output)}`;
    })
    .join("\n\n");

  return [
    {
      role: "system" as const,
      content: [
        input.platformRules,
        "",
        "Agent system prompt:",
        input.systemPrompt,
        "",
        "Available tools:",
        input.toolNames.length ? input.toolNames.map((name) => `- ${name}`).join("\n") : "No tools available.",
        "",
        "Use tools when an action is needed. If a required detail is missing, ask for it in plain language."
      ].join("\n")
    },
    {
      role: "user" as const,
      content: [
        "Session summary:",
        input.summary || "No durable session summary yet.",
        "",
        "Recent conversation and important actions:",
        recentHistory || "No previous events.",
        "",
        "Retrieved RAG context:",
        formatRagContext(input.ragHits),
        "",
        "Current user message:",
        input.currentMessage
      ].join("\n")
    }
  ];
}
