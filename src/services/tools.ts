import { tool, type ToolSet } from "ai";
import { z } from "zod/v4";
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

const toolDefinitions = {
  check_availability: {
    description: "Checks mock appointment availability for a requested dental service and date.",
    inputSchema: z.object({
      service: z.string().optional(),
      preferredDate: z.string().optional(),
      preferredTime: z.string().optional()
    })
  },
  reserve_appointment: {
    description: "Creates a mock dentist appointment reservation.",
    inputSchema: z.object({
      service: z.string().optional(),
      date: z.string().optional(),
      time: z.string().optional(),
      patientName: z.string().optional()
    })
  },
  cancel_appointment: {
    description: "Cancels a mock dentist appointment reservation.",
    inputSchema: z.object({
      reservationId: z.string().optional()
    })
  },
  list_menu: {
    description: "Lists mock menu items for the food ordering demo.",
    inputSchema: z.object({
      category: z.string().optional()
    })
  },
  build_cart: {
    description: "Adds requested food items to a mock cart.",
    inputSchema: z.object({
      items: z.array(z.string()).optional()
    })
  },
  place_order: {
    description: "Places a mock food order.",
    inputSchema: z.object({
      items: z.array(z.string()).optional(),
      fulfillment: z.string().optional()
    })
  },
  check_order_status: {
    description: "Checks mock food order status.",
    inputSchema: z.object({
      orderId: z.string().optional()
    })
  }
} satisfies Record<string, { description: string; inputSchema: z.ZodType }>;

export function createAgentTools(allowedTools: string[], runtime: ToolRuntime): ToolSet {
  const entries = allowedTools
    .map((name) => {
      const definition = toolDefinitions[name as keyof typeof toolDefinitions];
      if (!definition) {
        return null;
      }

      return [
        name,
        tool({
          description: definition.description,
          inputSchema: definition.inputSchema as never,
          execute: async (input: unknown) => {
            await runtime.recordAction({
              sessionId: runtime.sessionId,
              agentKey: runtime.agentKey,
              eventType: "tool_call",
              actionName: name,
              input
            });

            const result = await runMockTool(name, input as Record<string, unknown>);

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
    })
    .filter((entry): entry is readonly [string, ToolSet[string]] => entry !== null);

  return Object.fromEntries(entries) as ToolSet;
}

async function runMockTool(name: string, input: Record<string, unknown>): Promise<ToolResult> {
  const startedAt = Date.now();
  const output = executeTool(name, input);

  return {
    name,
    input,
    output,
    status: output.error ? "failed" : "success",
    latencyMs: Date.now() - startedAt
  };
}

function executeTool(name: string, input: Record<string, unknown>): Record<string, unknown> {
  switch (name) {
    case "check_availability":
      return {
        availableSlots: ["09:30 AM", "11:00 AM", "02:30 PM"],
        service: input.service ?? "general appointment",
        requestedDate: input.preferredDate ?? "next available weekday"
      };
    case "reserve_appointment":
      return {
        reservationId: `DENT-${Date.now()}`,
        status: "confirmed",
        service: input.service ?? "dental visit",
        date: input.date ?? "next available weekday",
        time: input.time ?? "09:30 AM"
      };
    case "cancel_appointment":
      return {
        reservationId: input.reservationId ?? "unknown",
        status: "cancelled"
      };
    case "list_menu":
      return {
        items: [
          { name: "Classic Burger", price: 9.5 },
          { name: "Grilled Chicken Wrap", price: 8.75 },
          { name: "Veggie Bowl", price: 10.25 },
          { name: "Fries", price: 3.5 }
        ]
      };
    case "build_cart":
      return {
        cartId: `CART-${Date.now()}`,
        items: input.items ?? [],
        estimatedTotal: 24.5
      };
    case "place_order":
      return {
        orderId: `FOOD-${Date.now()}`,
        status: "accepted",
        fulfillment: input.fulfillment ?? "pickup",
        etaMinutes: 25
      };
    case "check_order_status":
      return {
        orderId: input.orderId ?? "latest",
        status: "being prepared",
        etaMinutes: 14
      };
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
