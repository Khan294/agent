import type { AgentTool } from "@prisma/client";
import { jsonSchema, tool, type ToolSet } from "ai";
import type { ToolResult } from "../types.js";

type RecordAction = (input: {
  sessionId: string;
  agentKey: string;
  eventType: string;
  actionName?: string;
  input?: unknown;
  output?: unknown;
  status?: string;
  metadata?: unknown;
}) => Promise<unknown>;

type ToolRuntime = {
  sessionId: string;
  agentKey: string;
  recordAction: RecordAction;
};

type AgentToolRow = Pick<AgentTool, "toolKey" | "description" | "inputSchema" | "mockResponse">;

export function createAgentTools(agentTools: AgentToolRow[], runtime: ToolRuntime): ToolSet {
  const entries = agentTools.map((agentTool) => {
    return [
      agentTool.toolKey,
      tool({
        description: agentTool.description,
        inputSchema: jsonSchema(agentTool.inputSchema as Record<string, unknown>),
        execute: async (input: unknown) => {
          await runtime.recordAction({
            sessionId: runtime.sessionId,
            agentKey: runtime.agentKey,
            eventType: "tool_call",
            actionName: agentTool.toolKey,
            input
          });

          const result = await runMockTool(agentTool, input as Record<string, unknown>);

          await runtime.recordAction({
            sessionId: runtime.sessionId,
            agentKey: runtime.agentKey,
            eventType: "tool_result",
            actionName: result.name,
            input: result.input,
            output: result.output,
            status: result.status,
            metadata: { latencyMs: result.latencyMs, mock: true }
          });

          return result.output;
        }
      }) as ToolSet[string]
    ] as const;
  });

  return Object.fromEntries(entries) as ToolSet;
}

async function runMockTool(agentTool: AgentToolRow, input: Record<string, unknown>): Promise<ToolResult> {
  const startedAt = Date.now();

  return {
    name: agentTool.toolKey,
    input,
    output: agentTool.mockResponse,
    status: "success",
    latencyMs: Date.now() - startedAt
  };
}
