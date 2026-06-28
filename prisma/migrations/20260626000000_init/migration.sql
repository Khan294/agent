CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "visitors" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "visitor_token_hash" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "visitors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "agent_key" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "system_prompt" TEXT NOT NULL,
  "model_provider" TEXT NOT NULL,
  "model_name" TEXT NOT NULL DEFAULT 'gemma4:e2b-it-qat',
  "temperature" DECIMAL(3,2) NOT NULL DEFAULT 0.2,
  "max_tokens" INTEGER,
  "frontend_config" JSONB NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_tools" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "agent_key" TEXT NOT NULL,
  "tool_key" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "input_schema" JSONB NOT NULL,
  "mock_response" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_tools_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_docs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "agent_key" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "embedding" vector,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_docs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "visitor_id" UUID NOT NULL,
  "agent_key" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "summary" TEXT,
  "state" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_actions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL,
  "agent_key" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "action_name" TEXT,
  "input" JSONB,
  "output" JSONB,
  "status" TEXT NOT NULL DEFAULT 'success',
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_actions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "visitors_visitor_token_hash_key" ON "visitors"("visitor_token_hash");
CREATE UNIQUE INDEX "agents_agent_key_key" ON "agents"("agent_key");
CREATE UNIQUE INDEX "agent_tools_agent_key_tool_key_key" ON "agent_tools"("agent_key", "tool_key");
CREATE INDEX "agent_tools_agent_key_enabled_idx" ON "agent_tools"("agent_key", "enabled");
CREATE INDEX "agent_docs_agent_key_idx" ON "agent_docs"("agent_key");
CREATE INDEX "agent_docs_category_idx" ON "agent_docs"("category");
CREATE INDEX "agent_sessions_visitor_id_agent_key_status_idx" ON "agent_sessions"("visitor_id", "agent_key", "status");
CREATE INDEX "agent_actions_session_id_created_at_idx" ON "agent_actions"("session_id", "created_at");
CREATE INDEX "agent_actions_agent_key_event_type_idx" ON "agent_actions"("agent_key", "event_type");
CREATE INDEX "agent_actions_action_name_idx" ON "agent_actions"("action_name");

ALTER TABLE "agent_tools" ADD CONSTRAINT "agent_tools_agent_key_fkey" FOREIGN KEY ("agent_key") REFERENCES "agents"("agent_key") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_docs" ADD CONSTRAINT "agent_docs_agent_key_fkey" FOREIGN KEY ("agent_key") REFERENCES "agents"("agent_key") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_agent_key_fkey" FOREIGN KEY ("agent_key") REFERENCES "agents"("agent_key") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "agent_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
