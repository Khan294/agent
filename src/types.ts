import type { Agent, AgentAction, AgentSession } from "@prisma/client";

export type ToolResult = {
  name: string;
  input: Record<string, unknown>;
  output: unknown;
  status: "success" | "failed" | "skipped";
  latencyMs: number;
};

export type FrontendConfig = {
  heading: string;
  subheading: string;
  theme: {
    primary: string;
    background: string;
    surface: string;
    text: string;
  };
  starterPrompts: string[];
  placeholder: string;
};

export type RagHit = {
  id: string;
  title: string;
  category: string;
  content: string;
  score?: number;
};

export type ChatTurnContext = {
  agent: Agent;
  session: AgentSession;
  summary: string;
  recentActions: AgentAction[];
  ragHits: RagHit[];
};
