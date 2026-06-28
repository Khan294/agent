import { Router } from "express";
import { z } from "zod";
import { runChatTurn } from "../services/chatOrchestrator.js";

export const chatRouter = Router();

const chatBodySchema = z.object({
  agentKey: z.string().min(1),
  message: z.string().min(1).max(4000)
});

chatRouter.post("/", async (req, res, next) => {
  try {
    const parsed = chatBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid chat request", details: parsed.error.flatten() });
      return;
    }

    const result = await runChatTurn(req, res, parsed.data.agentKey, parsed.data.message);
    res.status(result.statusCode).json(result.body);
  } catch (error) {
    next(error);
  }
});
