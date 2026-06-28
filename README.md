# Agent Demo

Multi-agent RAG and mock tool-calling demo platform.

## Stack

- Node.js, Express, TypeScript
- EJS shared demo page with CDN React
- Prisma + PostgreSQL + pgvector
- Vercel AI SDK for model calls and tool loops
- Ollama local model: `gemma4:e2b-it-qat`
- Optional OpenAI provider through `@ai-sdk/openai`
- Ollama runs through the AI SDK OpenAI-compatible provider

## Run Locally

```bash
cp .env.example .env
docker compose up -d
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

The default `DATABASE_URL` expects the local Docker PostgreSQL server:

```text
postgresql://postgres:postgres@localhost:5433/agent_demo?schema=public
```

Prisma may create the `agent_demo` database during migration.

Open:

```text
http://localhost:3000/
http://localhost:3000/agents/dentist-appointment
http://localhost:3000/agents/food-ordering
```

For local model calls, install Ollama and pull the configured model:

```bash
ollama pull gemma4:e2b-it-qat
ollama pull nomic-embed-text
```

## Public API

```http
GET /agents/:agentKey
```

Loads the shared EJS page for the selected agent.

```http
POST /api/chat
Content-Type: application/json

{ "agentKey": "dentist-appointment", "message": "Book a cleaning for next Monday" }
```

Runs one chat turn. The backend resolves the visitor cookie and `agentKey` into the active session.
The model/tool loop is handled by the AI SDK; session resolution, RAG, mock tool execution, and action logging remain app-owned.

## Database

The platform uses five tables:

- `visitors`
- `agents`
- `rag_documents`
- `agent_sessions`
- `agent_actions`

`agent_actions` stores messages, RAG lookups, tool calls, tool results, errors, and timestamps as an append-only event log.
