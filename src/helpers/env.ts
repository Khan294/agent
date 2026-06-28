import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.string().default("development"),
  COOKIE_SECRET: z.string().default("dev-cookie-secret-change-me"),
  OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().default("gemma4:e2b-it-qat"),
  OLLAMA_EMBEDDING_MODEL: z.string().default("nomic-embed-text"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  LIVE_MODEL_PROVIDER: z.enum(["ollama", "openai"]).default("ollama")
});

export const env = envSchema.parse(process.env);
