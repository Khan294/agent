import { Router } from "express";
import { prisma } from "../db/prisma.js";
import type { FrontendConfig } from "../types.js";
import { resolveVisitor } from "../services/visitors.js";

export const agentsRouter = Router();

agentsRouter.get("/:agentKey", async (req, res, next) => {
  try {
    await resolveVisitor(req, res);
    const agent = await prisma.agent.findUnique({
      where: { agentKey: req.params.agentKey }
    });

    if (!agent || agent.status !== "active") {
      res.status(404).render("not-found", { agentKey: req.params.agentKey });
      return;
    }

    res.render("agent", {
      agentKey: agent.agentKey,
      displayName: agent.displayName,
      description: agent.description,
      frontend: agent.frontendConfig as FrontendConfig
    });
  } catch (error) {
    next(error);
  }
});
