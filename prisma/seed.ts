import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import { embedText, toVectorLiteral } from "../src/helpers/rag.js";

const prisma = new PrismaClient();

type SeedTool = {
  toolKey: string;
  displayName: string;
  description: string;
  inputSchema: Prisma.InputJsonValue;
  mockResponse: Prisma.InputJsonValue;
};

type SeedAgent = {
  agentKey: string;
  displayName: string;
  description: string;
  systemPrompt: string;
  modelProvider: string;
  modelName: string;
  frontendConfig: {
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
  tools: SeedTool[];
  docs: Array<{
    category: string;
    title: string;
    content: string;
  }>;
};

const objectSchema = (properties: Record<string, unknown>, required: string[] = []): Prisma.InputJsonValue => {
  return JSON.parse(
    JSON.stringify({
      type: "object",
      properties,
      required,
      additionalProperties: false
    })
  ) as Prisma.InputJsonValue;
};

const agents: SeedAgent[] = [
  {
    agentKey: "dentist-appointment",
    displayName: "Dentist Appointment Assistant",
    description: "A mock receptionist that answers clinic questions and reserves demo appointment slots.",
    modelProvider: "ollama",
    modelName: "gemma4:e2b-it-qat",
    frontendConfig: {
      heading: "Dentist Appointment Assistant",
      subheading: "A client-facing demo for appointment intake, policy-aware answers, and mock booking actions.",
      theme: {
        primary: "#166d78",
        background: "#f3f8f8",
        surface: "#ffffff",
        text: "#12262b"
      },
      starterPrompts: [
        "Book a cleaning for next Monday morning",
        "What is your cancellation policy?",
        "Can I reserve an emergency visit today?"
      ],
      placeholder: "Ask about appointments, policies, or availability..."
    },
    systemPrompt:
      "You are a dental clinic receptionist demo agent. Help users choose services, answer from clinic policy, collect only necessary booking details, and use mock booking tools when appropriate. Never claim a real appointment was created; call it a demo or mock reservation.",
    tools: [
      {
        toolKey: "check_availability",
        displayName: "Check Availability",
        description: "Checks mock appointment availability for a requested dental service and date.",
        inputSchema: objectSchema({
          service: { type: "string" },
          preferredDate: { type: "string" },
          preferredTime: { type: "string" }
        }),
        mockResponse: {
          availableSlots: ["09:30 AM", "11:00 AM", "02:30 PM"],
          status: "available"
        }
      },
      {
        toolKey: "reserve_appointment",
        displayName: "Reserve Appointment",
        description: "Creates a mock dentist appointment reservation.",
        inputSchema: objectSchema({
          service: { type: "string" },
          date: { type: "string" },
          time: { type: "string" },
          patientName: { type: "string" }
        }),
        mockResponse: {
          reservationId: "DENT-DEMO-1001",
          status: "confirmed",
          note: "This is a mock reservation for demo purposes."
        }
      },
      {
        toolKey: "cancel_appointment",
        displayName: "Cancel Appointment",
        description: "Cancels a mock dentist appointment reservation.",
        inputSchema: objectSchema({
          reservationId: { type: "string" }
        }),
        mockResponse: {
          reservationId: "DENT-DEMO-1001",
          status: "cancelled",
          note: "This is a mock cancellation for demo purposes."
        }
      }
    ],
    docs: [
      {
        category: "faq",
        title: "Appointment cancellation policy",
        content:
          "Question: Can I cancel my appointment? Answer: Demo appointments can be cancelled up to 24 hours before the scheduled time. Same-day cancellation should be explained as subject to clinic review. The agent should offer to cancel a mock reservation when the user provides or implies a reservation id."
      },
      {
        category: "workflow",
        title: "Booking workflow",
        content:
          "Question: How should the agent book an appointment? Answer: First identify the desired service and date or time preference. Then check availability. If a suitable slot exists, reserve a mock appointment and clearly state that it is a demo reservation."
      },
      {
        category: "policy",
        title: "Emergency appointments",
        content:
          "Question: Can users book emergency dental visits? Answer: Emergency requests should be treated as high priority. The agent may check same-day mock availability but should advise the user to call emergency services for severe swelling, trauma, uncontrolled bleeding, or breathing difficulty."
      },
      {
        category: "services",
        title: "Available dental services",
        content:
          "Question: What services are supported in the demo? Answer: The demo supports cleanings, new patient exams, follow-up visits, whitening consultations, and emergency visit intake. Pricing is not final and should be described as demo-only unless provided by clinic policy."
      }
    ]
  },
  {
    agentKey: "food-ordering",
    displayName: "Food Ordering Assistant",
    description: "A mock restaurant assistant that answers menu questions and places demo orders.",
    modelProvider: "ollama",
    modelName: "gemma4:e2b-it-qat",
    frontendConfig: {
      heading: "Food Ordering Assistant",
      subheading: "A demo ordering agent that uses menu FAQs, builds a cart, and places mock orders.",
      theme: {
        primary: "#8f3f2b",
        background: "#fff7f2",
        surface: "#ffffff",
        text: "#2d1f1b"
      },
      starterPrompts: [
        "Show me the menu",
        "Order a burger with fries for pickup",
        "What is the delivery policy?"
      ],
      placeholder: "Ask about menu items, ordering, or delivery..."
    },
    systemPrompt:
      "You are a restaurant ordering demo agent. Help users explore menu options, build a mock cart, and place demo orders. Never take real payment or claim real food has been prepared. Always make clear that tool actions are mock demo actions.",
    tools: [
      {
        toolKey: "list_menu",
        displayName: "List Menu",
        description: "Lists mock menu items for the food ordering demo.",
        inputSchema: objectSchema({
          category: { type: "string" }
        }),
        mockResponse: {
          items: [
            { name: "Classic Burger", price: 9.5 },
            { name: "Grilled Chicken Wrap", price: 8.75 },
            { name: "Veggie Bowl", price: 10.25 },
            { name: "Fries", price: 3.5 }
          ]
        }
      },
      {
        toolKey: "build_cart",
        displayName: "Build Cart",
        description: "Adds requested food items to a mock cart.",
        inputSchema: objectSchema({
          items: { type: "array", items: { type: "string" } }
        }),
        mockResponse: {
          cartId: "CART-DEMO-1001",
          estimatedTotal: 24.5,
          status: "ready"
        }
      },
      {
        toolKey: "place_order",
        displayName: "Place Order",
        description: "Places a mock food order.",
        inputSchema: objectSchema({
          items: { type: "array", items: { type: "string" } },
          fulfillment: { type: "string" }
        }),
        mockResponse: {
          orderId: "FOOD-DEMO-1001",
          status: "accepted",
          etaMinutes: 25,
          note: "This is a mock order for demo purposes."
        }
      },
      {
        toolKey: "check_order_status",
        displayName: "Check Order Status",
        description: "Checks mock food order status.",
        inputSchema: objectSchema({
          orderId: { type: "string" }
        }),
        mockResponse: {
          orderId: "FOOD-DEMO-1001",
          status: "being prepared",
          etaMinutes: 14
        }
      }
    ],
    docs: [
      {
        category: "menu",
        title: "Core menu FAQ",
        content:
          "Question: What items are available? Answer: The demo menu includes a Classic Burger, Grilled Chicken Wrap, Veggie Bowl, fries, and soft drinks. The agent can list menu items through the menu tool and help build a mock cart."
      },
      {
        category: "workflow",
        title: "Ordering workflow",
        content:
          "Question: How should orders be placed? Answer: First confirm requested items and fulfillment type. Build the cart before placing the mock order. After placing the order, give the demo order id and ETA from the tool result."
      },
      {
        category: "policy",
        title: "Delivery and pickup policy",
        content:
          "Question: Does the restaurant deliver? Answer: The demo supports pickup and local delivery. Delivery estimates are mock values and should be presented as demo estimates, not real courier commitments."
      },
      {
        category: "faq",
        title: "Payments and promos",
        content:
          "Question: Can users pay in the demo? Answer: The demo does not process real payments. The agent may discuss mock totals but must not request credit card details or claim payment was charged."
      }
    ]
  }
];

async function main() {
  for (const agent of agents) {
    await prisma.agent.upsert({
      where: { agentKey: agent.agentKey },
      update: {
        displayName: agent.displayName,
        description: agent.description,
        systemPrompt: agent.systemPrompt,
        modelProvider: agent.modelProvider,
        modelName: agent.modelName,
        frontendConfig: agent.frontendConfig,
        status: "active"
      },
      create: {
        agentKey: agent.agentKey,
        displayName: agent.displayName,
        description: agent.description,
        systemPrompt: agent.systemPrompt,
        modelProvider: agent.modelProvider,
        modelName: agent.modelName,
        frontendConfig: agent.frontendConfig,
        status: "active"
      }
    });

    await prisma.agentTool.deleteMany({ where: { agentKey: agent.agentKey } });
    await prisma.agentDoc.deleteMany({ where: { agentKey: agent.agentKey } });

    for (const seedTool of agent.tools) {
      await prisma.agentTool.create({
        data: {
          agentKey: agent.agentKey,
          toolKey: seedTool.toolKey,
          displayName: seedTool.displayName,
          description: seedTool.description,
          inputSchema: seedTool.inputSchema,
          mockResponse: seedTool.mockResponse,
          enabled: true
        }
      });
    }

    for (const doc of agent.docs) {
      const created = await prisma.agentDoc.create({
        data: {
          agentKey: agent.agentKey,
          category: doc.category,
          title: doc.title,
          content: doc.content
        }
      });

      const embedding = await embedText(agent.modelProvider, `${doc.title}\n${doc.content}`).catch(() => null);
      if (embedding?.length) {
        await prisma.$executeRawUnsafe(
          `UPDATE agent_docs SET embedding = $1::vector WHERE id = $2::uuid`,
          toVectorLiteral(embedding),
          created.id
        );
      }
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seeded demo agents.");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
